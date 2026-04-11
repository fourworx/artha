import { useState, useEffect } from 'react'
import { Zap, Plus } from 'lucide-react'
import { useFamily } from '../../context/FamilyContext'
import { addUtilityCharge, getUtilityCharges } from '../../db/operations'
import { useAuth } from '../../context/AuthContext'
import { today, displayDate } from '../../utils/dates'
import { formatRupees } from '../../utils/currency'

const QUICK_REASONS = [
  'Left lights on',
  'Long shower',
  'Wasted food',
  'Left tap running',
  'Left AC on',
]

export default function UtilityLogger() {
  const { children } = useFamily()
  const { currentMember } = useAuth()

  const [selectedChild, setSelectedChild] = useState(null)
  const [amount, setAmount]               = useState('')
  const [reason, setReason]               = useState('')
  const [customReason, setCustomReason]   = useState('')
  const [recentLogs, setRecentLogs]       = useState([])
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)

  const memberMap = Object.fromEntries(children.map(c => [c.id, c]))

  useEffect(() => {
    if (children.length > 0 && !selectedChild) setSelectedChild(children[0].id)
  }, [children, selectedChild])

  useEffect(() => {
    if (!selectedChild) return
    const weekStart = today().slice(0, 8) + '01' // rough — load all for now
    getUtilityCharges(selectedChild, '2000-01-01', '2099-12-31')
      .then(logs => {
        logs.sort((a, b) => b.date.localeCompare(a.date))
        setRecentLogs(logs.slice(0, 10))
      })
  }, [selectedChild, saved])

  const effectiveReason = reason === 'Custom' ? customReason : reason

  const handleLog = async () => {
    if (!selectedChild || !amount || !effectiveReason) return
    setSaving(true)
    await addUtilityCharge({
      id: crypto.randomUUID(),
      memberId: selectedChild,
      amount: Number(amount),
      reason: effectiveReason,
      date: today(),
      loggedBy: currentMember?.id ?? '',
    })
    setAmount('')
    setReason('')
    setCustomReason('')
    setSaving(false)
    setSaved(s => !s) // trigger reload
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT</p>
        <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          Utility Logger
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {/* Child selector */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>CHARGE TO</p>
          <div className="flex gap-3">
            {children.map(child => (
              <button key={child.id} onClick={() => setSelectedChild(child.id)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl flex-1 transition-all"
                style={{
                  background: selectedChild === child.id ? 'var(--bg-raised)' : 'var(--bg-surface)',
                  border: `1px solid ${selectedChild === child.id ? 'var(--accent-blue)' : 'var(--border)'}`,
                }}>
                <span className="text-3xl">{child.avatar}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{child.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick reasons */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>REASON</p>
          <div className="flex flex-wrap gap-2">
            {[...QUICK_REASONS, 'Custom'].map(r => (
              <button key={r} onClick={() => setReason(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                style={{
                  background: reason === r ? 'var(--accent-blue)' : 'var(--bg-raised)',
                  border: `1px solid ${reason === r ? 'var(--accent-blue)' : 'var(--border)'}`,
                  color: reason === r ? '#fff' : 'var(--text-muted)',
                }}>
                {r}
              </button>
            ))}
          </div>
          {reason === 'Custom' && (
            <input
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Describe the charge..."
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none mt-1"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          )}
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>AMOUNT (₹)</p>
          <div className="flex gap-2">
            {[5, 10, 15, 20].map(v => (
              <button key={v} onClick={() => setAmount(String(v))}
                className="flex-1 py-2 rounded-lg text-sm font-mono font-semibold transition-all"
                style={{
                  background: amount === String(v) ? 'var(--accent-blue)' : 'var(--bg-raised)',
                  border: `1px solid ${amount === String(v) ? 'var(--accent-blue)' : 'var(--border)'}`,
                  color: amount === String(v) ? '#fff' : 'var(--text-muted)',
                }}>
                ₹{v}
              </button>
            ))}
          </div>
          <input type="number" min={1}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Or enter custom amount"
            className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Log button */}
        <button
          disabled={saving || !selectedChild || !amount || !effectiveReason}
          onClick={handleLog}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
          style={{
            background: (!selectedChild || !amount || !effectiveReason) ? 'var(--bg-raised)' : 'rgba(248,113,113,0.2)',
            border: `1px solid ${(!selectedChild || !amount || !effectiveReason) ? 'var(--border)' : 'rgba(248,113,113,0.4)'}`,
            color: (!selectedChild || !amount || !effectiveReason) ? 'var(--text-dim)' : 'var(--negative)',
          }}>
          <Zap size={16} />
          {saving ? 'Logging...' : `Charge ${selectedChild ? memberMap[selectedChild]?.name : ''} ₹${amount || '0'}`}
        </button>

        {/* Recent logs */}
        {recentLogs.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>RECENT CHARGES</p>
            {recentLogs.map(log => {
              const child = memberMap[log.memberId]
              return (
                <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <span className="text-lg">{child?.avatar ?? '?'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>{log.reason}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{displayDate(log.date)}</p>
                  </div>
                  <span className="text-sm font-mono font-semibold" style={{ color: 'var(--negative)' }}>
                    −{formatRupees(log.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
