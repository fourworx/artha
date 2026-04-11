import { useAuth } from '../../context/AuthContext'
import { useFamily } from '../../context/FamilyContext'
import { formatRupees } from '../../utils/currency'
import { LogOut } from 'lucide-react'

export default function ParentDashboard() {
  const { currentMember, logout } = useAuth()
  const { family, children } = useFamily()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT DASHBOARD</p>
          <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            {currentMember?.avatar} {currentMember?.name}
          </h2>
        </div>
        <button onClick={logout} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
          <LogOut size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Tax Fund */}
        {family && (
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>FAMILY TAX FUND</p>
            <p className="text-2xl font-mono font-bold" style={{ color: 'var(--positive)' }}>
              {formatRupees(family.taxFundBalance)}
            </p>
          </div>
        )}

        {/* Children cards */}
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>CHILDREN</p>
        {children.map(child => (
          <div key={child.id} className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{child.avatar}</span>
              <div>
                <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{child.name}</p>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Tier {child.tier} · {formatRupees(child.baseSalary)}/wk</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'SPENDING', value: child.accounts?.spending ?? 0 },
                { label: 'SAVINGS',  value: child.accounts?.savings  ?? 0 },
                { label: 'GOAL JAR', value: child.accounts?.goalJar?.balance ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-raised)' }}>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatRupees(value)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Coming soon sections */}
        {[
          'Chore Manager',
          'Approve Chores',
          'Utility Logger',
          'Economic Controls',
          'Reward Manager',
          'Tax Fund',
        ].map(label => (
          <div key={label} className="p-4 rounded-xl flex items-center justify-between"
            style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)' }}>
            <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>{label.toUpperCase()}</span>
            <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>→ Session 2+</span>
          </div>
        ))}
      </div>
    </div>
  )
}
