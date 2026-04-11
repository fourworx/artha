import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useFamily } from '../../context/FamilyContext'
import { updateFamilyConfig } from '../../db/operations'
import { FAMILY_ID } from '../../utils/constants'

function SliderRow({ label, value, min, max, step, format, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</label>
        <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full outline-none cursor-pointer"
        style={{ accentColor: 'var(--accent-blue)' }}
      />
      <div className="flex justify-between text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

export default function EconomicControls() {
  const { family, reload } = useFamily()

  const [taxRate,       setTaxRate]       = useState(0.12)
  const [rentAmount,    setRentAmount]    = useState(30)
  const [interestRate,  setInterestRate]  = useState(0.02)
  const [autoSave,      setAutoSave]      = useState(0.20)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSavedFlag]     = useState(false)

  useEffect(() => {
    if (family?.config) {
      setTaxRate(family.config.taxRate)
      setRentAmount(family.config.rentAmount)
      setInterestRate(family.config.interestRate)
      setAutoSave(family.config.autoSavePercent)
    }
  }, [family])

  const handleSave = async () => {
    setSaving(true)
    await updateFamilyConfig(FAMILY_ID, {
      ...family.config,
      taxRate,
      rentAmount,
      interestRate,
      autoSavePercent: autoSave,
    })
    await reload()
    setSaving(false)
    setSavedFlag(true)
    setTimeout(() => setSavedFlag(false), 2000)
  }

  const pct = v => `${Math.round(v * 100)}%`
  const rupees = v => `₹${v}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT</p>
        <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          Economic Controls
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
        {/* Info banner */}
        <div className="px-3 py-2.5 rounded-xl text-xs font-mono"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Changes apply to the <span style={{ color: 'var(--text-primary)' }}>next payslip</span>. Current week is unaffected.
        </div>

        <SliderRow
          label="TAX RATE"
          value={taxRate}
          min={0} max={0.30} step={0.01}
          format={pct}
          onChange={setTaxRate}
        />

        <SliderRow
          label="WEEKLY RENT (₹)"
          value={rentAmount}
          min={0} max={100} step={5}
          format={rupees}
          onChange={setRentAmount}
        />

        <SliderRow
          label="SAVINGS INTEREST RATE / WEEK"
          value={interestRate}
          min={0} max={0.10} step={0.005}
          format={pct}
          onChange={setInterestRate}
        />

        <SliderRow
          label="AUTO-SAVE %"
          value={autoSave}
          min={0} max={0.50} step={0.05}
          format={pct}
          onChange={setAutoSave}
        />

        {/* Summary */}
        <div className="px-3 py-3 rounded-xl flex flex-col gap-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>EXAMPLE: ₹200 GROSS</p>
          {[
            ['Tax',        `−₹${Math.round(200 * taxRate)}`],
            ['Rent',       `−₹${rentAmount}`],
            ['Net',        `₹${200 - Math.round(200 * taxRate) - rentAmount}`],
            ['→ Savings',  `₹${Math.round((200 - Math.round(200 * taxRate) - rentAmount) * autoSave)}`],
            ['→ Spending', `₹${Math.round((200 - Math.round(200 * taxRate) - rentAmount) * (1 - autoSave))}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{v}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
          style={{
            background: saved ? 'rgba(74,222,128,0.15)' : 'var(--accent-blue)',
            border: `1px solid ${saved ? 'rgba(74,222,128,0.3)' : 'var(--accent-blue)'}`,
            color: saved ? 'var(--positive)' : '#fff',
          }}>
          <Save size={16} />
          {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
