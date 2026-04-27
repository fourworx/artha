import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { useFamily, useCurrency } from '../../context/FamilyContext'
import { getPayslips } from '../../db/operations'
import { shortDate } from '../../utils/dates'
import { projectSavingsGrowth } from '../../engine/interest'

const CustomTooltip = ({ active, payload }) => {
  const fmt = useCurrency()
  if (!active || !payload?.length) return null
  return (
    <div className="px-2 py-1.5 rounded text-xs font-mono"
      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      {fmt(payload[0].value)}
    </div>
  )
}

export default function Savings() {
  const { currentMember } = useAuth()
  const { family } = useFamily()
  const fmt = useCurrency()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!currentMember) return
    getPayslips(currentMember.id).then(p => {
      setPayslips(p)
      setLoading(false)
    })
  }, [currentMember])

  const accounts      = currentMember?.accounts ?? {}
  const savings       = accounts.savings ?? 0
  const subGoals      = accounts.subGoals ?? []
  const subGoalTotal  = subGoals.reduce((s, g) => s + (g.balance ?? 0), 0)
  const totalSavings  = savings + subGoalTotal

  const interestRate  = (currentMember?.config?.interestRate ?? family?.config?.interestRate) ?? 0.02
  const autoSave      = family?.config?.autoSavePercent ?? 0.20
  const weeklyDeposit = Math.round((currentMember?.baseSalary ?? 0) * autoSave * 0.7)

  // History chart: total savings (savings account + sub-goals) per payslip
  const settledPayslips = payslips
    .filter(p => p.status === 'settled')
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))

  const historyData = [
    ...settledPayslips.slice(-7).map(p => {
      const b = p.balancesAfter ?? {}
      const goalsTotal = (b.subGoals ?? []).reduce((s, g) => s + (g.balance ?? 0), 0)
      return {
        date: shortDate(p.periodEnd),
        savings: (b.savings ?? 0) + goalsTotal,
      }
    }),
    // Always append the current live balance as the final point
    { date: 'Now', savings: totalSavings },
  ]

  // Projection from totalSavings as base
  const projectionData = projectSavingsGrowth(totalSavings, weeklyDeposit, interestRate, 8)
    .map(p => ({ week: `W+${p.week}`, balance: p.balance }))

  const totalInterestEarned = payslips.reduce((sum, p) => {
    return sum + (p.interestEarned ?? 0) + (p.subGoalInterestEarned ?? 0)
  }, 0)
  const lastPayslip = settledPayslips[settledPayslips.length - 1]
  const lastInterest = (lastPayslip?.interestEarned ?? 0) + (lastPayslip?.subGoalInterestEarned ?? 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>MY SAVINGS</p>
        <p className="text-3xl font-mono font-bold mt-0.5" style={{ color: 'var(--accent-blue)' }}>
          {fmt(totalSavings)}
        </p>
        {subGoals.length > 0 && (
          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-dim)' }}>
            {fmt(savings)} account + {fmt(subGoalTotal)} in {subGoals.length} goal{subGoals.length > 1 ? 's' : ''}
          </p>
        )}
        <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
          {+(interestRate * 100).toFixed(2)}% interest/period · auto-save {+(autoSave * 100).toFixed(2)}% of net pay
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>INTEREST EARNED (total)</p>
            <p className="text-lg font-mono font-bold mt-1" style={{ color: 'var(--positive)' }}>
              {fmt(totalInterestEarned)}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>LAST PERIOD INTEREST</p>
            <p className="text-lg font-mono font-bold mt-1" style={{ color: 'var(--positive)' }}>
              {fmt(lastInterest)}
            </p>
          </div>
        </div>

        {/* Sub-goals breakdown */}
        {subGoals.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SAVINGS GOALS</p>
            <div className="flex flex-col gap-2">
              {subGoals.map(g => {
                const pct = g.target > 0 ? Math.min(100, Math.round((g.balance / g.target) * 100)) : 0
                return (
                  <div key={g.id} className="p-3 rounded-xl flex flex-col gap-2"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {g.name}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-mono font-bold" style={{ color: '#818cf8' }}>
                        {fmt(g.balance)}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                        / {fmt(g.target)} target
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full rounded-full" style={{ height: 4, background: 'var(--bg-raised)' }}>
                      <div className="rounded-full" style={{
                        height: 4,
                        width: `${pct}%`,
                        background: pct >= 100 ? 'var(--positive)' : '#818cf8',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    {pct >= 100 && (
                      <p className="text-xs font-mono" style={{ color: 'var(--positive)' }}>
                        🎉 Goal reached! You can now withdraw.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main savings account balance (when sub-goals exist, show separately) */}
        {subGoals.length > 0 && (
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SAVINGS ACCOUNT</p>
            <p className="text-lg font-mono font-bold mt-1" style={{ color: '#60a5fa' }}>{fmt(savings)}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-dim)' }}>
              Interest earned on this + all sub-goals
            </p>
          </div>
        )}

        {/* Savings history chart */}
        {historyData.length > 1 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SAVINGS HISTORY</p>
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={historyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4a7fa5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4a7fa5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-dim)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-dim)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="savings" stroke="#4a7fa5" strokeWidth={2} fill="url(#savingsGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Projection chart */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>8-PERIOD PROJECTION</p>
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={projectionData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3d7a5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3d7a5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'var(--text-dim)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-dim)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="balance" stroke="#3d7a5e" strokeWidth={2} fill="url(#projGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-xs font-mono mt-1 text-center" style={{ color: 'var(--text-dim)' }}>
              Projected: {fmt(projectionData[projectionData.length - 1]?.balance ?? totalSavings)} in 8 periods
            </p>
          </div>
        </div>

        {loading && (
          <p className="text-xs font-mono text-center" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        )}
        {!loading && payslips.length === 0 && (
          <p className="text-xs font-mono text-center py-4" style={{ color: 'var(--text-muted)' }}>
            History appears after your first payslip
          </p>
        )}
      </div>
    </div>
  )
}
