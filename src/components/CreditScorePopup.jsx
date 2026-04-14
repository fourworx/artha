import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// ── Score band config ─────────────────────────────────────────────────────────
function getBand(score) {
  if (score >= 750) return {
    label: 'EXCELLENT',
    color: 'var(--positive)',
    bg:    'rgba(74,222,128,0.1)',
    border:'rgba(74,222,128,0.25)',
    message: 'Your credit is excellent! You qualify for interest-free loans and lower rent.',
  }
  if (score >= 650) return {
    label: 'GOOD',
    color: 'var(--accent-blue)',
    bg:    'rgba(96,165,250,0.1)',
    border:'rgba(96,165,250,0.25)',
    message: 'Your credit is good. You get standard rates — keep it up!',
  }
  if (score >= 500) return {
    label: 'FAIR',
    color: 'var(--warning)',
    bg:    'rgba(251,191,36,0.1)',
    border:'rgba(251,191,36,0.25)',
    message: 'Your credit is fair. Complete chores consistently to improve it.',
  }
  if (score >= 350) return {
    label: 'POOR',
    color: '#fb923c',
    bg:    'rgba(251,146,60,0.1)',
    border:'rgba(251,146,60,0.25)',
    message: 'Your credit is poor. Loan interest rates may be higher and penalties stricter.',
  }
  return {
    label: 'BAD',
    color: 'var(--negative)',
    bg:    'rgba(248,113,113,0.1)',
    border:'rgba(248,113,113,0.25)',
    message: 'Your credit needs work. Focus on completing every chore to recover.',
  }
}

function getTip(score) {
  if (score >= 750) return 'Keep completing all chores every day to maintain your excellent score.'
  if (score >= 650) return 'Complete all chores this week for +10 points on your next payslip.'
  if (score >= 500) return 'Build a daily streak — 7 days in a row gives +10% salary bonus too!'
  if (score >= 350) return 'Complete every chore and avoid missing loan repayments to recover.'
  return 'Even completing a few chores each day will start moving your score up.'
}

// ── Gauge arc (SVG) ───────────────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const MIN = 300, MAX = 850
  const pct = (score - MIN) / (MAX - MIN)

  // Arc: 210° sweep, starting at 195° from 3-o'clock
  const cx = 60, cy = 60, r = 48
  const startAngle = 195
  const sweepAngle = 150
  const toRad = d => (d * Math.PI) / 180
  const pt = (angle) => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  })

  const trackStart = pt(startAngle)
  const trackEnd   = pt(startAngle + sweepAngle)
  const fillEnd    = pt(startAngle + sweepAngle * pct)

  const arc = (from, to, large) => {
    const s = pt(from), e = pt(to)
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large ? 1 : 0} 1 ${e.x} ${e.y}`
  }

  const band = getBand(score)

  // Animated number
  const numRef = useRef(null)
  useEffect(() => {
    if (!numRef.current) return
    let start = null
    const from = MIN
    const duration = 900
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      if (numRef.current) numRef.current.textContent = Math.round(from + (score - from) * eased)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [score])

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="80" viewBox="0 0 120 80">
        {/* Track */}
        <path d={arc(startAngle, startAngle + sweepAngle, sweepAngle > 180)}
          fill="none" stroke="var(--bg-raised)" strokeWidth="10" strokeLinecap="round" />
        {/* Fill */}
        {pct > 0 && (
          <path d={arc(startAngle, startAngle + sweepAngle * pct, sweepAngle * pct > 180)}
            fill="none" stroke={band.color} strokeWidth="10" strokeLinecap="round" />
        )}
      </svg>
      {/* Score number overlaid */}
      <div className="flex flex-col items-center" style={{ marginTop: -48 }}>
        <span ref={numRef} className="text-4xl font-mono font-bold" style={{ color: band.color }}>
          {MIN}
        </span>
        <span className="text-xs font-mono font-semibold tracking-widest mt-0.5"
          style={{ color: band.color }}>
          {band.label}
        </span>
      </div>
      {/* Range labels */}
      <div className="flex justify-between w-28 mt-1">
        <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>300</span>
        <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>850</span>
      </div>
    </div>
  )
}

// ── Main popup ────────────────────────────────────────────────────────────────
export default function CreditScorePopup({ score, prevScore, onDismiss }) {
  const band  = getBand(score)
  const tip   = getTip(score)
  const delta = prevScore != null ? score - prevScore : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div className="rounded-t-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Handle + close */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-bright)' }} />
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            YOUR CREDIT SCORE
          </span>
          <button onClick={onDismiss} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pb-6 flex flex-col gap-4">

          {/* Gauge */}
          <div className="flex flex-col items-center py-2">
            <ScoreGauge score={score} />
          </div>

          {/* Delta chip */}
          {delta !== null && delta !== 0 && (
            <div className="flex justify-center">
              <span className="text-sm font-mono font-semibold px-4 py-1.5 rounded-full"
                style={{
                  background: delta > 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                  color:      delta > 0 ? 'var(--positive)' : 'var(--negative)',
                  border:     `1px solid ${delta > 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                }}>
                {delta > 0 ? `+${delta} ▲ this period` : `${delta} ▼ this period`}
              </span>
            </div>
          )}
          {delta === 0 && (
            <p className="text-xs font-mono text-center" style={{ color: 'var(--text-muted)' }}>
              No change this period
            </p>
          )}

          {/* Band message */}
          <div className="px-4 py-3 rounded-xl flex flex-col gap-1"
            style={{ background: band.bg, border: `1px solid ${band.border}` }}>
            <p className="text-xs font-mono font-semibold" style={{ color: band.color }}>
              {band.label} CREDIT
            </p>
            <p className="text-sm font-mono leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {band.message}
            </p>
          </div>

          {/* What affects your score */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              HOW TO IMPROVE
            </p>
            {[
              { icon: '✅', text: 'All chores approved this payslip: +10' },
              { icon: '🔥', text: 'Each mandatory chore approved: +2' },
              { icon: '💸', text: 'Early loan repayment: +5 to +20' },
              { icon: '❌', text: 'Chore rejected: −5' },
              { icon: '⚠️', text: 'Less than 50% chores: −10' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>TIP</p>
            <p className="text-xs font-mono mt-0.5 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {tip}
            </p>
          </div>

          {/* Dismiss */}
          <button onClick={onDismiss}
            className="w-full py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
            style={{ background: band.bg, border: `1px solid ${band.border}`, color: band.color }}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}
