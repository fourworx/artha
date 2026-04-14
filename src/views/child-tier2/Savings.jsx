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
  const { currentMember, refreshMember } = useAuth()
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

  const savings       = currentMember?.accounts?.savings ?? 0
  const interestRate  = family?.config?.interestRate ?? 0.02
  const autoSave      = family?.config?.autoSavePercent ?? 0.20
  const weeklyDeposit = Math.round((currentMember?.baseSalary ?? 0) * autoSave * 0.7) // rough estimate after deductions

  // History chart: savings deposited + interest per payslip
  const historyData = payslips.slice(-8).map(p => ({
    date: shortDate(p.periodEnd),
    savings: p.balancesAfter?.savings ?? 0,
  }))

  // Projection from current balance
  const projectionData = projectSavingsGrowth(savings, weeklyDeposit, interestRate, 8)
    .map(p => ({ week: `W+${p.week}`, balance: p.balance }))

  const totalInterestEarned = payslips.reduce((sum, p) => sum + (p.interestEarned ?? 0), 0)
  const lastPayslip = payslips[payslips.length - 1]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>MY SAVINGS</p>
        <p className="text-3xl font-mono font-bold mt-0.5" style={{ color: 'var(--accent-blue)' }}>
          {fmt(savings)}
        </p>
        <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
          {Math.round(interestRate * 100)}% interest/week · auto-save {Math.round(autoSave * 100)}% of net pay
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
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>LAST WEEK INTEREST</p>
            <p className="text-lg font-mono font-bold mt-1" style={{ color: 'var(--positive)' }}>
              {fmt(lastPayslip?.interestEarned ?? 0)}
            </p>
          </div>
        </div>

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
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>8-WEEK PROJECTION</p>
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
              Projected: {fmt(projectionData[projectionData.length - 1]?.balance ?? savings)} in 8 weeks
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
