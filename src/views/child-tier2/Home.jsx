import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFamily, useCurrency, usePeriod } from '../../context/FamilyContext'
import { displayDate, today } from '../../utils/dates'
import { calculatePayslip } from '../../engine/payslip'
import { getChoreLogsForPeriod, getChores, getUtilityCharges, makeEarlyRepayment, getLatestPayslip, markCreditPopupSeen, getPayslips, addMemberRequest, getTransactions } from '../../db/operations'
import { calculateStreak } from '../../engine/chores'
import { FAMILY_ID } from '../../utils/constants'
import { daysAgo } from '../../utils/dates'
import { ChevronRight, X, Landmark } from 'lucide-react'
import CreditScorePopup from '../../components/CreditScorePopup'
import NetWorthChart from '../../components/NetWorthChart'
import SavingsGrowthChart from '../../components/SavingsGrowthChart'

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  // Show a flat placeholder when not enough data yet
  if (!data || data.length < 2) {
    return (
      <svg viewBox="0 0 200 38" style={{ width: '100%', height: 38, display: 'block' }}>
        <line x1="3" y1="30" x2="197" y2="30"
          stroke={color} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.2"
          strokeLinecap="round" />
      </svg>
    )
  }
  const W = 200, H = 38
  const PAD = 3
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const toX = i => PAD + (i / (data.length - 1)) * (W - PAD * 2)
  const toY = v => (H - PAD) - ((v - min) / range) * (H - PAD * 2)
  const pts = data.map((v, i) => ({ x: toX(i), y: toY(v) }))
  const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const areaD = [
    `M ${pts[0].x.toFixed(1)} ${H}`,
    ...pts.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${last.x.toFixed(1)} ${H}`,
    'Z',
  ].join(' ')
  // stable gradient ID based on color
  const gid = `spk-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={2.5} fill={color} />
    </svg>
  )
}

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

// ── Donate sheet (request donation from philanthropy balance) ─────────────────
function DonateSheet({ philanthropy, memberId, onClose, fmt }) {
  const [charity, setCharity] = useState('')
  const [amount,  setAmount]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  const max    = philanthropy
  const parsed = Math.min(Number(amount) || 0, max)

  const handleSubmit = async () => {
    if (!charity.trim())        { setError('Enter a charity name'); return }
    if (!parsed || parsed <= 0) { setError('Enter a valid amount'); return }
    setSaving(true); setError('')
    try {
      await addMemberRequest({
        id: crypto.randomUUID(),
        familyId: FAMILY_ID,
        memberId,
        type: 'donation',
        amount: parsed,
        description: `Donate to ${charity.trim()}`,
        metadata: { charityName: charity.trim() },
        requestedAt: Date.now(),
      })
      setDone(true)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-t-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-bright)' }} />
        </div>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            Request Donation
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
            <X size={18} />
          </button>
        </div>
        {done ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 px-4">
            <span className="text-5xl">🙏</span>
            <p className="text-sm font-mono font-semibold" style={{ color: 'var(--positive)' }}>Request sent to parent!</p>
            <p className="text-xs font-mono text-center" style={{ color: 'var(--text-muted)' }}>
              Your parent will approve the donation.
            </p>
            <button onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-mono font-semibold mt-2"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              Close
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 flex flex-col gap-4">
            <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PHILANTHROPY BALANCE</p>
              <p className="text-base font-mono font-bold mt-0.5" style={{ color: 'var(--positive)' }}>{fmt(max)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>CHARITY NAME</label>
              <input value={charity} onChange={e => setCharity(e.target.value)}
                placeholder="e.g. Local animal shelter"
                className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>AMOUNT</label>
              <div className="flex gap-2 mb-1">
                {[25, 50, 100].filter(v => v <= max).map(v => (
                  <button key={v} onClick={() => setAmount(String(v))}
                    className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all"
                    style={{
                      background: amount === String(v) ? 'rgba(74,222,128,0.15)' : 'var(--bg-raised)',
                      border: `1px solid ${amount === String(v) ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                      color: amount === String(v) ? 'var(--positive)' : 'var(--text-muted)',
                    }}>{fmt(v)}</button>
                ))}
              </div>
              <input type="number" min={1} max={max} value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Custom amount"
                className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            {error && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{error}</p>}
            <button onClick={handleSubmit} disabled={saving || !parsed || !charity.trim()}
              className="w-full py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
              style={{
                background: saving || !parsed ? 'var(--border)' : 'rgba(74,222,128,0.15)',
                border: '1px solid rgba(74,222,128,0.3)',
                color: saving || !parsed ? 'var(--text-dim)' : 'var(--positive)',
              }}>
              {saving ? 'Sending...' : `Request ${parsed ? fmt(parsed) : '—'} donation`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Spending history sheet ─────────────────────────────────────────────────────
const SPENDING_TYPE_META = {
  reward:     { label: 'Reward store',   emoji: '🛍' },
  withdrawal: { label: 'Withdrawal',     emoji: '💸' },
  transfer:   { label: 'Transfer',       emoji: '↗' },
}
const SPENDING_TYPES = new Set(['reward', 'withdrawal', 'transfer'])

function SpendingSheet({ memberId, onClose, fmt }) {
  const [txs,     setTxs]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTransactions(memberId, 60).then(all => {
      setTxs(all.filter(t => SPENDING_TYPES.has(t.type)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [memberId])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-t-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '75vh' }}>
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-bright)' }} />
        </div>
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            Spending History
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {loading && (
            <p className="text-xs font-mono text-center py-6" style={{ color: 'var(--text-dim)' }}>Loading...</p>
          )}
          {!loading && (!txs || txs.length === 0) && (
            <p className="text-xs font-mono text-center py-6" style={{ color: 'var(--text-dim)' }}>
              No spending yet — rewards and transfers will appear here
            </p>
          )}
          {(txs ?? []).map(tx => {
            const meta = SPENDING_TYPE_META[tx.type] ?? { label: tx.type, emoji: '•' }
            return (
              <div key={tx.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 18 }}>{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {tx.description || meta.label}
                  </p>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{tx.date}</p>
                </div>
                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--negative)' }}>
                  −{fmt(Math.abs(tx.amount))}
                </span>
              </div>
            )
          })}
        </div>
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
  const [showDonate,      setShowDonate]      = useState(false)
  const [showSpending,    setShowSpending]    = useState(false)
  const [creditPopup,     setCreditPopup]     = useState(null) // { score, prevScore }
  const [latestPayslip,   setLatestPayslip]   = useState(null)
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

  // Credit score popup — show once per pay period; also cache latestPayslip for on-demand tap
  useEffect(() => {
    if (!currentMember || !periodEnd) return
    const score = currentMember.creditScore ?? 500
    getLatestPayslip(currentMember.id)
      .then(payslip => {
        setLatestPayslip(payslip)
        if (currentMember.lastCreditPopupPeriod !== periodEnd) {
          setCreditPopup({ score, prevScore: payslip?.creditScore ?? null })
        }
      })
      .catch(() => {})
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

  // ── Hero card data ───────────────────────────────────────────────────────────
  // Wallet sparkline: spending balance per settled payslip
  const walletHistory = payslips.map(p => p.balancesAfter?.spending ?? 0)

  // Spent per period: derived from consecutive wallet balances + allocs
  const spentHistory = payslips.map((p, i) => {
    const prevWallet = i === 0 ? 0 : (payslips[i - 1].balancesAfter?.spending ?? 0)
    const alloc      = p.allocations?.spending ?? 0
    const newWallet  = p.balancesAfter?.spending ?? 0
    return Math.max(0, prevWallet + alloc - newWallet)
  })

  // Spent this period = drop in wallet since last settled payslip
  const lastSettledWallet  = payslips.length > 0
    ? (payslips[payslips.length - 1].balancesAfter?.spending ?? 0)
    : null
  const spentThisPeriod    = lastSettledWallet !== null
    ? Math.max(0, lastSettledWallet - (accounts.spending ?? 0))
    : null
  const prevPeriodSpent    = spentHistory.length >= 2
    ? spentHistory[spentHistory.length - 2]
    : null

  // Wallet delta vs last payslip
  const walletDelta = lastSettledWallet !== null
    ? (accounts.spending ?? 0) - lastSettledWallet
    : null

  // ── Chart data ───────────────────────────────────────────────────────────────
  const netWorthData = payslips.map(p => {
    const b = p.balancesAfter ?? {}
    const nw = (b.spending ?? 0) + (b.savings ?? 0) + (b.philanthropy ?? 0) - (b.loan?.outstanding ?? 0)
    const d = new Date(p.periodEnd + 'T12:00:00')
    const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '-')
    return { label, value: nw }
  })

  const savingsHistory = payslips.map(p => p.balancesAfter?.savings ?? 0)

  // Cumulative donations over time: whenever philanthropy balance drops between
  // payslips that means a donation happened. Flat line = not giving = problem.
  const cumulativeDonations = (() => {
    let total = 0
    return payslips.map((p, i) => {
      const prev = i === 0 ? (p.balancesAfter?.philanthropy ?? 0) : (payslips[i - 1].balancesAfter?.philanthropy ?? 0)
      const curr = p.balancesAfter?.philanthropy ?? 0
      const alloc = p.allocations?.philanthropy ?? 0
      // drop beyond what was allocated = donations made this period
      const donated = Math.max(0, prev + alloc - curr)
      total += donated
      return total
    })
  })()

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
                <button
                  onClick={() => setCreditPopup({ score, prevScore: latestPayslip?.creditScore ?? null })}
                  className="text-xs font-mono px-2 py-0.5 rounded-full active:scale-95"
                  style={{ background: bg, color, border: `1px solid ${bg}` }}>
                  ★ {score}
                </button>
              )
            })()}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* Draft payslip banner */}
        {latestPayslip?.status === 'draft' && (
          <button
            onClick={() => navigate('/child/ledger')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-95"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)' }}>
            <span style={{ fontSize: 20 }}>📋</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-semibold" style={{ color: 'var(--warning)' }}>
                New payslip ready
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Waiting for parent to approve · tap to view
              </p>
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--warning)' }}>→</span>
          </button>
        )}

        {/* Hero row: Wallet + Spent */}
        <div className="grid grid-cols-2 gap-3">
          {/* Wallet card */}
          <button onClick={() => navigate('/child/ledger')}
            className="p-4 rounded-xl text-left transition-all active:scale-95 flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>WALLET</p>
            <p className="text-2xl font-mono font-bold mt-1" style={{ color: 'var(--positive)' }}>
              {fmt(accounts.spending ?? 0)}
            </p>
            {walletDelta !== null && (
              <p className="text-xs font-mono mt-1" style={{
                color: walletDelta >= 0 ? 'var(--positive)' : 'var(--negative)',
              }}>
                {walletDelta >= 0 ? '+' : ''}{fmt(walletDelta)} since last pay
              </p>
            )}
            <div className="mt-2 -mx-1">
              <Sparkline data={walletHistory} color="#4ade80" />
            </div>
            <p className="text-xs font-mono mt-1 flex items-center gap-0.5" style={{ color: 'var(--text-dim)' }}>
              View history <ChevronRight size={11} />
            </p>
          </button>

          {/* Spent card */}
          <button onClick={() => setShowSpending(true)}
            className="p-4 rounded-xl text-left transition-all active:scale-95 flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SPENT</p>
            <p className="text-2xl font-mono font-bold mt-1"
              style={{ color: spentThisPeriod > 0 ? 'var(--negative)' : 'var(--text-dim)' }}>
              {spentThisPeriod !== null ? fmt(spentThisPeriod) : '—'}
            </p>
            {prevPeriodSpent !== null && (
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-dim)' }}>
                {fmt(prevPeriodSpent)} last period
              </p>
            )}
            <div className="mt-2 -mx-1">
              <Sparkline data={spentHistory} color="#f87171" />
            </div>
            <p className="text-xs font-mono mt-1 flex items-center gap-0.5" style={{ color: 'var(--text-dim)' }}>
              View spending <ChevronRight size={11} />
            </p>
          </button>
        </div>

        {/* Savings + Philanthropy row */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/child/savings')}
            className="p-4 rounded-xl text-left transition-all active:scale-95 flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SAVINGS</p>
            <p className="text-2xl font-mono font-bold mt-1" style={{ color: 'var(--accent-blue)' }}>
              {fmt(accounts.savings ?? 0)}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              {+(((currentMember?.config?.interestRate ?? family?.config?.interestRate) ?? 0.02) * 100).toFixed(2)}%/{periodLabel} interest
            </p>
            <div className="mt-2 -mx-1">
              <Sparkline data={savingsHistory} color="#60a5fa" />
            </div>
          </button>

          <button onClick={() => setShowDonate(true)}
            className="p-4 rounded-xl text-left transition-all active:scale-95 flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PHILANTHROPY</p>
            <p className="text-2xl font-mono font-bold mt-1" style={{ color: 'var(--positive)' }}>
              {fmt(philanthropy)}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              cumulative donations ↑
            </p>
            <div className="mt-2 -mx-1">
              <Sparkline data={cumulativeDonations} color="#4ade80" />
            </div>
            <p className="text-xs font-mono mt-1 flex items-center gap-0.5" style={{ color: 'var(--text-dim)' }}>
              Donate <ChevronRight size={11} />
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

        {/* Family Fund card */}
        <button onClick={() => navigate('/child/family-fund')}
          className="flex items-center justify-between px-4 py-3 rounded-xl w-full text-left transition-all active:scale-95"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <Landmark size={18} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                Family Fund
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {fmt(family?.taxFundBalance ?? 0)} collected · tap to see your contributions
              </p>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
        </button>

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

      {showDonate && (
        <DonateSheet
          philanthropy={philanthropy}
          memberId={currentMember.id}
          fmt={fmt}
          onClose={() => setShowDonate(false)}
        />
      )}

      {showSpending && (
        <SpendingSheet
          memberId={currentMember.id}
          fmt={fmt}
          onClose={() => setShowSpending(false)}
        />
      )}

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
