import { useAuth } from '../../context/AuthContext'
import { formatRupees } from '../../utils/currency'
import { LogOut } from 'lucide-react'

export default function Tier2Home() {
  const { currentMember, logout } = useAuth()
  const accounts = currentMember?.accounts ?? {}

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>MY ECONOMY</p>
          <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            {currentMember?.avatar} {currentMember?.name}
          </h2>
        </div>
        <button onClick={logout} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
          <LogOut size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Balance cards */}
        <div className="grid grid-cols-1 gap-3">
          {[
            { label: 'SPENDING WALLET', value: accounts.spending ?? 0, color: 'var(--positive)' },
            { label: 'SAVINGS',         value: accounts.savings  ?? 0, color: 'var(--accent-blue)' },
            { label: 'GOAL JAR',        value: accounts.goalJar?.balance ?? 0, sub: accounts.goalJar?.name, color: 'var(--warning)' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-3xl font-mono font-bold" style={{ color }}>{formatRupees(value)}</p>
              {sub && <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>Goal: {sub}</p>}
            </div>
          ))}
        </div>

        {/* Coming soon */}
        {['Chores', 'Payslip', 'Savings', 'Goal Jar', 'Rewards', 'History'].map(label => (
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
