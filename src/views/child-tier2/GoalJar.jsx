import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { updateMemberAccounts, addTransaction } from '../../db/operations'
import { formatRupees, roundRupees } from '../../utils/currency'
import { today } from '../../utils/dates'
import { Target, Plus } from 'lucide-react'

export default function GoalJar() {
  const { currentMember, refreshMember } = useAuth()
  const goalJar  = currentMember?.accounts?.goalJar
  const spending = currentMember?.accounts?.spending ?? 0

  const [depositAmount, setDepositAmount] = useState('')
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')

  const balance  = goalJar?.balance ?? 0
  const target   = goalJar?.target  ?? 0
  const progress = target > 0 ? Math.min(balance / target, 1) : 0
  const remaining = Math.max(0, target - balance)

  const handleDeposit = async () => {
    const amt = roundRupees(Number(depositAmount))
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    if (amt > spending)   { setError(`Not enough in spending wallet (${formatRupees(spending)})`); return }

    setSaving(true)
    setError('')
    const newAccounts = {
      ...currentMember.accounts,
      spending: spending - amt,
      goalJar: { ...goalJar, balance: balance + amt },
    }
    await updateMemberAccounts(currentMember.id, newAccounts)
    await addTransaction({
      id: crypto.randomUUID(),
      memberId: currentMember.id,
      type: 'deposit',
      amount: amt,
      description: `Goal Jar deposit: ${goalJar?.name ?? 'Goal'}`,
      date: today(),
      relatedId: null,
    })
    await refreshMember()
    setDepositAmount('')
    setSaving(false)
  }

  if (!goalJar) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Target size={40} style={{ color: 'var(--text-dim)' }} />
        <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>No goal set yet</p>
        <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>Ask a parent to set your goal</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>GOAL JAR</p>
        <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          {goalJar.name}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
        {/* Progress visual */}
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Circular-ish jar representation */}
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-raised)" strokeWidth="10" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke="var(--warning)"
                strokeWidth="10"
                strokeDasharray={`${progress * 264} 264`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-mono font-bold" style={{ color: 'var(--warning)' }}>
                {Math.round(progress * 100)}%
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>saved</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xl font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatRupees(balance)} <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>of {formatRupees(target)}</span>
            </p>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              {remaining > 0 ? `${formatRupees(remaining)} to go` : '🎉 Goal reached!'}
            </p>
          </div>
        </div>

        {/* Deposit */}
        {remaining > 0 && (
          <div className="flex flex-col gap-3 p-4 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>ADD TO JAR</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Wallet: {formatRupees(spending)}
              </p>
            </div>
            <div className="flex gap-2">
              {[10, 20, 50].map(v => (
                <button key={v} onClick={() => setDepositAmount(String(Math.min(v, spending)))}
                  className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all"
                  style={{
                    background: depositAmount === String(v) ? 'var(--warning)' : 'var(--bg-raised)',
                    border: `1px solid ${depositAmount === String(v) ? 'var(--warning)' : 'var(--border)'}`,
                    color: depositAmount === String(v) ? '#000' : 'var(--text-muted)',
                    opacity: v > spending ? 0.4 : 1,
                  }}>
                  ₹{v}
                </button>
              ))}
            </div>
            <input type="number" min={1} max={spending}
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="Custom amount"
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {error && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{error}</p>}
            <button
              disabled={saving || !depositAmount}
              onClick={handleDeposit}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
              style={{
                background: !depositAmount ? 'var(--bg-raised)' : 'rgba(251,191,36,0.15)',
                border: `1px solid ${!depositAmount ? 'var(--border)' : 'rgba(251,191,36,0.3)'}`,
                color: !depositAmount ? 'var(--text-dim)' : 'var(--warning)',
              }}>
              <Plus size={16} />
              {saving ? 'Adding...' : `Add ${depositAmount ? formatRupees(Number(depositAmount)) : '—'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
