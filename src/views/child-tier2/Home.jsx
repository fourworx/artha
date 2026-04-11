import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFamily } from '../../context/FamilyContext'
import { formatRupees } from '../../utils/currency'
import { displayDate, today } from '../../utils/dates'
import { ChevronRight } from 'lucide-react'

export default function Tier2Home() {
  const { currentMember } = useAuth()
  const { family } = useFamily()
  const navigate = useNavigate()
  const accounts = currentMember?.accounts ?? {}
  const goalJar  = accounts.goalJar
  const goalProgress = goalJar?.target > 0
    ? Math.min(goalJar.balance / goalJar.target, 1)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {displayDate(today()).toUpperCase()}
        </p>
        <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          {currentMember?.avatar} {currentMember?.name}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* Spending wallet — hero card */}
        <button onClick={() => navigate('/child/history')}
          className="w-full p-4 rounded-xl text-left transition-all active:scale-95"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SPENDING WALLET</p>
          <p className="text-4xl font-mono font-bold mt-1" style={{ color: 'var(--positive)' }}>
            {formatRupees(accounts.spending ?? 0)}
          </p>
          <p className="text-xs font-mono mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            View history <ChevronRight size={12} />
          </p>
        </button>

        {/* Savings + Goal row */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/child/savings')}
            className="p-4 rounded-xl text-left transition-all active:scale-95"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SAVINGS</p>
            <p className="text-2xl font-mono font-bold mt-1" style={{ color: 'var(--accent-blue)' }}>
              {formatRupees(accounts.savings ?? 0)}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              {Math.round((family?.config?.interestRate ?? 0.02) * 100)}%/wk interest
            </p>
          </button>

          <button onClick={() => navigate('/child/goal')}
            className="p-4 rounded-xl text-left transition-all active:scale-95"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>GOAL JAR</p>
            <p className="text-2xl font-mono font-bold mt-1" style={{ color: 'var(--warning)' }}>
              {formatRupees(goalJar?.balance ?? 0)}
            </p>
            {goalJar && (
              <>
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
                  <div className="h-full rounded-full" style={{ width: `${goalProgress * 100}%`, background: 'var(--warning)' }} />
                </div>
                <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                  {Math.round(goalProgress * 100)}% of {formatRupees(goalJar.target)}
                </p>
              </>
            )}
          </button>
        </div>

        {/* Quick actions */}
        <p className="text-xs font-mono px-1 mt-1" style={{ color: 'var(--text-muted)' }}>QUICK ACCESS</p>
        {[
          { label: 'Today\'s Chores', sub: 'Mark tasks done, earn bonuses', to: '/child/chores' },
          { label: 'Reward Store',   sub: 'Spend your wallet',            to: '/child/rewards' },
          { label: 'Payslip',        sub: 'See this week\'s earnings',     to: '/child/payslip' },
        ].map(({ label, sub, to }) => (
          <button key={to} onClick={() => navigate(to)}
            className="flex items-center justify-between px-4 py-3 rounded-xl w-full transition-all active:scale-95"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="text-left">
              <p className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{label}</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{sub}</p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
          </button>
        ))}
      </div>
    </div>
  )
}
