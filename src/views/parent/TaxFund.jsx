import { useState } from 'react'
import { Landmark, ArrowUpRight } from 'lucide-react'
import { useFamily, useCurrency } from '../../context/FamilyContext'
import { updateTaxFund } from '../../db/operations'
import { roundRupees } from '../../utils/currency'
import { displayDateFull, today } from '../../utils/dates'
import { FAMILY_ID } from '../../utils/constants'

const SPEND_REASONS = [
  'Family treat',
  'Pizza night',
  'Movie outing',
  'Board game',
  'Custom',
]

export default function TaxFund() {
  const { family, reload } = useFamily()
  const fmt = useCurrency()

  const [amount,       setAmount]       = useState('')
  const [reason,       setReason]       = useState('')
  const [customReason, setCustomReason] = useState('')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const balance = family?.taxFundBalance ?? 0
  const history = [...(family?.taxFundHistory ?? [])].reverse()

  const effectiveReason = reason === 'Custom' ? customReason : reason

  const handleSpend = async () => {
    const amt = roundRupees(Number(amount))
    if (!amt || amt <= 0)   { setError('Enter a valid amount'); return }
    if (amt > balance)      { setError('Not enough in tax fund'); return }
    if (!effectiveReason)   { setError('Enter a reason'); return }

    setSaving(true)
    setError('')
    const entry = {
      id: crypto.randomUUID(),
      memberId: null,
      amount: amt,
      type: 'debit',
      description: effectiveReason,
      date: today(),
    }
    await updateTaxFund(
      FAMILY_ID,
      balance - amt,
      [...(family.taxFundHistory ?? []), entry]
    )
    await reload()
    setAmount('')
    setReason('')
    setCustomReason('')
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT</p>
        <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          Family Tax Fund
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {/* Balance */}
        <div className="flex flex-col items-center py-6 gap-1 rounded-xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <Landmark size={28} style={{ color: 'var(--text-muted)' }} />
          <p className="text-xs font-mono mt-2" style={{ color: 'var(--text-muted)' }}>TOTAL BALANCE</p>
          <p className="text-4xl font-mono font-bold" style={{ color: 'var(--positive)' }}>
            {fmt(balance)}
          </p>
          <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-dim)' }}>
            Collected from family taxes
          </p>
        </div>

        {/* Spend form */}
        <div className="flex flex-col gap-3 p-4 rounded-xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SPEND FROM FUND</p>

          <div className="flex flex-wrap gap-2">
            {SPEND_REASONS.map(r => (
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
            <input value={customReason} onChange={e => setCustomReason(e.target.value)}
              placeholder="What's it for?"
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          )}

          <input type="number" min={1} max={balance}
            value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={`Amount (max ${fmt(balance)})`}
            className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />

          {error && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{error}</p>}

          <button
            disabled={saving || !amount || !effectiveReason || balance <= 0}
            onClick={handleSpend}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
            style={{
              background: (!amount || !effectiveReason || balance <= 0) ? 'var(--bg-raised)' : 'rgba(74,222,128,0.15)',
              border: `1px solid ${(!amount || !effectiveReason || balance <= 0) ? 'var(--border)' : 'rgba(74,222,128,0.3)'}`,
              color: (!amount || !effectiveReason || balance <= 0) ? 'var(--text-dim)' : 'var(--positive)',
            }}>
            <ArrowUpRight size={16} />
            {saving ? 'Processing...' : `Spend ${amount ? fmt(Number(amount)) : '—'}`}
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>HISTORY</p>
            {history.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <span className="text-lg shrink-0">{entry.type === 'credit' ? '📥' : '📤'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                    {entry.description}
                  </p>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {displayDateFull(entry.date)}
                  </p>
                </div>
                <span className="text-sm font-mono font-semibold shrink-0"
                  style={{ color: entry.type === 'credit' ? 'var(--positive)' : 'var(--negative)' }}>
                  {entry.type === 'credit' ? '+' : '−'}{fmt(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
