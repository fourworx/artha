import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFamily } from '../../context/FamilyContext'
import { formatRupees } from '../../utils/currency'
import { isPayday, currentPeriodEnd, displayDate } from '../../utils/dates'
import { runPayslip } from '../../engine/payslip'

function RunPayslipButton({ child, onDone }) {
  const [running, setRunning] = useState(false)
  const [result, setResult]   = useState(null) // 'ok' | 'exists' | 'error'

  const handle = async () => {
    setRunning(true)
    setResult(null)
    try {
      await runPayslip(child.id)
      setResult('ok')
      onDone()
    } catch (e) {
      setResult(e.message.includes('already exists') ? 'exists' : 'error')
    } finally {
      setRunning(false)
    }
  }

  if (result === 'ok')     return <span className="text-xs font-mono" style={{ color: 'var(--positive)' }}>✓ Done</span>
  if (result === 'exists') return <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Already run</span>
  if (result === 'error')  return <span className="text-xs font-mono" style={{ color: 'var(--negative)' }}>Error</span>

  return (
    <button
      disabled={running}
      onClick={handle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all active:scale-95"
      style={{
        background: 'rgba(74,222,128,0.12)',
        border: '1px solid rgba(74,222,128,0.25)',
        color: 'var(--positive)',
      }}>
      <Play size={11} />
      {running ? 'Running...' : 'Run Payslip'}
    </button>
  )
}

export default function ParentDashboard() {
  const { currentMember } = useAuth()
  const { family, children, reload } = useFamily()
  const navigate = useNavigate()
  const payday = isPayday()
  const periodEnd = currentPeriodEnd()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT DASHBOARD</p>
          <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            {currentMember?.avatar} {currentMember?.name}
          </h2>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          Period ends {displayDate(periodEnd)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Payday banner */}
        {payday && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <AlertCircle size={14} style={{ color: 'var(--positive)', flexShrink: 0 }} />
            <p className="text-xs font-mono" style={{ color: 'var(--positive)' }}>
              It's payday! Run payslips for each child below.
            </p>
          </div>
        )}

        {/* Tax Fund */}
        {family && (
          <button onClick={() => navigate('/parent/tax-fund')}
            className="p-4 rounded-xl text-left w-full transition-all active:scale-95"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>FAMILY TAX FUND</p>
            <p className="text-2xl font-mono font-bold" style={{ color: 'var(--positive)' }}>
              {formatRupees(family.taxFundBalance)}
            </p>
          </button>
        )}

        {/* Children cards */}
        <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>CHILDREN</p>
        {children.map(child => (
          <div key={child.id} className="p-4 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{child.avatar}</span>
                <div>
                  <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {child.name}
                  </p>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    Tier {child.tier} · {formatRupees(child.baseSalary)}/wk
                  </p>
                </div>
              </div>
              <RunPayslipButton child={child} onDone={reload} />
            </div>

            {/* Balances */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'SPENDING', value: child.accounts?.spending  ?? 0, color: 'var(--positive)' },
                { label: 'SAVINGS',  value: child.accounts?.savings   ?? 0, color: 'var(--accent-blue)' },
                { label: 'GOAL JAR', value: child.accounts?.goalJar?.balance ?? 0, color: 'var(--warning)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-raised)' }}>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{label}</p>
                  <p className="text-sm font-mono font-semibold mt-0.5" style={{ color }}>{formatRupees(value)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
