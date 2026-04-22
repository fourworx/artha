import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamily, useCurrency } from '../../context/FamilyContext'
import { setMemberVacation } from '../../db/operations'
import { ChevronLeft, Plane } from 'lucide-react'
import { today } from '../../utils/dates'

function VacationCard({ child, onUpdate }) {
  const fmt          = useCurrency()
  const vacation     = child.config?.vacation
  const isOn         = vacation?.active ?? false
  const isPaid       = vacation?.paidLeave ?? true
  const [saving, setSaving] = useState(false)

  const handleToggle = async () => {
    setSaving(true)
    if (isOn) {
      await setMemberVacation(child.id, null)
    } else {
      await setMemberVacation(child.id, { active: true, paidLeave: true, startDate: today() })
    }
    await onUpdate()
    setSaving(false)
  }

  const handleLeaveType = async (paid) => {
    if (isPaid === paid) return
    setSaving(true)
    await setMemberVacation(child.id, { active: true, paidLeave: paid, startDate: vacation?.startDate ?? today() })
    await onUpdate()
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl"
      style={{ background: 'var(--bg-surface)', border: `1px solid ${isOn ? 'rgba(96,165,250,0.3)' : 'var(--border)'}` }}>

      {/* Child row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{child.avatar}</span>
          <div>
            <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{child.name}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {fmt(child.baseSalary)}/period · Tier {child.tier}
            </p>
          </div>
        </div>

        {/* On/Off toggle */}
        <button
          onClick={handleToggle}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all active:scale-95"
          style={{
            background: isOn ? 'rgba(96,165,250,0.15)' : 'var(--bg-raised)',
            border: `1px solid ${isOn ? 'rgba(96,165,250,0.35)' : 'var(--border)'}`,
            color: isOn ? '#60a5fa' : 'var(--text-muted)',
          }}>
          <Plane size={12} />
          {saving ? '...' : isOn ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Leave type selector — only when vacation is active */}
      {isOn && (
        <div className="flex flex-col gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>LEAVE TYPE</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { paid: true,  label: '💰 Paid Leave',   sub: 'Full salary, no chore requirements' },
              { paid: false, label: '🏖 Unpaid Leave',  sub: 'No salary, no penalties either'      },
            ].map(({ paid, label, sub }) => (
              <button
                key={String(paid)}
                onClick={() => handleLeaveType(paid)}
                disabled={saving}
                className="p-3 rounded-xl text-left transition-all active:scale-95"
                style={{
                  background: isPaid === paid ? 'rgba(96,165,250,0.1)' : 'var(--bg-raised)',
                  border: `1px solid ${isPaid === paid ? 'rgba(96,165,250,0.35)' : 'var(--border)'}`,
                }}>
                <p className="text-xs font-mono font-semibold" style={{ color: isPaid === paid ? '#60a5fa' : 'var(--text-muted)' }}>
                  {label}
                </p>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-dim)', fontSize: 10 }}>{sub}</p>
              </button>
            ))}
          </div>
          {vacation?.startDate && (
            <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
              Started {vacation.startDate}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Vacation() {
  const navigate          = useNavigate()
  const { children, reload } = useFamily()
  const [bulkSaving, setBulkSaving] = useState(false)

  const tier2Children = children.filter(c => c.tier >= 2)
  const anyOn = tier2Children.some(c => c.config?.vacation?.active)

  const handleSetAll = async (active, paidLeave = true) => {
    setBulkSaving(true)
    const vacation = active ? { active: true, paidLeave, startDate: today() } : null
    await Promise.all(tier2Children.map(c => setMemberVacation(c.id, vacation)))
    await reload()
    setBulkSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate('/parent/more')}
          className="flex items-center gap-1 mb-3 -ml-1"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
          <ChevronLeft size={16} />
          <span className="text-xs font-mono">More</span>
        </button>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT</p>
        <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>Vacation Mode</h2>
        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-dim)' }}>
          Chore requirements & credit scoring paused while on vacation
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Bulk actions */}
        {tier2Children.length > 1 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>ALL CHILDREN</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSetAll(true, true)}
                disabled={bulkSaving}
                className="py-2.5 rounded-xl text-xs font-mono font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>
                ✈️ All on paid leave
              </button>
              <button
                onClick={() => handleSetAll(true, false)}
                disabled={bulkSaving}
                className="py-2.5 rounded-xl text-xs font-mono font-semibold transition-all active:scale-95"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                🏖 All on unpaid leave
              </button>
            </div>
            {anyOn && (
              <button
                onClick={() => handleSetAll(false)}
                disabled={bulkSaving}
                className="w-full py-2.5 rounded-xl text-xs font-mono font-semibold transition-all active:scale-95"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--negative)' }}>
                Cancel all vacations
              </button>
            )}
          </div>
        )}

        {/* Per-child cards */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>PER CHILD</p>
          {tier2Children.length === 0 ? (
            <p className="text-xs font-mono text-center py-8" style={{ color: 'var(--text-dim)' }}>
              No Tier 2 children yet
            </p>
          ) : (
            tier2Children.map(child => (
              <VacationCard key={child.id} child={child} onUpdate={reload} />
            ))
          )}
        </div>

        {/* Info box */}
        <div className="px-4 py-3 rounded-xl flex flex-col gap-1.5"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>HOW IT WORKS</p>
          <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            💰 <span style={{ color: 'var(--text-muted)' }}>Paid leave</span> — full salary paid, chores optional, credit score unaffected
          </p>
          <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            🏖 <span style={{ color: 'var(--text-muted)' }}>Unpaid leave</span> — no salary, no rent/tax deducted, credit score unaffected. Savings interest still accrues.
          </p>
          <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            Affects the payslip for whichever period is active when vacation is on. Remember to turn it off when they return.
          </p>
        </div>
      </div>
    </div>
  )
}
