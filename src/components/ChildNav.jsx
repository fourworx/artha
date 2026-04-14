import { NavLink, useNavigate } from 'react-router-dom'
import { Home, CheckSquare, FileText, Heart, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const items = [
  { to: '/child/home',   label: 'Home',    Icon: Home,        end: true },
  { to: '/child/chores', label: 'Chores',  Icon: CheckSquare },
  { to: '/child/ledger', label: 'Ledger',  Icon: FileText },
  { to: '/child/goal',   label: 'Goals',   Icon: Heart },
]

export default function ChildNav() {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

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
      <button
        onClick={handleLogout}
        className="flex-1 flex flex-col items-center justify-center py-2 gap-1"
        style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}
      >
        <LogOut size={20} />
        <span className="text-xs font-mono">Exit</span>
      </button>
    </nav>
  )
}
