import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFamily, useCurrency, usePeriod } from '../../context/FamilyContext'
import { displayDate, today } from '../../utils/dates'
import { calculatePayslip } from '../../engine/payslip'
import { getChoreLogsForPeriod, getChores, getUtilityCharges, makeEarlyRepayment, getLatestPayslip, markCreditPopupSeen, getPayslips } from '../../db/operations'
import { calculateStreak } from '../../engine/chores'
import { FAMILY_ID } from '../../utils/constants'
import { daysAgo } from '../../utils/dates'
import { ChevronRight, X } from 'lucide-react'
import CreditScorePopup from '../../components/CreditScorePopup'
import CreditGauge from '../../components/CreditGauge'
import NetWorthChart from '../../components/NetWorthChart'
import SavingsGrowthChart from '../../components/SavingsGrowthChart'

// ── Prepayment sheet ──────────────────────────────────────────────────────────
function PrepaySheet({ loan, spending, memberId, onDone, onClose, fmt }) {
  const outstanding    = loan.outstanding
  const [amount, setAmount] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [cleared, setCleared] = useState(false)
  const [error,   setError]   = useState('')

  const max    = Math.min(outstanding, spending)
  const parsed = Math.min(Number(amount) || 0, max)

  const QUICK = [
    { label: '25%', val: Math.floor(outstanding * 0.25) },
    { label: '50%', val: Math.floor(outstanding * 0.50) },
    { label: '75%', val: Math.floor(outstanding * 0.75) },
    { label: 'All',  val: Math.min(outstanding, spending)  },
  ].filter(q => q.val > 0)

  const handlePay = async () => {
    if (!parsed || parsed <= 0) { setError('Enter an amount'); return }
    setSaving(true)
    setError('')
    try {
      const remaining = await makeEarlyRepayment(memberId, parsed)
      if (remaining === 0) {
        setCleared(true)
        setTimeout(() => { onDone(); onClose() }, 1800)
      } else {
        onDone()
        onClose()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="rounded-t-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-bright)' }} />
        </div>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            Pay Off Loan Early
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {cleared ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <span className="text-5xl">🎉</span>
            <p className="text-sm font-mono font-semibold" style={{ color: 'var(--positive)' }}>
              Loan fully cleared!
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 flex flex-col gap-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>OUTSTANDING</p>
                <p className="text-base font-mono font-bold mt-0.5" style={{ color: 'var(--warning)' }}>
                  {fmt(outstanding)}
                </p>
              </div>
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>AVAILABLE</p>
                <p className="text-base font-mono font-bold mt-0.5" style={{ color: 'var(--positive)' }}>
                  {fmt(spending)}
                </p>
              </div>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2">
              {QUICK.map(q => (
                <button key={q.label} onClick={() => setAmount(String(q.val))}
                  className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all"
                  style={{
                    background: amount === String(q.val) ? 'rgba(251,191,36,0.2)' : 'var(--bg-raised)',
                    border: `1px solid ${amount === String(q.val) ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                    color: amount === String(q.val) ? 'var(--warning)' : 'var(--text-muted)',
                  }}>
                  {q.label}
                </button>
              ))}
            </div>

            <input
              type="number" min={1} max={max} value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Custom amount"
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />

            {parsed > 0 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>After payment</span>
                <span className="text-xs font-mono font-semibold" style={{ color: parsed >= outstanding ? 'var(--positive)' : 'var(--warning)' }}>
                  {parsed >= outstanding ? '🎉 Fully cleared!' : `${fmt(outstanding - parsed)} remaining`}
                </span>
              </div>
            )}

            {error && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{error}</p>}

            <button onClick={handlePay} disabled={saving || !parsed}
              className="w-full py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
              style={{
                background: saving || !parsed ? 'var(--border)' : 'rgba(251,191,36,0.2)',
                border: '1px solid rgba(251,191,36,0.35)',
                color: saving || !parsed ? 'var(--text-dim)' : 'var(--warning)',
              }}>
              {saving ? 'Processing...' : `Pay ${parsed ? fmt(parsed) : '—'} Now`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Tier2Home() {
  const { currentMember, refreshMember } = useAuth()
  const { family } = useFamily()
  const navigate = useNavigate()
  const fmt = useCurrency()
  const { periodStart, periodEnd, label: periodLabel } = usePeriod()

  const [projected,       setProjected]       = useState(null)
  const [streak,          setStreak]          = useState(0)
  const [showPrepay,      setShowPrepay]      = useState(false)
  const [creditPopup,     setCreditPopup]     = useState(null) // { score, prevScore }
  const [payslips,        setPayslips]        = useState([])

  // Refresh member data each time this view mounts so balance reflects
  // any payslip or bonus credits that happened since login.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refreshMember() }, [])

  // Load payslips for charts
  useEffect(() => {
    if (!currentMember) return
    getPayslips(currentMember.id).then(ps => {
      const settled = ps
        .filter(p => p.status === 'settled')
        .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
      setPayslips(settled)
    }).catch(() => {})
  }, [currentMember?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Credit score popup — show once per pay period
  useEffect(() => {
    if (!currentMember || !periodEnd) return
    if (currentMember.lastCreditPopupPeriod === periodEnd) return
    const score = currentMember.creditScore ?? 500
    getLatestPayslip(currentMember.id)
      .then(payslip => {
        setCreditPopup({ score, prevScore: payslip?.creditScore ?? null })
      })
      .catch(() => setCreditPopup({ score, prevScore: null }))
  }, [currentMember?.id, periodEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissCredit = async () => {
    setCreditPopup(null)
    if (currentMember) await markCreditPopupSeen(currentMember.id, periodEnd).catch(() => {})
  }

  // Compute projected earnings + streak for current period
  const loadProjected = useCallback(async () => {
    if (!currentMember || !family) return
    try {
      const [allChores, choreLogs, utilityCharges, streakLogs] = await Promise.all([
        getChores(FAMILY_ID),
        getChoreLogsForPeriod(currentMember.id, periodStart, periodEnd),
        getUtilityCharges(currentMember.id, periodStart, periodEnd),
        getChoreLogsForPeriod(currentMember.id, daysAgo(60), periodEnd),
      ])

      const mandatoryChores = allChores.filter(c =>
        c.type === 'mandatory' && c.isActive && c.assignedTo.includes(currentMember.id)
      )
      const streakDays = calculateStreak(streakLogs, mandatoryChores)
      setStreak(streakDays)

      const effectiveConfig = currentMember.config
        ? { ...family.config, ...currentMember.config }
        : family.config

      const calc = calculatePayslip({
        member: currentMember,
        familyConfig: effectiveConfig,
        allChores,
        choreLogs,
        utilityCharges,
        periodStart,
        periodEnd,
        streakDays,
      })
      setProjected({
        net: calc.net,
        completionPct: Math.round(calc.earnings.mandatoryCompletionPercent * 100),
        savings: calc.allocations.savings,
        spending: calc.allocations.spending,
        streakBonus: calc.earnings.streakBonus,
        streakBonusPct: calc.earnings.streakBonusPct,
      })
    } catch { /* silent — projection is non-critical */ }
  }, [currentMember, family, periodStart, periodEnd])

  useEffect(() => { loadProjected() }, [loadProjected])

  const accounts        = currentMember?.accounts ?? {}
  const philanthropy    = accounts.philanthropy ?? 0
  const loanOutstanding = accounts.loan?.outstanding ?? 0

  // ── Chart data ───────────────────────────────────────────────────────────────
  const netWorthData = payslips.map(p => {
    const b = p.balancesAfter ?? {}
    const nw = (b.spending ?? 0) + (b.savings ?? 0) + (b.philanthropy ?? 0) - (b.loan?.outstanding ?? 0)
    const d = new Date(p.periodEnd + 'T12:00:00')
    const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '-')
    return { label, value: nw }
  })

  const savingsActual = payslips.map(p => {
    const d = new Date(p.periodEnd + 'T12:00:00')
    const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '-')
    return { label, value: p.balancesAfter?.savings ?? 0 }
  })

  const savingsProjected = (() => {
    const interestRate = (currentMember?.config?.interestRate ?? family?.config?.interestRate) ?? 0.02
    const periodicSavings = projected?.savings ?? 0
    let balance = accounts.savings ?? 0
    return Array.from({ length: 8 }, (_, i) => {
      balance = (balance * (1 + interestRate)) + periodicSavings
      return { label: `+${i + 1}`, value: Math.round(balance) }
    })
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {displayDate(today()).toUpperCase()}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            {currentMember?.avatar} {currentMember?.name}
          </h2>
          <div className="flex items-center gap-2">
            {streak >= 3 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--warning)', border: '1px solid rgba(251,191,36,0.25)' }}>
                🔥 {streak}d streak
              </span>
            )}
            {(() => {
              const score = currentMember?.creditScore ?? 500
              const color = score >= 700 ? 'var(--positive)' : score >= 500 ? 'var(--warning)' : 'var(--negative)'
              const bg    = score >= 700 ? 'rgba(74,222,128,0.1)' : score >= 500 ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)'
              return (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ background: bg, color, border: `1px solid ${bg}` }}
                  title="Credit score">
                  ★ {score}
                </span>
              )
            })()}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* Spending wallet — hero card */}
        <button onClick={() => navigate('/child/history')}
          className="w-full p-4 rounded-xl text-left transition-all active:scale-95"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SPENDING WALLET</p>
          <p className="text-4xl font-mono font-bold mt-1" style={{ color: 'var(--positive)' }}>
            {fmt(accounts.spending ?? 0)}
          </p>
          <p className="text-xs font-mono mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            View history <ChevronRight size={12} />
          </p>
        </button>

        {/* Savings + Goal row */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/child/savings')}
            className="p-4 rounded-xl text-left transition-all active:scale-95"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SAVINGS</p>
            <p className="text-2xl font-mono font-bold mt-1" style={{ color: 'var(--accent-blue)' }}>
              {fmt(accounts.savings ?? 0)}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              {Math.round(((currentMember?.config?.interestRate ?? family?.config?.interestRate) ?? 0.02) * 100)}%/{periodLabel} interest
            </p>
          </button>

          <button onClick={() => navigate('/child/goal')}
            className="p-4 rounded-xl text-left transition-all active:scale-95"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PHILANTHROPY</p>
            <p className="text-2xl font-mono font-bold mt-1" style={{ color: 'var(--positive)' }}>
              {fmt(philanthropy)}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              {Math.round(((currentMember?.config?.interestRate ?? family?.config?.interestRate) ?? 0.02) * 100)}%/{periodLabel} interest
            </p>
          </button>
        </div>

        {/* Outstanding loan chip — tap to prepay */}
        {loanOutstanding > 0 && (
          <button
            onClick={() => setShowPrepay(true)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl w-full text-left transition-all active:scale-95"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}
          >
            <span className="text-base">🤝</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono" style={{ color: 'var(--warning)' }}>
                Loan outstanding: {fmt(loanOutstanding)}
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                {fmt(accounts.loan.weeklyRepayment)}/{periodLabel} on payslip · tap to pay early
              </p>
            </div>
            <ChevronRight size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          </button>
        )}

        {/* Projected earnings widget */}
        {projected !== null && (
          <div className="px-3 py-3 rounded-xl flex flex-col gap-2"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                PROJECTED {periodLabel.toUpperCase()} PAY
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{
                  background: projected.completionPct === 100 ? 'rgba(74,222,128,0.12)' : 'rgba(251,191,36,0.1)',
                  color: projected.completionPct === 100 ? 'var(--positive)' : 'var(--warning)',
                }}>
                {projected.completionPct}% chores
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold" style={{ color: projected.net > 0 ? 'var(--positive)' : 'var(--text-muted)' }}>
                {fmt(projected.net)}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>net</span>
            </div>
            <div className="flex gap-3 text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
              <span>→ {fmt(projected.savings)} savings</span>
              <span>→ {fmt(projected.spending)} spending</span>
            </div>
            {projected.streakBonus > 0 && (
              <p className="text-xs font-mono" style={{ color: 'var(--warning)' }}>
                🔥 +{fmt(projected.streakBonus)} streak bonus (+{Math.round(projected.streakBonusPct * 100)}%)
              </p>
            )}
            <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
              If payslip ran right now
            </p>
          </div>
        )}

        {/* ── Stats section ── */}
        <p className="text-xs font-mono px-1 mt-1" style={{ color: 'var(--text-muted)' }}>STATS</p>

        {/* Credit Report Card */}
        <div className="p-4 rounded-xl flex flex-col items-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <CreditGauge score={currentMember?.creditScore ?? 500} />
        </div>

        {/* Net worth over time */}
        <div className="p-4 rounded-xl flex flex-col gap-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>NET WORTH OVER TIME</p>
          <NetWorthChart data={netWorthData} />
        </div>

        {/* Savings growth + projection */}
        <div className="p-4 rounded-xl flex flex-col gap-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SAVINGS GROWTH</p>
          <SavingsGrowthChart actualData={savingsActual} projected={savingsProjected} />
        </div>

        {/* Quick actions */}
        <p className="text-xs font-mono px-1 mt-1" style={{ color: 'var(--text-muted)' }}>QUICK ACCESS</p>
        {[
          { label: 'Today\'s Chores', sub: 'Mark tasks done, earn bonuses', to: '/child/chores' },
          { label: 'Reward Store',   sub: 'Spend your wallet',            to: '/child/rewards' },
          { label: 'Ledger',          sub: `See this ${periodLabel}'s earnings`,  to: '/child/ledger' },
        ].map(({ label, sub, to }) => (
          <button key={to} onClick={() => navigate(to)}
            className="flex items-center justify-between px-4 py-3 rounded-xl w-full transition-all active:scale-95"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="text-left">
              <p className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{label}</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{sub}</p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
          </button>
        ))}
      </div>

      {showPrepay && accounts.loan && (
        <PrepaySheet
          loan={accounts.loan}
          spending={accounts.spending ?? 0}
          memberId={currentMember.id}
          fmt={fmt}
          onDone={refreshMember}
          onClose={() => setShowPrepay(false)}
        />
      )}

      {creditPopup && (
        <CreditScorePopup
          score={creditPopup.score}
          prevScore={creditPopup.prevScore}
          onDismiss={handleDismissCredit}
        />
      )}
    </div>
  )
}
