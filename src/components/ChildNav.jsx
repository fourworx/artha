import { NavLink } from 'react-router-dom'
import { Home, CheckSquare, FileText, Gift, Clock } from 'lucide-react'

const items = [
  { to: '/child/home',    label: 'Home',    Icon: Home,        end: true },
  { to: '/child/chores',  label: 'Chores',  Icon: CheckSquare },
  { to: '/child/payslip', label: 'Payslip', Icon: FileText },
  { to: '/child/rewards', label: 'Rewards', Icon: Gift },
  { to: '/child/history', label: 'History', Icon: Clock },
]

export default function ChildNav() {
  return (
    <nav
      className="flex shrink-0"
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-surface)',
      }}
    >
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-1"
          style={({ isActive }) => ({
            color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
          })}
        >
          <Icon size={20} />
          <span className="text-xs font-mono">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
