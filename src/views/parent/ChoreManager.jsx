import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Check, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { useFamily } from '../../context/FamilyContext'
import { addChore, updateChore, toggleChoreActive } from '../../db/operations'
import { CHORE_RECURRENCE, FAMILY_ID } from '../../utils/constants'
import { formatRupees } from '../../utils/currency'

// ── Recurrence badge ──────────────────────────────────────────────────────────
function RecurrenceBadge({ recurrence, daysPerWeek }) {
  const labels = {
    daily: 'Daily', weekday: 'Wkday', weekend: 'Wkend',
    weekly: 'Weekly', custom: `${daysPerWeek}×/wk`, once: 'Once',
  }
  return (
    <span className="text-xs font-mono px-1.5 py-0.5 rounded"
      style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
      {labels[recurrence] ?? recurrence}
    </span>
  )
}

// ── Chore form (slide-up sheet) ───────────────────────────────────────────────
function ChoreForm({ type, initial, childMembers, onSave, onClose }) {
  const isEdit = !!initial

  const [title, setTitle]           = useState(initial?.title ?? '')
  const [recurrence, setRecurrence] = useState(initial?.recurrence ?? 'daily')
  const [value, setValue]           = useState(initial?.value ?? 0)
  const [daysPerWeek, setDaysPerWeek] = useState(initial?.daysPerWeek ?? 3)
  const [assignedTo, setAssignedTo] = useState(initial?.assignedTo ?? [])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const toggleAssign = (id) => {
    setAssignedTo(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    if (type === 'mandatory' && assignedTo.length === 0) {
      setError('Assign to at least one child'); return
    }
    setSaving(true)
    const choreData = {
      familyId: FAMILY_ID,
      title: title.trim(),
      type,
      value: type === 'bonus' ? Number(value) : 0,
      recurrence,
      daysPerWeek: recurrence === 'custom' ? Number(daysPerWeek) : null,
      assignedTo,
      isActive: initial?.isActive ?? true,
    }
    try {
      if (isEdit) {
        await updateChore(initial.id, choreData)
      } else {
        await addChore(choreData)
      }
      onSave()
    } catch (e) {
      setError('Save failed — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-t-2xl flex flex-col max-h-[85vh]"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-bright)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit' : 'Add'} {type === 'mandatory' ? 'Mandatory' : 'Bonus'} Chore
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>TITLE</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Make own bed"
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
              style={{
                background: 'var(--bg-raised)', border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Recurrence */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>RECURRENCE</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CHORE_RECURRENCE).map(([key, label]) => (
                <button key={key} onClick={() => setRecurrence(key)}
                  className="py-2 rounded-lg text-xs font-mono transition-all"
                  style={{
                    background: recurrence === key ? 'var(--accent-blue)' : 'var(--bg-raised)',
                    border: `1px solid ${recurrence === key ? 'var(--accent-blue)' : 'var(--border)'}`,
                    color: recurrence === key ? '#fff' : 'var(--text-muted)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Days per week (custom only) */}
          {recurrence === 'custom' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>TIMES PER WEEK</label>
              <input type="number" min={1} max={7}
                value={daysPerWeek}
                onChange={e => setDaysPerWeek(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          {/* Value (bonus only) */}
          {type === 'bonus' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>BONUS VALUE (₹)</label>
              <input type="number" min={1}
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          {/* Assign to */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {type === 'mandatory' ? 'ASSIGN TO (required)' : 'RESTRICT TO (empty = all children)'}
            </label>
            <div className="flex gap-2 flex-wrap">
              {childMembers.map(child => {
                const selected = assignedTo.includes(child.id)
                return (
                  <button key={child.id} onClick={() => toggleAssign(child.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                    style={{
                      background: selected ? 'var(--accent-blue)' : 'var(--bg-raised)',
                      border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border)'}`,
                      color: selected ? '#fff' : 'var(--text-muted)',
                    }}>
                    <span>{child.avatar}</span>
                    <span>{child.name}</span>
                    {selected && <Check size={12} />}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{error}</p>
          )}

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
            style={{
              background: saving ? 'var(--border)' : 'var(--accent-blue)',
              color: saving ? 'var(--text-muted)' : '#fff',
            }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Chore'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Chore row ─────────────────────────────────────────────────────────────────
function ChoreRow({ chore, onEdit, onToggle }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        opacity: chore.isActive ? 1 : 0.45,
      }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>
          {chore.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <RecurrenceBadge recurrence={chore.recurrence} daysPerWeek={chore.daysPerWeek} />
          {chore.type === 'bonus' && (
            <span className="text-xs font-mono" style={{ color: 'var(--positive)' }}>
              {formatRupees(chore.value)}
            </span>
          )}
        </div>
      </div>
      <button onClick={onEdit} className="p-1.5 rounded-lg"
        style={{ color: 'var(--text-muted)', background: 'var(--bg-raised)' }}>
        <Pencil size={14} />
      </button>
      <button onClick={onToggle} className="p-1.5 rounded-lg"
        style={{ color: chore.isActive ? 'var(--positive)' : 'var(--text-dim)' }}>
        {chore.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
      </button>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ChoreManager() {
  const { chores: allChores, children, reload } = useFamily()
  const [tab, setTab]         = useState('mandatory')
  const [childFilter, setChildFilter] = useState(null)
  const [form, setForm]       = useState(null) // null | { type, initial? }

  useEffect(() => {
    if (children.length > 0 && !childFilter) setChildFilter(children[0].id)
  }, [children, childFilter])

  const handleSave = useCallback(async () => {
    await reload()
    setForm(null)
  }, [reload])

  const handleToggle = useCallback(async (chore) => {
    await toggleChoreActive(chore.id, chore.isActive)
    await reload()
  }, [reload])

  const mandatoryChores = allChores
    .filter(c => c.type === 'mandatory' && (!childFilter || c.assignedTo.includes(childFilter)))

  const bonusChores = allChores.filter(c => c.type === 'bonus')

  const displayed = tab === 'mandatory' ? mandatoryChores : bonusChores

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT</p>
        <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          Chore Manager
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 px-4 pt-3 gap-2">
        {['mandatory', 'bonus'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-mono transition-all"
            style={{
              background: tab === t ? 'var(--accent-blue)' : 'var(--bg-raised)',
              border: `1px solid ${tab === t ? 'var(--accent-blue)' : 'var(--border)'}`,
              color: tab === t ? '#fff' : 'var(--text-muted)',
            }}>
            {t === 'mandatory' ? 'Mandatory' : 'Bonus'}
          </button>
        ))}
      </div>

      {/* Child filter (mandatory tab only) */}
      {tab === 'mandatory' && (
        <div className="flex shrink-0 px-4 pt-3 gap-2">
          {children.map(child => (
            <button key={child.id} onClick={() => setChildFilter(child.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                background: childFilter === child.id ? 'var(--bg-raised)' : 'transparent',
                border: `1px solid ${childFilter === child.id ? 'var(--border-bright)' : 'transparent'}`,
                color: childFilter === child.id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}>
              <span>{child.avatar}</span>
              <span>{child.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Chore list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {displayed.length === 0 && (
          <p className="text-xs font-mono text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No chores yet — tap + to add one
          </p>
        )}
        {displayed.map(chore => (
          <ChoreRow
            key={chore.id}
            chore={chore}
            onEdit={() => setForm({ type: chore.type, initial: chore })}
            onToggle={() => handleToggle(chore)}
          />
        ))}
      </div>

      {/* Add button */}
      <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setForm({ type: tab })}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <Plus size={16} />
          Add {tab === 'mandatory' ? 'Mandatory' : 'Bonus'} Chore
        </button>
      </div>

      {/* Form modal */}
      {form && (
        <ChoreForm
          type={form.type}
          initial={form.initial}
          childMembers={children}
          onSave={handleSave}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  )
}
