import { displayDateFull } from '../utils/dates'
import { useCurrency } from '../context/FamilyContext'

// ── Terminal primitives ───────────────────────────────────────────────────────

const DIVIDER = '─'.repeat(36)

function Row({ label, value, dim, bold, positive, negative, indent }) {
  return (
    <div className="flex items-baseline justify-between" style={{ paddingLeft: indent ? '1rem' : 0 }}>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        color: dim ? 'var(--text-dim)' : 'var(--text-muted)',
        flex: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: bold ? '14px' : '12px',
        fontWeight: bold ? 700 : 400,
        color: positive ? 'var(--positive)'
             : negative ? 'var(--negative)'
             : bold     ? 'var(--text-primary)'
             : 'var(--text-muted)',
        minWidth: '70px',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  )
}

function Divider({ char = '─' }) {
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: 'var(--text-dim)',
      letterSpacing: '0',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    }}>
      {char.repeat(40)}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      letterSpacing: '0.12em',
      color: 'var(--text-muted)',
    }}>
      {children}
    </span>
  )
}

/** Terminal-style progress bar: [████████░░░░] 82% */
function TermBar({ value, max = 1, width = 16 }) {
  const ratio  = Math.min(Math.max(value / max, 0), 1)
  const filled = Math.round(ratio * width)
  const empty  = width - filled
  const pct    = Math.round(ratio * 100)
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: pct >= 80 ? 'var(--positive)' : pct >= 50 ? 'var(--warning)' : 'var(--negative)',
    }}>
      {'█'.repeat(filled)}
      <span style={{ color: 'var(--text-dim)', opacity: 0.5 }}>{'░'.repeat(empty)}</span>
      {' '}{pct}%
    </span>
  )
}

// ── Main PayslipCard ──────────────────────────────────────────────────────────

export default function PayslipCard({ payslip, member, familyName }) {
  const fmtCurr = useCurrency()
  const fmt = (n) => {
    if (n == null) return fmtCurr(0, { forceDecimals: true })
    return (n < 0 ? '−' : '') + fmtCurr(Math.abs(n), { forceDecimals: true })
  }
  if (!payslip) return null
  const { earnings, deductions, gross, totalDeductions, net, allocations, interestEarned } = payslip

  return (
    <div style={{
      background: 'var(--bg-base)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Header */}
      <div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--text-dim)' }}>
          ARTHA PAYROLL SYSTEM
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
          {member?.name ?? '—'} · Tier {member?.tier}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {displayDateFull(payslip.periodStart)} – {displayDateFull(payslip.periodEnd)}
        </div>
      </div>

      <Divider />

      {/* Earnings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <SectionLabel>EARNINGS</SectionLabel>
        <Row label="Base Salary"      value={fmt(earnings.baseSalary)} />
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--text-muted)' }}>
            Chore Completion
          </span>
          <TermBar value={earnings.mandatoryCompletionPercent} max={1} width={14} />
        </div>
        <Row label="Adjusted Salary"  value={fmt(earnings.adjustedSalary)} positive={earnings.adjustedSalary > 0} />
        {earnings.streakBonus > 0 && (
          <Row
            label={`🔥 Streak bonus (${earnings.streakDays}d · +${Math.round(earnings.streakBonusPct * 100)}%)`}
            value={fmt(earnings.streakBonus)} positive indent />
        )}
        {earnings.bonusItems?.map((b, i) => (
          <Row key={i} label={`+ ${b.title}`} value={fmt(b.total)} positive indent />
        ))}
        {earnings.totalBonus > 0 && (
          <Row label="Total Bonus" value={fmt(earnings.totalBonus)} positive />
        )}
        <Divider char="·" />
        <Row label="GROSS" value={fmt(gross)} bold positive={gross > 0} />
      </div>

      <Divider />

      {/* Deductions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <SectionLabel>DEDUCTIONS</SectionLabel>
        <Row label={`Tax (${Math.round((deductions.tax / (gross || 1)) * 100)}%)`} value={fmt(-deductions.tax)} negative={deductions.tax > 0} />
        <Row label="Rent"             value={fmt(-deductions.rent)} negative={deductions.rent > 0} />
        {deductions.utilities?.map((u, i) => (
          <Row key={i} label={u.reason} value={fmt(-u.amount)} negative indent />
        ))}
        {deductions.loanInterest > 0 && (
          <Row label="Loan Interest (→ balance)" value={`+${fmt(deductions.loanInterest)}`} dim indent />
        )}
        {deductions.loanRepayment > 0 && (
          <Row label="Loan Repayment" value={fmt(-deductions.loanRepayment)} negative />
        )}
        <Divider char="·" />
        <Row label="TOTAL DEDUCTIONS" value={fmt(-totalDeductions)} bold negative={totalDeductions > 0} />
      </div>

      <Divider />

      {/* Net pay */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: 'JetBrains Mono', fontSize: '11px', letterSpacing: '0.12em', color: 'var(--text-muted)',
          }}>
            NET PAY
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono', fontSize: '24px', fontWeight: 700,
            color: net > 0 ? 'var(--positive)' : 'var(--negative)',
          }}>
            {fmt(net)}
          </span>
        </div>
      </div>

      <Divider />

      {/* Allocations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <SectionLabel>ALLOCATIONS</SectionLabel>
        <Row label={`→ Savings (${Math.round((allocations.savings / (net || 1)) * 100)}%)`} value={fmt(allocations.savings)} positive={allocations.savings > 0} />
        <Row label="→ Spending Wallet" value={fmt(allocations.spending)} positive={allocations.spending > 0} />
        {interestEarned > 0 && (
          <Row label="+ Interest on savings" value={fmt(interestEarned)} positive />
        )}
      </div>

      {/* Footer */}
      <Divider />
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center' }}>
        Generated {new Date(payslip.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}
