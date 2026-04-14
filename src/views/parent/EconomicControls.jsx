import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useFamily, useCurrency } from '../../context/FamilyContext'
import { updateFamilyConfig, updateMemberConfig } from '../../db/operations'
import { FAMILY_ID, CURRENCIES } from '../../utils/constants'

function SliderRow({ label, value, min, max, step, display, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</label>
        <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
          {display(value)}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full outline-none cursor-pointer"
        style={{ accentColor: 'var(--accent-blue)' }}
      />
      <div className="flex justify-between text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
        <span>{display(min)}</span><span>{display(max)}</span>
      </div>
    </div>
  )
}

function Toggle({ on, onToggle, label, sub }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between px-3 py-2.5 rounded-lg w-full transition-all"
      style={{
        background: on ? 'rgba(74,222,128,0.08)' : 'var(--bg-raised)',
        border: `1px solid ${on ? 'rgba(74,222,128,0.25)' : 'var(--border)'}`,
      }}>
      <div className="text-left">
        <p className="text-xs font-mono font-semibold"
          style={{ color: on ? 'var(--positive)' : 'var(--text-primary)' }}>{label}</p>
        {sub && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      <div className="w-10 h-5 rounded-full transition-all shrink-0"
        style={{ background: on ? 'var(--positive)' : 'var(--border-bright)', position: 'relative' }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
          style={{ background: '#fff', left: on ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
    </button>
  )
}

export default function EconomicControls() {
  const { family, children, reload } = useFamily()
  const fmt = useCurrency()

  // ── Family-wide settings ─────────────────────────────────────────
  const [currency,    setCurrency]    = useState('INR')
  const [payPeriod,   setPayPeriod]   = useState('weekly')
  const [paydayDow,   setPaydayDow]   = useState(6)
  const [paydayDom,   setPaydayDom]   = useState(28)
  const [autoPayslip, setAutoPayslip] = useState(false)

  // ── Economic settings (per-child or family-wide) ─────────────────
  const [sameForAll,      setSameForAll]      = useState(true)
  const [selectedChildId, setSelectedChildId] = useState(null)

  const [taxRate,          setTaxRate]          = useState(0.12)
  const [rentAmount,       setRentAmount]       = useState(30)
  const [interestRate,     setInterestRate]     = useState(0.02)
  const [loanInterestRate, setLoanInterestRate] = useState(0.05)
  const [autoSave,         setAutoSave]         = useState(0.20)
  const [philanthropyPct,  setPhilanthropyPct]  = useState(0.03)

  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  // Populate family-wide settings from DB
  useEffect(() => {
    if (!family?.config) return
    const c = family.config
    setCurrency(c.currency ?? 'INR')
    setPayPeriod(c.payPeriod ?? 'weekly')
    setPaydayDow(c.paydayDow ?? 6)
    setPaydayDom(c.paydayDom ?? 28)
    setAutoPayslip(c.autoPayslip ?? false)

    // Detect if any child has overrides → default sameForAll = false
    const anyOverrides = children.some(ch => ch.config && Object.keys(ch.config).length > 0)
    const initialSameForAll = !anyOverrides
    setSameForAll(initialSameForAll)

    if (initialSameForAll) {
      // Load family defaults into sliders
      loadEconomicSliders(c)
    } else {
      // Select first child and load their effective config
      const first = children.find(ch => !ch.isParent)
      if (first) {
        setSelectedChildId(first.id)
        loadEconomicSliders({ ...c, ...(first.config ?? {}) })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family])

  function loadEconomicSliders(cfg) {
    setTaxRate(cfg.taxRate ?? 0.12)
    setRentAmount(cfg.rentAmount ?? 30)
    setInterestRate(cfg.interestRate ?? 0.02)
    setLoanInterestRate(cfg.loanInterestRate ?? 0.05)
    setAutoSave(cfg.autoSavePercent ?? 0.20)
    setPhilanthropyPct(cfg.philanthropyPercent ?? 0.03)
  }

  // When selected child changes in per-child mode, reload their sliders
  useEffect(() => {
    if (sameForAll || !selectedChildId || !family?.config) return
    const child = children.find(ch => ch.id === selectedChildId)
    if (!child) return
    loadEconomicSliders({ ...family.config, ...(child.config ?? {}) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId])

  // When toggling to sameForAll ON, load family defaults into sliders
  const handleSameForAllToggle = () => {
    const next = !sameForAll
    setSameForAll(next)
    if (next && family?.config) {
      loadEconomicSliders(family.config)
      setSelectedChildId(null)
    } else {
      // Select first child
      const first = children.find(ch => !ch.isParent)
      if (first) setSelectedChildId(first.id)
    }
  }

  // Guardrail: loan rate >= savings rate
  const onSavingsRateChange = (val) => {
    setInterestRate(val)
    if (val > loanInterestRate) setLoanInterestRate(val)
  }
  const onLoanRateChange = (val) => {
    setLoanInterestRate(Math.max(val, interestRate))
  }

  const handleSave = async () => {
    setSaving(true)
    const economicFields = {
      taxRate,
      rentAmount,
      interestRate,
      loanInterestRate: Math.max(loanInterestRate, interestRate),
      autoSavePercent: autoSave,
      philanthropyPercent: philanthropyPct,
    }
    const familyWideFields = {
      currency,
      payPeriod,
      paydayDow,
      paydayDom: Math.min(28, Math.max(1, paydayDom)),
      autoPayslip,
    }

    if (sameForAll) {
      // Save economic fields + family-wide to family.config
      await updateFamilyConfig(FAMILY_ID, {
        ...family.config,
        ...economicFields,
        ...familyWideFields,
      })
      // Clear all child overrides
      const nonParents = children.filter(ch => !ch.isParent)
      await Promise.all(nonParents.map(ch => updateMemberConfig(ch.id, null)))
    } else {
      // Save only family-wide fields to family.config (don't overwrite economic defaults)
      await updateFamilyConfig(FAMILY_ID, {
        ...family.config,
        ...familyWideFields,
      })
      // Save economic fields to selected child
      if (selectedChildId) {
        await updateMemberConfig(selectedChildId, economicFields)
      }
    }

    await reload()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const pct    = v => `${Math.round(v * 100)}%`
  const curr   = CURRENCIES[currency] ?? CURRENCIES.INR
  const amtFmt = v => `${curr.symbol}${v}`
  const gross  = 200
  const tax    = Math.round(gross * taxRate)
  const net    = Math.max(0, gross - tax - rentAmount)

  const nonParentChildren = children.filter(ch => !ch.isParent)
  const selectedChild = nonParentChildren.find(ch => ch.id === selectedChildId)

  // Check if selected child has any overrides vs family defaults
  const hasOverride = selectedChild?.config && Object.keys(selectedChild.config).length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT</p>
        <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          Economic Controls
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
        <div className="px-3 py-2.5 rounded-xl text-xs font-mono"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Changes apply to the <span style={{ color: 'var(--text-primary)' }}>next payslip</span>. Current period is unaffected.
        </div>

        {/* ── Currency (always family-wide) ── */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>CURRENCY</label>
          <div className="grid grid-cols-4 gap-2">
            {Object.values(CURRENCIES).map(c => (
              <button key={c.code} onClick={() => setCurrency(c.code)}
                className="flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all"
                style={{
                  background: currency === c.code ? 'var(--accent-blue)' : 'var(--bg-raised)',
                  border: `1px solid ${currency === c.code ? 'var(--accent-blue)' : 'var(--border)'}`,
                }}>
                <span className="text-base font-mono font-bold"
                  style={{ color: currency === c.code ? '#fff' : 'var(--text-primary)' }}>
                  {c.symbol}
                </span>
                <span className="text-xs font-mono mt-0.5"
                  style={{ color: currency === c.code ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                  {c.code}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Pay period (always family-wide) ── */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PAY PERIOD</label>
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
            {['weekly', 'monthly'].map(p => (
              <button key={p} onClick={() => setPayPeriod(p)}
                className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold capitalize transition-all"
                style={{
                  background: payPeriod === p ? 'var(--bg-surface)' : 'transparent',
                  border: payPeriod === p ? '1px solid var(--border)' : '1px solid transparent',
                  color: payPeriod === p ? 'var(--text-primary)' : 'var(--text-muted)',
                }}>
                {p === 'weekly' ? '📅 Weekly' : '🗓 Monthly'}
              </button>
            ))}
          </div>

          {payPeriod === 'weekly' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PAYDAY</label>
              <div className="flex gap-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                  <button key={i} onClick={() => setPaydayDow(i)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-mono transition-all"
                    style={{
                      background: paydayDow === i ? 'var(--accent-blue)' : 'var(--bg-raised)',
                      border: `1px solid ${paydayDow === i ? 'var(--accent-blue)' : 'var(--border)'}`,
                      color: paydayDow === i ? '#fff' : 'var(--text-muted)',
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {payPeriod === 'monthly' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                PAYDAY (day of month, 1–28)
              </label>
              <input
                type="number" min={1} max={28} value={paydayDom}
                onChange={e => setPaydayDom(Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                Adjust child salaries to monthly amounts.
              </p>
            </div>
          )}

          <Toggle
            on={autoPayslip}
            onToggle={() => setAutoPayslip(v => !v)}
            label="Auto-run payslips on payday"
            sub={autoPayslip ? 'Runs automatically when parent opens app on payday' : 'Manual only — parent taps Run Payslip'}
          />
        </div>

        {/* ── Divider ── */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* ── Economic settings ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>ECONOMIC SETTINGS</label>
            {!sameForAll && nonParentChildren.some(ch => ch.config && Object.keys(ch.config).length > 0) && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--warning)', border: '1px solid rgba(251,191,36,0.2)' }}>
                custom per child
              </span>
            )}
          </div>

          {/* Same for all toggle */}
          <Toggle
            on={sameForAll}
            onToggle={handleSameForAllToggle}
            label="Same for all children"
            sub={sameForAll
              ? 'All children share the same rates below'
              : 'Each child can have different rates — select a child to edit'}
          />

          {/* Per-child selector */}
          {!sameForAll && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>EDITING FOR</label>
              <div className="flex gap-2">
                {nonParentChildren.map(ch => {
                  const isSelected = ch.id === selectedChildId
                  const childHasOverride = ch.config && Object.keys(ch.config).length > 0
                  return (
                    <button key={ch.id}
                      onClick={() => setSelectedChildId(ch.id)}
                      className="flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl transition-all"
                      style={{
                        background: isSelected ? 'var(--accent-blue)' : 'var(--bg-raised)',
                        border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border)'}`,
                      }}>
                      <span className="text-2xl">{ch.avatar}</span>
                      <span className="text-xs font-mono mt-1"
                        style={{ color: isSelected ? '#fff' : 'var(--text-muted)' }}>
                        {ch.name}
                      </span>
                      {childHasOverride && (
                        <span className="text-xs mt-0.5" style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--warning)' }}>
                          custom
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {selectedChild && !hasOverride && (
                <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                  Using family defaults — edit below to create custom rates for {selectedChild.name}.
                </p>
              )}
              {selectedChild && hasOverride && (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                    Custom rates active for {selectedChild.name}.
                  </p>
                  <button
                    onClick={async () => {
                      await updateMemberConfig(selectedChildId, null)
                      await reload()
                      if (family?.config) loadEconomicSliders(family.config)
                    }}
                    className="text-xs font-mono px-2 py-0.5 rounded-lg transition-all"
                    style={{ color: 'var(--negative)', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)' }}>
                    Reset to defaults
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Economic sliders — only visible when sameForAll OR a child is selected */}
          {(sameForAll || selectedChildId) && (
            <div className="flex flex-col gap-5">
              <SliderRow label="TAX RATE"
                value={taxRate} min={0} max={0.30} step={0.01}
                display={pct} onChange={setTaxRate}
              />

              <SliderRow label={`RENT PER ${payPeriod === 'monthly' ? 'MONTH' : 'WEEK'} (${curr.symbol})`}
                value={rentAmount} min={0} max={payPeriod === 'monthly' ? 400 : 100} step={payPeriod === 'monthly' ? 10 : 5}
                display={amtFmt} onChange={setRentAmount}
              />

              <SliderRow label={`SAVINGS INTEREST / ${payPeriod === 'monthly' ? 'MONTH' : 'WEEK'}`}
                value={interestRate} min={0} max={0.10} step={0.005}
                display={pct} onChange={onSavingsRateChange}
              />

              <div className="flex flex-col gap-2">
                <SliderRow label={`LOAN INTEREST / ${payPeriod === 'monthly' ? 'MONTH' : 'WEEK'}`}
                  value={loanInterestRate} min={interestRate} max={0.20} step={0.005}
                  display={pct} onChange={onLoanRateChange}
                />
                {loanInterestRate === interestRate && (
                  <p className="text-xs font-mono" style={{ color: 'var(--warning)' }}>
                    ⚠ Loan rate equals savings rate — arbitrage possible. Consider raising it.
                  </p>
                )}
                {loanInterestRate > interestRate && (
                  <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                    Spread: {pct(loanInterestRate - interestRate)} — borrowing costs more than saving earns ✓
                  </p>
                )}
              </div>

              <SliderRow label="AUTO-SAVE %"
                value={autoSave} min={0} max={0.50} step={0.05}
                display={pct} onChange={setAutoSave}
              />

              <SliderRow label="PHILANTHROPY %"
                value={philanthropyPct} min={0} max={0.20} step={0.01}
                display={pct} onChange={setPhilanthropyPct}
              />
            </div>
          )}
        </div>

        {/* ── Example ── */}
        {(sameForAll || selectedChildId) && (
          <div className="px-3 py-3 rounded-xl flex flex-col gap-2"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              EXAMPLE: {curr.symbol}200 GROSS{!sameForAll && selectedChild ? ` · ${selectedChild.name}` : ''}
            </p>
            {[
              ['Tax',             `−${curr.symbol}${tax}`],
              ['Rent',            `−${curr.symbol}${rentAmount}`],
              ['Net',             `${curr.symbol}${net}`],
              ['→ Savings',       `${curr.symbol}${Math.round(net * autoSave)}`],
              ['→ Philanthropy',  `${curr.symbol}${Math.round(net * philanthropyPct)}`],
              ['→ Spending',      `${curr.symbol}${Math.round(net * (1 - autoSave - philanthropyPct))}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={handleSave} disabled={saving || (!sameForAll && !selectedChildId)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
          style={{
            background: saved ? 'rgba(74,222,128,0.15)' : 'var(--accent-blue)',
            border: `1px solid ${saved ? 'rgba(74,222,128,0.3)' : 'var(--accent-blue)'}`,
            color: saved ? 'var(--positive)' : '#fff',
            opacity: !sameForAll && !selectedChildId ? 0.5 : 1,
          }}>
          <Save size={16} />
          {saved ? 'Saved ✓'
            : saving ? 'Saving...'
            : !sameForAll && selectedChild ? `Save for ${selectedChild.name}`
            : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
