import { parseISO, addDays, isAfter, format, getDay } from 'date-fns'
import { db } from '../db/schema'
import {
  getMember, getFamily, getChores,
  getChoreLogsForPeriod, getUtilityCharges,
  addPayslip, updateMemberAccounts, updateTaxFund, addTransaction,
} from '../db/operations'
import { roundRupees } from '../utils/currency'
import { currentPeriodStart, currentPeriodEnd } from '../utils/dates'
import { calculateWeeklyInterest } from './interest'
import { summariseBonusEarnings } from './chores'
import { FAMILY_ID } from '../utils/constants'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** How many times a chore is expected to occur between startDate and endDate (inclusive). */
function expectedOccurrences(chore, startDate, endDate) {
  if (chore.recurrence === 'custom') {
    return chore.daysPerWeek ?? 3
  }
  if (chore.recurrence === 'once') return 1

  let count = 0
  let current = parseISO(startDate)
  const end = parseISO(endDate)

  while (!isAfter(current, end)) {
    const day = getDay(current) // 0=Sun … 6=Sat
    let due = false
    switch (chore.recurrence) {
      case 'daily':   due = true; break
      case 'weekday': due = day >= 1 && day <= 5; break
      case 'weekend': due = day === 0 || day === 6; break
      case 'weekly':  due = day === 1; break // Monday
    }
    if (due) count++
    current = addDays(current, 1)
  }
  return count
}

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
}) {
  const config = familyConfig

  // ── 1. Mandatory chores completion ─────────────────────────────
  const mandatoryChores = allChores.filter(c =>
    c.type === 'mandatory' &&
    c.isActive &&
    c.assignedTo.includes(member.id)
  )

  let totalExpected = 0
  let totalApproved = 0

  for (const chore of mandatoryChores) {
    const expected = expectedOccurrences(chore, periodStart, periodEnd)
    const approved = choreLogs.filter(
      l => l.choreId === chore.id && l.status === 'approved'
    ).length
    const cappedApproved = chore.recurrence === 'custom'
      ? Math.min(approved, chore.daysPerWeek ?? 3)
      : Math.min(approved, expected)
    totalExpected += expected
    totalApproved += cappedApproved
  }

  const mandatoryCompletionPercent = totalExpected > 0 ? totalApproved / totalExpected : 1
  const adjustedSalary = roundRupees(member.baseSalary * mandatoryCompletionPercent)

  // ── 2. Bonus earnings ───────────────────────────────────────────
  const bonusItems = summariseBonusEarnings(choreLogs, allChores)
  const totalBonus = bonusItems.reduce((sum, b) => sum + b.total, 0)

  // ── 3. Gross ────────────────────────────────────────────────────
  const gross = adjustedSalary + totalBonus

  // ── 4. Deductions ───────────────────────────────────────────────
  const tax           = roundRupees(gross * config.taxRate)
  const rent          = config.rentAmount
  const utilityItems  = utilityCharges.map(u => ({ reason: u.reason, amount: u.amount, id: u.id }))
  const totalUtilities = utilityItems.reduce((sum, u) => sum + u.amount, 0)
  const totalDeductions = tax + rent + totalUtilities

  // ── 5. Net ──────────────────────────────────────────────────────
  const net = Math.max(0, gross - totalDeductions)

  // ── 6. Allocations ──────────────────────────────────────────────
  const savingsAlloc = roundRupees(net * config.autoSavePercent)
  const spending     = net - savingsAlloc

  // ── 7. Interest on existing savings ─────────────────────────────
  const interestEarned = calculateWeeklyInterest(member.accounts.savings, config.interestRate)

  // ── 8. New balances ─────────────────────────────────────────────
  const newSavings  = member.accounts.savings + savingsAlloc + interestEarned
  const newSpending = member.accounts.spending + spending

  return {
    earnings: {
      baseSalary: member.baseSalary,
      mandatoryCompletionPercent,
      adjustedSalary,
      bonusItems,
      totalBonus,
    },
    deductions: {
      tax,
      rent,
      utilities: utilityItems,
      totalUtilities,
      emi: 0,
    },
    gross,
    totalDeductions,
    net,
    allocations: {
      savings: savingsAlloc,
      goalJar: 0,
      spending,
    },
    interestEarned,
    balancesAfter: {
      spending: newSpending,
      savings: newSavings,
      goalJar: member.accounts.goalJar?.balance ?? 0,
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
  const periodStart = overridePeriod?.start ?? currentPeriodStart()
  const periodEnd   = overridePeriod?.end   ?? currentPeriodEnd()

  // ── Load all required data ──────────────────────────────────────
  const [member, family, allChores, choreLogs, utilityCharges] = await Promise.all([
    getMember(memberId),
    getFamily(FAMILY_ID),
    getChores(FAMILY_ID),
    getChoreLogsForPeriod(memberId, periodStart, periodEnd),
    getUtilityCharges(memberId, periodStart, periodEnd),
  ])

  if (!member) throw new Error(`Member ${memberId} not found`)
  if (!family) throw new Error('Family not found')

  // ── Guard: already processed? ───────────────────────────────────
  const existing = await db.payslips
    .where('memberId').equals(memberId)
    .filter(p => p.periodEnd === periodEnd)
    .first()
  if (existing) throw new Error(`Payslip already exists for period ending ${periodEnd}`)

  // ── Calculate ───────────────────────────────────────────────────
  const calc = calculatePayslip({
    member,
    familyConfig: family.config,
    allChores,
    choreLogs,
    utilityCharges,
    periodStart,
    periodEnd,
  })

  // ── Commit atomically ───────────────────────────────────────────
  await db.transaction('rw',
    [db.payslips, db.members, db.families, db.transactions],
    async () => {
      // Save payslip
      await addPayslip({
        id: crypto.randomUUID(),
        memberId,
        periodStart,
        periodEnd,
        ...calc,
        creditScore: member.creditScore ?? 500,
        createdAt: Date.now(),
      })

      // Update member accounts
      await updateMemberAccounts(memberId, {
        ...member.accounts,
        spending: calc.balancesAfter.spending,
        savings:  calc.balancesAfter.savings,
        goalJar:  member.accounts.goalJar,
      })

      // Update tax fund
      const newTaxBalance = (family.taxFundBalance ?? 0) + calc.deductions.tax
      const newTaxHistory = [
        ...(family.taxFundHistory ?? []),
        {
          id: crypto.randomUUID(),
          memberId,
          amount: calc.deductions.tax,
          type: 'credit',
          description: `Tax — ${member.name} (${periodEnd})`,
          date: periodEnd,
        },
      ]
      await updateTaxFund(FAMILY_ID, newTaxBalance, newTaxHistory)

      // Log transactions
      const txBase = { memberId, date: periodEnd, relatedId: null }
      const txs = [
        calc.earnings.adjustedSalary > 0 && {
          type: 'salary',
          amount: calc.earnings.adjustedSalary,
          description: `Salary — ${Math.round(calc.earnings.mandatoryCompletionPercent * 100)}% chore completion`,
        },
        ...calc.earnings.bonusItems.map(b => ({
          type: 'bonus',
          amount: b.total,
          description: `Bonus: ${b.title}`,
        })),
        calc.deductions.tax > 0 && {
          type: 'tax',
          amount: -calc.deductions.tax,
          description: `Tax (${Math.round(family.config.taxRate * 100)}%)`,
        },
        calc.deductions.rent > 0 && {
          type: 'rent',
          amount: -calc.deductions.rent,
          description: 'Weekly rent',
        },
        ...calc.deductions.utilities.map(u => ({
          type: 'utility',
          amount: -u.amount,
          description: u.reason,
        })),
        calc.interestEarned > 0 && {
          type: 'interest',
          amount: calc.interestEarned,
          description: `Savings interest (${Math.round(family.config.interestRate * 100)}%/wk)`,
        },
      ].filter(Boolean)

      for (const tx of txs) {
        await addTransaction({ id: crypto.randomUUID(), ...txBase, ...tx })
      }
    }
  )

  return calc
}
