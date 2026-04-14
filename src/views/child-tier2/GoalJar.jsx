import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useFamily, useCurrency, usePeriod } from '../../context/FamilyContext'
import { updateMemberAccounts, addTransaction } from '../../db/operations'
import { roundRupees } from '../../utils/currency'
import { today } from '../../utils/dates'
import { Plus, X, Target } from 'lucide-react'

// ── New Sub-goal sheet ────────────────────────────────────────────────────────
function NewGoalSheet({ onSave, onClose }) {
  const [name,   setName]   = useState('')
  const [target, setTarget] = useState('')
  const [error,  setError]  = useState('')

  const handleSave = () => {
    if (!name.trim())             { setError('Enter a name'); return }
    if (!Number(target) || Number(target) <= 0) { setError('Enter a valid target amount'); return }
    onSave({ id: crypto.randomUUID(), name: name.trim(), target: roundRupees(Number(target)), balance: 0 })
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
          <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>New Goal</span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>GOAL NAME</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Bicycle Fund"
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>TARGET AMOUNT</label>
            <input
              type="number" min={1} value={target} onChange={e => setTarget(e.target.value)}
              placeholder="e.g. 500"
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          {error && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{error}</p>}
          <button onClick={handleSave}
            className="w-full py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
            style={{ background: 'var(--accent-blue)', color: '#fff' }}>
            Create Goal
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Deposit sheet ─────────────────────────────────────────────────────────────
function DepositSheet({ goal, spending, onDeposit, onClose, fmt }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const max    = Math.min(spending, goal ? Math.max(0, goal.target - goal.balance) : spending)
  const parsed = Math.min(Number(amount) || 0, max)

  const handleDeposit = async () => {
    if (!parsed || parsed <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    setError('')
    try {
      await onDeposit(goal?.id ?? null, parsed)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const label = goal ? goal.name : 'Philanthropy'

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
            Add to {label}
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>WALLET</p>
              <p className="text-base font-mono font-bold mt-0.5" style={{ color: 'var(--positive)' }}>{fmt(spending)}</p>
            </div>
            {goal && (
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>REMAINING</p>
                <p className="text-base font-mono font-bold mt-0.5" style={{ color: 'var(--warning)' }}>
                  {fmt(Math.max(0, goal.target - goal.balance))}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {[10, 25, 50, 100].filter(v => v <= spending).map(v => (
              <button key={v} onClick={() => setAmount(String(Math.min(v, max)))}
                className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all"
                style={{
                  background: amount === String(v) ? 'rgba(251,191,36,0.2)' : 'var(--bg-raised)',
                  border: `1px solid ${amount === String(v) ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                  color: amount === String(v) ? 'var(--warning)' : 'var(--text-muted)',
                }}>
                {fmt(v)}
              </button>
            ))}
          </div>
          <input type="number" min={1} max={max} value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Custom amount"
            className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          {error && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{error}</p>}
          <button onClick={handleDeposit} disabled={saving || !parsed}
            className="w-full py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
            style={{
              background: !parsed ? 'var(--bg-raised)' : 'rgba(251,191,36,0.15)',
              border: `1px solid ${!parsed ? 'var(--border)' : 'rgba(251,191,36,0.3)'}`,
              color: !parsed ? 'var(--text-dim)' : 'var(--warning)',
            }}>
            {saving ? 'Adding...' : `Add ${parsed ? fmt(parsed) : '—'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Goals() {
  const { currentMember, refreshMember } = useAuth()
  const { family } = useFamily()
  const fmt = useCurrency()
  const { label: periodLabel } = usePeriod()

  const [showNewGoal,   setShowNewGoal]   = useState(false)
  const [depositTarget, setDepositTarget] = useState(null) // null = philanthropy, goal obj = sub-goal
  const [showDeposit,   setShowDeposit]   = useState(false)

  const accounts      = currentMember?.accounts ?? {}
  const philanthropy  = accounts.philanthropy ?? 0
  const spending      = accounts.spending ?? 0
  const subGoals      = accounts.subGoals ?? []

  const interestRate  = currentMember?.config?.interestRate ?? family?.config?.interestRate ?? 0.02
  const philPct       = family?.config?.philanthropyPercent ?? 0.03

  const handleDeposit = async (goalId, amount) => {
    const amt = roundRupees(amount)
    if (amt > spending) throw new Error(`Not enough in spending wallet`)

    let newAccounts
    if (!goalId) {
      // Deposit to philanthropy
      newAccounts = { ...accounts, spending: spending - amt, philanthropy: philanthropy + amt }
      await addTransaction({
        id: crypto.randomUUID(), memberId: currentMember.id,
        type: 'deposit', amount: amt,
        description: 'Deposit to Philanthropy', date: today(), relatedId: null,
      })
    } else {
      // Deposit to sub-goal
      const updatedGoals = subGoals.map(sg =>
        sg.id === goalId ? { ...sg, balance: roundRupees(sg.balance + amt) } : sg
      )
      newAccounts = { ...accounts, spending: spending - amt, subGoals: updatedGoals }
      const goal = subGoals.find(sg => sg.id === goalId)
      await addTransaction({
        id: crypto.randomUUID(), memberId: currentMember.id,
        type: 'deposit', amount: amt,
        description: `Goal deposit: ${goal?.name ?? 'Goal'}`, date: today(), relatedId: null,
      })
    }

    await updateMemberAccounts(currentMember.id, newAccounts)
    await refreshMember()
  }

  const handleCreateGoal = async (goal) => {
    const updated = [...subGoals, goal]
    await updateMemberAccounts(currentMember.id, { ...accounts, subGoals: updated })
    await refreshMember()
    setShowNewGoal(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>GOALS</p>
        <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          My Goals
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* ── Philanthropy ── */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>PHILANTHROPY</p>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>BALANCE</p>
                <p className="text-3xl font-mono font-bold mt-1" style={{ color: 'var(--positive)' }}>
                  {fmt(philanthropy)}
                </p>
                <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-dim)' }}>
                  {Math.round(philPct * 100)}% of each payslip · {Math.round(interestRate * 100)}%/{periodLabel} interest
                </p>
              </div>
              <button
                onClick={() => { setDepositTarget(null); setShowDeposit(true) }}
                disabled={spending <= 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all active:scale-95"
                style={{
                  background: spending > 0 ? 'rgba(74,222,128,0.12)' : 'var(--bg-raised)',
                  border: `1px solid ${spending > 0 ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                  color: spending > 0 ? 'var(--positive)' : 'var(--text-dim)',
                }}>
                <Plus size={12} />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* ── Sub-goals ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              SAVINGS GOALS {subGoals.length > 0 ? `(${subGoals.length})` : ''}
            </p>
            <button
              onClick={() => setShowNewGoal(true)}
              className="flex items-center gap-1 text-xs font-mono transition-all"
              style={{ color: 'var(--accent-blue)', background: 'none', border: 'none' }}>
              <Plus size={12} />
              New Goal
            </button>
          </div>

          {subGoals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Target size={32} style={{ color: 'var(--text-dim)' }} />
              <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>No goals yet</p>
              <p className="text-xs font-mono text-center" style={{ color: 'var(--text-dim)' }}>
                Create a savings goal and move money from your wallet
              </p>
            </div>
          ) : (
            subGoals.map(goal => {
              const progress  = goal.target > 0 ? Math.min(goal.balance / goal.target, 1) : 0
              const remaining = Math.max(0, goal.target - goal.balance)
              const done      = progress >= 1
              return (
                <div key={goal.id} className="p-4 rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: `1px solid ${done ? 'rgba(74,222,128,0.3)' : 'var(--border)'}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {done ? '🎉 ' : ''}{goal.name}
                      </p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {fmt(goal.balance)} of {fmt(goal.target)}
                        {!done && ` · ${fmt(remaining)} to go`}
                      </p>
                    </div>
                    {!done && (
                      <button
                        onClick={() => { setDepositTarget(goal); setShowDeposit(true) }}
                        disabled={spending <= 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all active:scale-95 shrink-0"
                        style={{
                          background: spending > 0 ? 'rgba(251,191,36,0.12)' : 'var(--bg-raised)',
                          border: `1px solid ${spending > 0 ? 'rgba(251,191,36,0.3)' : 'var(--border)'}`,
                          color: spending > 0 ? 'var(--warning)' : 'var(--text-dim)',
                        }}>
                        <Plus size={12} />
                        Add
                      </button>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progress * 100}%`,
                        background: done ? 'var(--positive)' : 'var(--warning)',
                      }} />
                  </div>
                  <p className="text-xs font-mono mt-1.5" style={{ color: done ? 'var(--positive)' : 'var(--text-dim)' }}>
                    {Math.round(progress * 100)}% complete
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showNewGoal && (
        <NewGoalSheet onSave={handleCreateGoal} onClose={() => setShowNewGoal(false)} />
      )}

      {showDeposit && (
        <DepositSheet
          goal={depositTarget}
          spending={spending}
          fmt={fmt}
          onDeposit={handleDeposit}
          onClose={() => setShowDeposit(false)}
        />
      )}
    </div>
  )
}
