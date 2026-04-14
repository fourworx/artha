import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, TrendingUp, Pencil } from 'lucide-react'
import { useFamily, useCurrency, usePeriod } from '../../context/FamilyContext'
import { getTransactions, addLoanInterest, updateLoanRepayment } from '../../db/operations'
import { today } from '../../utils/dates'

// ── Edit repayment sheet ──────────────────────────────────────────────────────
function EditRepaySheet({ child, onDone, onClose, fmt, label }) {
  const loan = child.accounts?.loan
  const [repay,  setRepay]  = useState(String(loan?.weeklyRepayment ?? 0))
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const outstanding = loan?.outstanding ?? 0
  const repayNum    = Number(repay) || 0
  const weeksLeft   = repayNum > 0 ? Math.ceil(outstanding / repayNum) : null

  const handleSave = async () => {
    if (!repayNum || repayNum <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    setError('')
    try {
      await updateLoanRepayment(child.id, repayNum)
      await onDone()
      onClose()
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
          <div className="flex items-center gap-2">
            <span className="text-xl">{child.avatar}</span>
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              Edit Repayment — {child.name}
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{ background: 'var(--bg-raised)' }}>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Outstanding</span>
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--warning)' }}>
              {fmt(outstanding)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              NEW REPAYMENT PER {label.toUpperCase()}
            </label>
            <input
              type="number" min={1} value={repay}
              onChange={e => setRepay(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {weeksLeft != null && (
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-dim)' }}>
                Paid off in ~{weeksLeft} {label}{weeksLeft > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {error && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{error}</p>}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
            style={{
              background: saving ? 'var(--border)' : 'var(--accent-blue)',
              color: saving ? 'var(--text-dim)' : '#fff',
            }}>
            {saving ? 'Saving...' : 'Update Repayment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Interest sheet ────────────────────────────────────────────────────────────
function InterestSheet({ child, onDone, onClose }) {
  const fmt             = useCurrency()
  const outstanding     = child.accounts?.loan?.outstanding ?? 0
  const [rate, setRate] = useState('10')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const rateNum    = parseFloat(rate) / 100 || 0
  const interest   = Math.round(outstanding * rateNum)
  const newBalance = outstanding + interest

  const handleApply = async () => {
    if (!rateNum || rateNum <= 0) { setError('Enter a valid rate'); return }
    setSaving(true)
    setError('')
    try {
      await addLoanInterest(child.id, rateNum)
      await onDone()
      onClose()
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
      <div
        className="rounded-t-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-bright)' }} />
        </div>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{child.avatar}</span>
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              Add Interest — {child.name}
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Current state */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
            style={{ background: 'var(--bg-raised)' }}>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Outstanding</span>
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--warning)' }}>
              {fmt(outstanding)}
            </span>
          </div>

          {/* Rate input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>INTEREST RATE (%)</label>
            <div className="flex gap-2">
              {['5', '10', '15', '20'].map(r => (
                <button
                  key={r}
                  onClick={() => setRate(r)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-mono transition-all"
                  style={{
                    background: rate === r ? 'rgba(251,191,36,0.2)' : 'var(--bg-raised)',
                    border: `1px solid ${rate === r ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                    color: rate === r ? 'var(--warning)' : 'var(--text-muted)',
                  }}
                >
                  {r}%
                </button>
              ))}
            </div>
            <input
              type="number" min={0} max={100} value={rate}
              onChange={e => setRate(e.target.value)}
              placeholder="Custom %"
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Preview */}
          {interest > 0 && (
            <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Interest charge</span>
                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--negative)' }}>
                  +{fmt(interest)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>New outstanding</span>
                <span className="text-sm font-mono font-bold" style={{ color: 'var(--warning)' }}>
                  {fmt(newBalance)}
                </span>
              </div>
            </div>
          )}

          {error && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{error}</p>}

          <button
            onClick={handleApply}
            disabled={saving || interest <= 0}
            className="w-full py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
            style={{
              background: saving || interest <= 0 ? 'var(--border)' : 'rgba(251,191,36,0.2)',
              border: '1px solid rgba(251,191,36,0.35)',
              color: saving || interest <= 0 ? 'var(--text-dim)' : 'var(--warning)',
            }}
          >
            {saving ? 'Applying...' : `Apply ${fmt(interest)} Interest`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Loan card ─────────────────────────────────────────────────────────────────
function LoanCard({ child, onAddInterest, onEditRepay, fmt, label }) {
  const loan        = child.accounts?.loan
  const outstanding = loan?.outstanding ?? 0
  const repayment   = loan?.weeklyRepayment ?? 0
  const weeksLeft   = repayment > 0 ? Math.ceil(outstanding / repayment) : null
  const pctPaid     = 0 // We don't track original amount, just outstanding

  // Estimate payoff date
  const payoffDate = weeksLeft != null ? (() => {
    const d = new Date()
    d.setDate(d.getDate() + weeksLeft * 7)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  })() : null

  return (
    <div className="p-4 rounded-xl flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', border: '1px solid rgba(251,191,36,0.25)' }}>
      {/* Child header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{child.avatar}</span>
          <div>
            <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              {child.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Tier {child.tier}</span>
              {loan?.interestFree && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(74,222,128,0.12)', color: 'var(--positive)', border: '1px solid rgba(74,222,128,0.25)' }}>
                  0% interest
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditRepay(child)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all active:scale-95"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <Pencil size={11} />
            EMI
          </button>
          <button
            onClick={() => onAddInterest(child)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all active:scale-95"
            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', color: 'var(--warning)' }}
          >
            <TrendingUp size={11} />
            Interest
          </button>
        </div>
      </div>

      {/* Loan figures */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>OUTSTANDING</p>
          <p className="text-lg font-mono font-bold mt-0.5" style={{ color: 'var(--warning)' }}>
            {fmt(outstanding)}
          </p>
        </div>
        <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>REPAYMENT/{label}</p>
          <p className="text-lg font-mono font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {fmt(repayment)}
          </p>
        </div>
      </div>

      {/* Payoff timeline */}
      {weeksLeft != null && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              ~{weeksLeft} {label}{weeksLeft > 1 ? 's' : ''} remaining
            </span>
            {payoffDate && (
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Est. payoff: {payoffDate}
              </span>
            )}
          </div>
          {/* Progress bar (visual only — no original amount tracked) */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(5, 100 - Math.min(100, (outstanding / Math.max(outstanding, 1)) * 100))}%`,
                background: 'var(--warning)',
              }}
            />
          </div>
        </div>
      )}
      {weeksLeft == null && (
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          No repayment set — payoff date unknown
        </p>
      )}
    </div>
  )
}

// ── Loan history row ──────────────────────────────────────────────────────────
function HistoryRow({ tx, fmt }) {
  const isInterest = tx.type === 'loan_interest'
  const isCredit   = tx.type === 'loan_credit'

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <span className="text-base">{isInterest ? '📈' : isCredit ? '🤝' : '💸'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>
          {tx.description}
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{tx.date}</p>
      </div>
      <span className="text-sm font-mono font-semibold"
        style={{ color: isInterest ? 'var(--negative)' : 'var(--warning)' }}>
        {isInterest ? '+' : ''}{fmt(tx.amount)}
      </span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Loans() {
  const navigate = useNavigate()
  const { children, reload } = useFamily()
  const fmt   = useCurrency()
  const { label } = usePeriod()

  const [interestTarget, setInterestTarget] = useState(null)
  const [editRepayTarget, setEditRepayTarget] = useState(null)
  const [loanHistory,    setLoanHistory]    = useState([])

  const childrenWithLoans = children.filter(
    c => c.accounts?.loan?.outstanding > 0
  )

  const totalOutstanding = childrenWithLoans.reduce(
    (s, c) => s + (c.accounts?.loan?.outstanding ?? 0), 0
  )

  const loadHistory = useCallback(async () => {
    const allTx = await Promise.all(
      children.map(c => getTransactions(c.id, 100))
    )
    const loanTx = allTx
      .flatMap((txs, i) =>
        txs
          .filter(tx => tx.type === 'loan_credit' || tx.type === 'loan_interest')
          .map(tx => ({ ...tx, memberName: children[i].name, memberAvatar: children[i].avatar }))
      )
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 20)
    setLoanHistory(loanTx)
  }, [children])

  useEffect(() => { loadHistory() }, [loadHistory])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT</p>
          <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            Loans
          </h2>
        </div>
        {totalOutstanding > 0 && (
          <span className="text-sm font-mono font-bold" style={{ color: 'var(--warning)' }}>
            {fmt(totalOutstanding)} total
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Active loans */}
        {childrenWithLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-4xl">🤝</span>
            <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>No active loans</p>
            <p className="text-xs font-mono text-center" style={{ color: 'var(--text-dim)' }}>
              Give a loan from the Dashboard → child card → + button
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>ACTIVE LOANS</p>
            {childrenWithLoans.map(child => (
              <LoanCard
                key={child.id}
                child={child}
                onAddInterest={setInterestTarget}
                onEditRepay={setEditRepayTarget}
                fmt={fmt}
                label={label}
              />
            ))}
          </div>
        )}

        {/* Loan history */}
        {loanHistory.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>LOAN HISTORY</p>
            {loanHistory.map(tx => (
              <div key={tx.id} className="flex items-start gap-2">
                <span className="text-xs font-mono mt-0.5 w-16 shrink-0"
                  style={{ color: 'var(--text-muted)' }}>
                  {tx.memberAvatar} {tx.memberName.split(' ')[0]}
                </span>
                <div className="flex-1">
                  <HistoryRow tx={tx} fmt={fmt} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {interestTarget && (
        <InterestSheet
          child={interestTarget}
          onDone={async () => { await reload(); await loadHistory() }}
          onClose={() => setInterestTarget(null)}
        />
      )}

      {editRepayTarget && (
        <EditRepaySheet
          child={editRepayTarget}
          onDone={reload}
          onClose={() => setEditRepayTarget(null)}
          fmt={fmt}
          label={label}
        />
      )}
    </div>
  )
}
