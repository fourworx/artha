import { parseISO, getDay } from 'date-fns'
import {
  getMember, getFamily, getChores,
  getChoreLogsForPeriod, getUtilityCharges,
  addPayslip, updateMemberAccounts, updateTaxFund, addTransaction, updateCreditScore,
  getPayslipForPeriod, getPayslip, updatePayslipStatus,
} from '../db/operations'
import { roundRupees } from '../utils/currency'
import { currentPeriodStart, currentPeriodEnd, daysAgo } from '../utils/dates'
import { calculateWeeklyInterest } from './interest'
import { calculateStreak } from './chores'
import { FAMILY_ID } from '../utils/constants'

// ── Pure calculation ──────────────────────────────────────────────────────────

/**
 * Calculate a payslip without touching the DB.
 * Returns the full payslip data structure.
 */
export function calculatePayslip({
  member,
  familyConfig,
  allChores,
  choreLogs,
  utilityCharges,
  periodStart,
  periodEnd,
  streakDays = 0,
}) {
  const config = familyConfig

  // ── 1. Mandatory chores completion ─────────────────────────────
  const mandatoryChores = allChores.filter(c =>
    c.type === 'mandatory' &&
    c.isActive &&
    c.assignedTo.includes(member.id)
  )

  // Only evaluate completion for days the child actually logged any chore.
  // This prevents penalising a child for days before they started using the
  // app (e.g. starting on Saturday shouldn't count 6 days of absence).
  const activeDates = [...new Set(choreLogs.map(l => l.date))]

  let totalExpected = 0
  let totalApproved = 0

  for (const chore of mandatoryChores) {
    let expected = 0
    let approved = 0

    for (const date of activeDates) {
      const day = getDay(parseISO(date))
      let due = false
      switch (chore.recurrence) {
        case 'daily':   due = true; break
        case 'weekday': due = day >= 1 && day <= 5; break
        case 'weekend': due = day === 0 || day === 6; break
        case 'weekly':  due = day === 1; break
        case 'custom':  due = true; break
        default:        due = false
      }
      if (due) {
        expected++
        if (choreLogs.some(l => l.choreId === chore.id && l.date === date && l.status === 'approved')) {
          approved++
        }
      }
    }

    // Custom recurrence is capped at daysPerWeek across the period
    if (chore.recurrence === 'custom') {
      expected = Math.min(expected, chore.daysPerWeek ?? 3)
      approved = Math.min(approved, chore.daysPerWeek ?? 3)
    }

    totalExpected += expected
    totalApproved += approved
  }

  const mandatoryCompletionPercent = totalExpected > 0 ? totalApproved / totalExpected : 1
  const adjustedSalary = roundRupees(member.baseSalary * mandatoryCompletionPercent)

  // ── 2. Streak bonus ─────────────────────────────────────────────
  // Consecutive days all mandatory chores approved → bonus on adjusted salary
  const streakBonusPct = streakDays >= 14 ? 0.15 : streakDays >= 7 ? 0.10 : streakDays >= 3 ? 0.05 : 0
  const streakBonus    = roundRupees(adjustedSalary * streakBonusPct)

  // ── 3. Bonus chore earnings (approved during this period, paid out on settle) ─
  // Bonus chores bypass tax/deductions — credited directly to spending on settle.
  const bonusChoreMap = Object.fromEntries(
    allChores.filter(c => c.type === 'bonus').map(c => [c.id, c])
  )
  const bonusChoreItems = choreLogs
    .filter(l => l.status === 'approved' && bonusChoreMap[l.choreId])
    .map(l => ({ logId: l.id, choreId: l.choreId, title: bonusChoreMap[l.choreId].title, value: bonusChoreMap[l.choreId].value }))
  const bonusChoreEarnings = bonusChoreItems.reduce((s, b) => s + b.value, 0)

  // ── 4. Gross (salary only — bonus chores go direct to spending, not taxed) ──
  const gross = adjustedSalary + streakBonus

  // ── 5. Deductions ───────────────────────────────────────────────
  const tax                = roundRupees(gross * config.taxRate)
  const rent               = config.rentAmount
  const recurringUtilities = config.utilitiesAmount ?? 0
  const utilityItems       = utilityCharges.map(u => ({ reason: u.reason, amount: u.amount, id: u.id }))
  const totalUtilities     = utilityItems.reduce((sum, u) => sum + u.amount, 0)
  const totalDeductions    = tax + rent + recurringUtilities + totalUtilities

  // ── 5. Net ──────────────────────────────────────────────────────
  const net = Math.max(0, gross - totalDeductions)

  // ── 6. Allocations ──────────────────────────────────────────────
  const savingsAlloc       = roundRupees(net * config.autoSavePercent)
  const philanthropyAlloc  = roundRupees(net * (config.philanthropyPercent ?? 0))
  const spending           = net - savingsAlloc - philanthropyAlloc

  // ── 7. Loan: interest compounds first, then repayment deducts ────
  const loanOutstanding = member.accounts.loan?.outstanding    ?? 0
  const loanWeeklyRepay = member.accounts.loan?.weeklyRepayment ?? 0
  const loanInterestRate = config.loanInterestRate ?? 0.05

  // Interest accrues on the pre-repayment balance — makes it impossible to
  // profitably borrow (loan rate ≥ savings rate is enforced in EconomicControls).
  // Skipped when the loan was explicitly marked interest-free by the parent.
  const loanInterestFree = member.accounts.loan?.interestFree ?? false
  const loanInterest = loanOutstanding > 0 && !loanInterestFree
    ? roundRupees(loanOutstanding * loanInterestRate)
    : 0
  const outstandingWithInterest = loanOutstanding + loanInterest

  // Repay as much as possible: up to the weekly amount, the new outstanding, and available spending
  const loanRepayment = outstandingWithInterest > 0
    ? Math.min(outstandingWithInterest, loanWeeklyRepay, spending)
    : 0
  const spendingAfterLoan  = spending - loanRepayment
  const newLoanOutstanding = Math.max(0, outstandingWithInterest - loanRepayment)

  // ── 8. Interest on savings and sub-goals (philanthropy earns no interest) ─
  const interestEarned      = calculateWeeklyInterest(member.accounts.savings, config.interestRate)
  const philanthropyBalance = member.accounts.philanthropy ?? 0

  // Sub-goals: each earns the same interest rate as savings
  const subGoals      = member.accounts.subGoals ?? []
  const subGoalsAfter = subGoals.map(sg => ({
    ...sg,
    balance: roundRupees(sg.balance + calculateWeeklyInterest(sg.balance, config.interestRate)),
  }))

  // ── 9. New balances ──────────────────────────────────────────────
  const newSavings      = member.accounts.savings + savingsAlloc + interestEarned
  // Bonus chore earnings go directly to spending (not taxed or allocated)
  const newSpending     = member.accounts.spending + spendingAfterLoan + bonusChoreEarnings
  const newPhilanthropy = philanthropyBalance + philanthropyAlloc   // no interest

  return {
    earnings: {
      baseSalary: member.baseSalary,
      mandatoryCompletionPercent,
      adjustedSalary,
      streakDays,
      streakBonusPct,
      streakBonus,
      bonusChoreEarnings,
      bonusChoreItems,
    },
    deductions: {
      tax,
      rent,
      recurringUtilities,
      utilities: utilityItems,
      totalUtilities,
      loanRepayment,
      loanInterest,   // shown on payslip, added to outstanding (not deducted from spending)
      emi: 0,
    },
    gross,
    totalDeductions,
    net,
    allocations: {
      savings:      savingsAlloc,
      philanthropy: philanthropyAlloc,
      spending:     spendingAfterLoan,
    },
    interestEarned,
    philanthropyInterestEarned: 0,
    loanOutstandingAfter: newLoanOutstanding,
    balancesAfter: {
      spending:     newSpending,
      savings:      newSavings,
      philanthropy: newPhilanthropy,
      subGoals:     subGoalsAfter,
      // Null when fully paid off so the loan chip disappears from UI
      loan: newLoanOutstanding > 0
        ? { outstanding: newLoanOutstanding, weeklyRepayment: loanWeeklyRepay, interestFree: loanInterestFree }
        : null,
    },
  }
}

// ── Run payslip (commits to DB) ───────────────────────────────────────────────

/**
 * Generate and save a payslip for a member.
 * Uses the current pay period unless overridden.
 * Throws if a payslip for this period already exists.
 */
export async function runPayslip(memberId, overridePeriod = null) {
  // Load family first so we can derive the correct period from config
  const family = await getFamily(FAMILY_ID)
  if (!family) throw new Error('Family not found')

  const periodStart = overridePeriod?.start ?? currentPeriodStart(family.config)
  const periodEnd   = overridePeriod?.end   ?? currentPeriodEnd(family.config)

  // ── Load data (60 days of chore logs for streak calculation) ────
  const [member, allChores, choreLogs, utilityCharges, streakLogs] = await Promise.all([
    getMember(memberId),
    getChores(FAMILY_ID),
    getChoreLogsForPeriod(memberId, periodStart, periodEnd),
    getUtilityCharges(memberId, periodStart, periodEnd),
    getChoreLogsForPeriod(memberId, daysAgo(60), periodEnd),
  ])

  if (!member) throw new Error(`Member ${memberId} not found`)

  // ── Effective config: family defaults + per-child overrides ──────
  const effectiveConfig = member.config
    ? { ...family.config, ...member.config }
    : family.config

  // ── Calculate streak ────────────────────────────────────────────
  const mandatoryChores = allChores.filter(c =>
    c.type === 'mandatory' && c.isActive && c.assignedTo.includes(memberId)
  )
  const streakDays = calculateStreak(streakLogs, mandatoryChores)

  // ── Guard: already processed? ───────────────────────────────────
  const existing = await getPayslipForPeriod(memberId, periodEnd)
  if (existing) throw new Error(`Payslip already exists for period ending ${periodEnd}`)

  // ── Calculate ───────────────────────────────────────────────────
  const loanWeeklyRepay = member.accounts.loan?.weeklyRepayment ?? 0

  const calc = calculatePayslip({
    member,
    familyConfig: effectiveConfig,
    allChores,
    choreLogs,
    utilityCharges,
    periodStart,
    periodEnd,
    streakDays,
  })

  // ── Save as draft (no balance updates yet) ──────────────────────
  const payslipId = crypto.randomUUID()
  await addPayslip({
    id: payslipId,
    memberId,
    periodStart,
    periodEnd,
    ...calc,
    creditScore: member.creditScore ?? 500,
    createdAt: new Date().toISOString(),
    status: 'draft',
  })

  return { ...calc, id: payslipId, status: 'draft' }
}

// ── Settle payslip (commits balance updates to DB) ────────────────────────────

/**
 * Settle a draft payslip — updates member accounts, logs transactions,
 * updates tax fund, updates credit score, marks payslip as settled.
 * Throws if payslip not found or already settled.
 */
export async function settlePayslip(payslipId) {
  const [ps, family] = await Promise.all([
    getPayslip(payslipId),
    getFamily(FAMILY_ID),
  ])
  if (!ps)                      throw new Error('Payslip not found')
  if (ps.status === 'settled')  throw new Error('Payslip already settled')
  if (!family)                  throw new Error('Family not found')

  const member = await getMember(ps.memberId)
  if (!member) throw new Error('Member not found')

  const loanWeeklyRepay = member.accounts.loan?.weeklyRepayment ?? 0

  // ── Update member accounts ───────────────────────────────────────
  await updateMemberAccounts(ps.memberId, {
    ...member.accounts,
    spending:     ps.balancesAfter.spending,
    savings:      ps.balancesAfter.savings,
    philanthropy: ps.balancesAfter.philanthropy ?? (member.accounts.philanthropy ?? 0),
    subGoals:     ps.balancesAfter.subGoals     ?? (member.accounts.subGoals     ?? []),
    loan:         ps.balancesAfter.loan,
  })

  // ── Update tax fund ──────────────────────────────────────────────
  if (ps.deductions.tax > 0) {
    const newTaxBalance = (family.taxFundBalance ?? 0) + ps.deductions.tax
    const newTaxHistory = [
      ...(family.taxFundHistory ?? []),
      {
        id: crypto.randomUUID(),
        memberId: ps.memberId,
        amount: ps.deductions.tax,
        type: 'credit',
        description: `Tax — ${member.name} (${ps.periodEnd})`,
        date: ps.periodEnd,
      },
    ]
    await updateTaxFund(FAMILY_ID, newTaxBalance, newTaxHistory)
  }

  // ── Log transactions ─────────────────────────────────────────────
  const txBase = { memberId: ps.memberId, date: ps.periodEnd, relatedId: null }
  const txs = [
    ps.earnings.adjustedSalary > 0 && {
      type: 'salary',
      amount: ps.earnings.adjustedSalary,
      description: `Salary — ${Math.round(ps.earnings.mandatoryCompletionPercent * 100)}% chore completion${ps.earnings.streakDays >= 3 ? ` · ${ps.earnings.streakDays}d streak` : ''}`,
    },
    ps.earnings.streakBonus > 0 && {
      type: 'bonus',
      amount: ps.earnings.streakBonus,
      description: `Streak bonus (${ps.earnings.streakDays} days · +${Math.round(ps.earnings.streakBonusPct * 100)}%)`,
    },
    ...(ps.earnings.bonusChoreItems ?? []).map(b => ({
      type: 'bonus',
      amount: b.value,
      description: `Bonus chore: ${b.title}`,
    })),
    ps.deductions.tax > 0 && {
      type: 'tax',
      amount: -ps.deductions.tax,
      description: `Tax (${Math.round(family.config.taxRate * 100)}%)`,
    },
    ps.deductions.rent > 0 && {
      type: 'rent',
      amount: -ps.deductions.rent,
      description: 'Weekly rent',
    },
    (ps.deductions.recurringUtilities ?? 0) > 0 && {
      type: 'utility',
      amount: -(ps.deductions.recurringUtilities),
      description: 'Recurring utilities',
    },
    ...(ps.deductions.utilities ?? []).map(u => ({
      type: 'utility',
      amount: -u.amount,
      description: u.reason,
    })),
    ps.interestEarned > 0 && {
      type: 'interest',
      amount: ps.interestEarned,
      description: `Savings interest (${Math.round(family.config.interestRate * 100)}%/wk)`,
    },
    ps.allocations?.philanthropy > 0 && {
      type: 'deposit',
      amount: ps.allocations.philanthropy,
      description: 'Philanthropy allocation',
    },
    ps.deductions.loanInterest > 0 && {
      type: 'loan_interest',
      amount: ps.deductions.loanInterest,
      description: `Loan interest (${Math.round(family.config.loanInterestRate * 100)}%/period)`,
    },
    ps.deductions.loanRepayment > 0 && ps.loanOutstandingAfter > 0 && {
      type: 'loan_repay',
      amount: -ps.deductions.loanRepayment,
      description: `Loan repayment (${ps.loanOutstandingAfter} remaining)`,
    },
    ps.deductions.loanRepayment > 0 && ps.loanOutstandingAfter === 0 && {
      type: 'loan_cleared',
      amount: -ps.deductions.loanRepayment,
      description: 'Final loan repayment — loan fully cleared!',
    },
  ].filter(Boolean)

  for (const tx of txs) {
    await addTransaction({ id: crypto.randomUUID(), ...txBase, ...tx })
  }

  // ── Update credit score ──────────────────────────────────────────
  let scoreDelta = 0
  const pct = ps.earnings.mandatoryCompletionPercent
  if (pct >= 1.0)       scoreDelta += 10
  else if (pct < 0.5)   scoreDelta -= 10

  if (ps.deductions.loanRepayment > 0) {
    if (ps.loanOutstandingAfter === 0) {
      scoreDelta += 5
    } else if (ps.deductions.loanRepayment < loanWeeklyRepay) {
      scoreDelta -= 10
    }
  }

  if (scoreDelta !== 0) {
    await updateCreditScore(ps.memberId, scoreDelta).catch(() => {})
  }

  // ── Mark settled ─────────────────────────────────────────────────
  await updatePayslipStatus(payslipId, 'settled')
}
