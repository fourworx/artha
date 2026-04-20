import { useNavigate } from 'react-router-dom'
import { Zap, SlidersHorizontal, Gift, Landmark, Download, Users, HandCoins, QrCode, Receipt } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const items = [
  { icon: Users,            label: 'Family Members',    sub: 'Edit names, PINs, add children',        to: '/parent/members'      },
  { icon: HandCoins,        label: 'Loans',             sub: 'Active loans, interest, payoff',        to: '/parent/loans'        },
  { icon: QrCode,           label: 'Invite Code',       sub: "Set up a child's device with one code", to: '/parent/invite-code'  },
  { icon: Zap,              label: 'Utility Logger',    sub: 'Log electricity, water charges',        to: '/parent/utilities'    },
  { icon: SlidersHorizontal,label: 'Economic Controls', sub: 'Tax, rent, interest, auto-save',        to: '/parent/economy'      },
  { icon: Gift,             label: 'Reward Manager',    sub: 'Add & price rewards',                   to: '/parent/rewards'      },
  { icon: Landmark,         label: 'Tax Fund',          sub: 'Family tax balance & spending',         to: '/parent/tax-fund'     },
  { icon: Receipt,          label: 'Expenses Collected', sub: 'Reconcile rent, utilities & tax per child', to: '/parent/expenses' },
  { icon: Download,         label: 'Backup & Restore',  sub: 'Export / import family data',           to: '/parent/backup'       },
]

export default function More() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT</p>
        <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>More</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {items.map(({ icon: Icon, label, sub, to, soon }) => (
          <button key={to} onClick={() => navigate(to)}
            className="flex items-center gap-4 p-4 rounded-xl text-left w-full transition-all active:scale-95"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-raised)' }}>
              <Icon size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{sub}</p>
            </div>
            {soon && (
              <span className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                soon
              </span>
            )}
          </button>
        ))}

        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={logout}
            className="w-full py-3 rounded-xl text-sm font-mono transition-all active:scale-95"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
