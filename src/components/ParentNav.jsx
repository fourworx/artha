import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, CheckCircle, MoreHorizontal } from 'lucide-react'

const items = [
  { to: '/parent',         label: 'Home',    Icon: LayoutDashboard, end: true },
  { to: '/parent/chores',  label: 'Chores',  Icon: ClipboardList },
  { to: '/parent/approve', label: 'Approve', Icon: CheckCircle },
  { to: '/parent/more',    label: 'More',    Icon: MoreHorizontal },
]

export default function ParentNav({ pendingCount = 0 }) {
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
          className="flex-1 flex flex-col items-center justify-center py-2 gap-1 relative"
          style={({ isActive }) => ({
            color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
          })}
        >
          <div className="relative">
            <Icon size={20} />
            {label === 'Approve' && pendingCount > 0 && (
              <span
                className="absolute -top-1 -right-2 text-xs font-mono rounded-full w-4 h-4 flex items-center justify-center"
                style={{ background: 'var(--negative)', color: '#fff', fontSize: '10px' }}
              >
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </div>
          <span className="text-xs font-mono">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
