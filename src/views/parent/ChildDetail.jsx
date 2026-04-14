import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFamily, useCurrency, usePeriod } from '../../context/FamilyContext'
import { getPayslips, getTransactionsForPeriod } from '../../db/operations'
import { settlePayslip } from '../../engine/payslip'
import PayslipCard from '../../components/PayslipCard'
import { displayDate, today } from '../../utils/dates'
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'

const TYPE_META = {
  salary:        { label: 'Salary',            emoji: '💼', color: 'var(--positive)' },
  bonus:         { label: 'Bonus',             emoji: '⚡', color: 'var(--positive)' },
  parent_bonus:  { label: 'Bonus from parent', emoji: '🎁', color: 'var(--positive)' },
  loan_credit:   { label: 'Loan received',     emoji: '🤝', color: 'var(--positive)' },
  interest:      { label: 'Interest',          emoji: '📈', color: 'var(--positive)' },
  deposit:       { label: 'Deposit',           emoji: '🏦', color: 'var(--positive)' },
  tax:           { label: 'Tax',               emoji: '🏛',  color: 'var(--negative)' },
  rent:          { label: 'Rent',              emoji: '🏠', color: 'var(--negative)' },
  utility:       { label: 'Utility',           emoji: '💡', color: 'var(--negative)' },
  reward:        { label: 'Reward',            emoji: '🛍', color: 'var(--negative)' },
  loan_repay:    { label: 'Loan repayment',    emoji: '🔄', color: 'var(--negative)' },
  loan_cleared:  { label: 'Loan cleared',      emoji: '🎉', color: 'var(--positive)' },
  loan_interest: { label: 'Loan interest',     emoji: '📉', color: 'var(--negative)' },
  withdrawal:    { label: 'Withdrawal',        emoji: '💸', color: 'var(--negative)' },
}

function periodId(periodEnd) {
  const d = new Date(periodEnd + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '-')
}

function PeriodTxs({ memberId, periodStart, periodEnd }) {
  const fmt = useCurrency()
  const [txs,     setTxs]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTransactionsForPeriod(memberId, periodStart, periodEnd).then(data => {
      setTxs(data)
      setLoading(false)
    })
  }, [memberId, periodStart, periodEnd])

  if (loading) return (
    <p className="text-xs font-mono text-center py-3" style={{ color: 'var(--text-dim)' }}>
      Loading transactions...
    </p>
  )
  if (!txs?.length) return (
    <p className="text-xs font-mono text-center py-3" style={{ color: 'var(--text-dim)' }}>
      No transactions for this period
    </p>
  )

  return (
    <div className="flex flex-col gap-1.5 mt-3">
      <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>TRANSACTIONS</p>
      {txs.map(tx => {
        const meta = TYPE_META[tx.type] ?? { label: tx.type, emoji: '•', color: 'var(--text-muted)' }
        return (
          <div key={tx.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
            <span className="text-base shrink-0">{meta.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                {tx.description}
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                {meta.label} · {displayDate(tx.date)}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold shrink-0" style={{ color: meta.color }}>
              {tx.amount > 0 ? '+' : ''}{fmt(tx.amount)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ChildDetail() {
  const { memberId }  = useParams()
  const navigate      = useNavigate()
  const { children, reload } = useFamily()
  const fmt           = useCurrency()
  const { periodStart, periodEnd, label: periodLabel } = usePeriod()

  const child = children.find(c => c.id === memberId)

  const [payslips,      setPayslips]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [expanded,      setExpanded]      = useState(null)
  const [periodSummary, setPeriodSummary] = useState(null)
  const [settling,      setSettling]      = useState(null)
  const [settleError,   setSettleError]   = useState(null)

  useEffect(() => {
    if (!memberId) return
    getPayslips(memberId).then(ps => {
      setPayslips([...ps].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)))
      setLoading(false)
    })
  }, [memberId])

  // Period summary: aggregate settled transactions for current period
  useEffect(() => {
    if (!memberId || !periodStart || !periodEnd) return
    getTransactionsForPeriod(memberId, periodStart, periodEnd).then(txs => {
      const rent  = txs.filter(t => t.type === 'rent').reduce((s, t) => s + Math.abs(t.amount), 0)
      const tax   = txs.filter(t => t.type === 'tax').reduce((s, t) => s + Math.abs(t.amount), 0)
      const bonus = txs.filter(t => ['bonus', 'parent_bonus'].includes(t.type)).reduce((s, t) => s + t.amount, 0)
      setPeriodSummary({ rent, tax, bonus })
    })
  }, [memberId, periodStart, periodEnd])

  const handleSettle = async (payslipId) => {
    setSettling(payslipId)
    setSettleError(null)
    try {
      await settlePayslip(payslipId)
      setPayslips(prev => prev.map(p => p.id === payslipId ? { ...p, status: 'settled' } : p))
      await reload()
    } catch (e) {
      setSettleError(e.message)
    } finally {
      setSettling(null)
    }
  }

  if (!child) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Child not found</p>
      </div>
    )
  }

  const accounts        = child.accounts ?? {}
  const loanOutstanding = accounts.loan?.outstanding ?? 0

  const score = child.creditScore ?? 500
  const scoreColor = score >= 700 ? 'var(--positive)' : score >= 500 ? 'var(--warning)' : 'var(--negative)'
  const scoreBg    = score >= 700 ? 'rgba(74,222,128,0.1)' : score >= 500 ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate('/parent')}
          className="flex items-center gap-1 mb-3 -ml-1"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
          <ChevronLeft size={16} />
          <span className="text-xs font-mono">Dashboard</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{child.avatar}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                {child.name}
              </h2>
              {child.tier >= 2 && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded-full"
                  style={{ background: scoreBg, color: scoreColor, border: `1px solid ${scoreBg}` }}>
                  ★ {score}
                </span>
              )}
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              Tier {child.tier} · {fmt(child.baseSalary)}/{periodLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Balance tiles */}
        {child.tier >= 2 && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'SPENDING',     value: accounts.spending     ?? 0, color: 'var(--positive)' },
              { label: 'SAVINGS',      value: accounts.savings      ?? 0, color: 'var(--accent-blue)' },
              { label: 'PHILANTHROPY', value: accounts.philanthropy ?? 0, color: 'var(--positive)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 rounded-xl text-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{label}</p>
                <p className="text-sm font-mono font-semibold mt-1" style={{ color }}>{fmt(value)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Loan chip */}
        {loanOutstanding > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <span className="text-sm">🤝</span>
            <p className="text-xs font-mono" style={{ color: 'var(--warning)' }}>
              Loan outstanding: {fmt(loanOutstanding)} · {fmt(accounts.loan.weeklyRepayment)}/{periodLabel} repayment
            </p>
          </div>
        )}

        {/* Current period summary */}
        {periodSummary && (periodSummary.rent > 0 || periodSummary.tax > 0 || periodSummary.bonus > 0) && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>
              THIS {periodLabel.toUpperCase()} (SETTLED)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'RENT PAID',  value: periodSummary.rent,  color: 'var(--negative)', prefix: '-' },
                { label: 'TAX PAID',   value: periodSummary.tax,   color: 'var(--negative)', prefix: '-' },
                { label: 'BONUSES',    value: periodSummary.bonus, color: 'var(--positive)', prefix: '+' },
              ].map(({ label, value, color, prefix }) => (
                <div key={label} className="p-3 rounded-xl text-center"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{label}</p>
                  <p className="text-sm font-mono font-semibold mt-1" style={{ color: value > 0 ? color : 'var(--text-dim)' }}>
                    {value > 0 ? prefix : ''}{fmt(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payslip history */}
        {loading ? (
          <p className="text-xs font-mono text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : payslips.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
            <span className="text-5xl">📒</span>
            <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>No payslips yet</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
              Payslips will appear here after the first payday
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>
              PAYSLIP HISTORY ({payslips.length})
            </p>

            {settleError && (
              <p className="text-xs font-mono px-1" style={{ color: 'var(--negative)' }}>
                Error: {settleError}
              </p>
            )}

            {payslips.map(p => {
              const isDraft    = p.status === 'draft'
              const isExpanded = expanded === p.id
              const canSettle  = isDraft && today() >= p.periodEnd
              const isSettling = settling === p.id

              return (
                <div key={p.id}>
                  {/* Row header */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : p.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: 'var(--bg-surface)',
                      border: `1px solid ${isExpanded ? 'var(--border-bright)' : isDraft ? 'rgba(251,191,36,0.3)' : 'var(--border)'}`,
                    }}>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {displayDate(p.periodStart)} – {displayDate(p.periodEnd)}
                        </p>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--bg-raised)', color: 'var(--text-dim)', fontSize: 9 }}>
                          {periodId(p.periodEnd)}
                        </span>
                        {isDraft ? (
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--warning)', fontSize: 9 }}>
                            ⏳ DRAFT
                          </span>
                        ) : (
                          <span className="text-xs font-mono" style={{ color: 'var(--positive)', fontSize: 9 }}>
                            ✓ SETTLED
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-mono font-bold mt-0.5" style={{ color: 'var(--positive)' }}>
                        {fmt(p.net)} net
                      </p>
                    </div>
                    {isExpanded
                      ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      : <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    }
                  </button>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="mt-2 flex flex-col gap-2">
                      <PayslipCard payslip={p} member={child} />

                      {/* Settle action for drafts */}
                      {isDraft && (
                        <div className="flex flex-col gap-2 px-1">
                          {!canSettle && (
                            <p className="text-xs font-mono text-center" style={{ color: 'var(--text-muted)' }}>
                              Settlement available from {displayDate(p.periodEnd)}
                            </p>
                          )}
                          <button
                            onClick={() => handleSettle(p.id)}
                            disabled={!canSettle || isSettling}
                            className="w-full py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
                            style={{
                              background: !canSettle ? 'var(--bg-raised)' : isSettling ? 'var(--border)' : 'rgba(74,222,128,0.15)',
                              border: `1px solid ${!canSettle ? 'var(--border)' : 'rgba(74,222,128,0.35)'}`,
                              color: !canSettle ? 'var(--text-dim)' : isSettling ? 'var(--text-dim)' : 'var(--positive)',
                              cursor: !canSettle ? 'not-allowed' : 'pointer',
                            }}>
                            {isSettling ? 'Settling...' : '✓ Approve & Pay'}
                          </button>
                        </div>
                      )}

                      {/* Transactions */}
                      {p.status === 'settled' && (
                        <PeriodTxs
                          memberId={memberId}
                          periodStart={p.periodStart}
                          periodEnd={p.periodEnd}
                        />
                      )}
                      {isDraft && (
                        <p className="text-xs font-mono text-center py-2" style={{ color: 'var(--text-dim)' }}>
                          Transactions will appear after settlement
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
