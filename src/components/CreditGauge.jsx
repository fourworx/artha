// SVG arc gauge — 180° semicircle, score 300–850
export default function CreditGauge({ score = 500 }) {
  const W  = 180, H = 110
  const cx = W / 2, cy = 92   // arc centre (below SVG mid so number sits inside arc)
  const r  = 70
  const sw = 14

  const pct   = Math.max(0, Math.min(1, (score - 300) / 550))
  const angle = Math.PI * (1 - pct)               // π → 0 as score goes 300 → 850
  const px    = cx + r * Math.cos(angle)
  const py    = cy - r * Math.sin(angle)           // SVG y is inverted
  const large = pct >= 0.5 ? 1 : 0

  // Paths
  const bgArc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`
  const fgArc = pct <= 0
    ? null
    : pct >= 0.999
    ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${(cx + r - 0.01).toFixed(2)} ${cy}`
    : `M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 0 ${px.toFixed(2)} ${py.toFixed(2)}`

  const color = score >= 750 ? '#4ade80'
    : score >= 650 ? '#86efac'
    : score >= 500 ? '#fbbf24'
    : score >= 350 ? '#f97316'
    : '#ef4444'

  const band = score >= 750 ? 'EXCELLENT'
    : score >= 650 ? 'GOOD'
    : score >= 500 ? 'FAIR'
    : score >= 350 ? 'POOR'
    : 'BAD CREDIT'

  // Small tick marks at zone boundaries: 350, 500, 650, 750
  const ticks = [350, 500, 650, 750].map(s => {
    const p = (s - 300) / 550
    const a = Math.PI * (1 - p)
    const x1 = cx + (r - sw / 2 - 1) * Math.cos(a)
    const y1 = cy - (r - sw / 2 - 1) * Math.sin(a)
    const x2 = cx + (r + sw / 2 + 1) * Math.cos(a)
    const y2 = cy - (r + sw / 2 + 1) * Math.sin(a)
    return { x1, y1, x2, y2 }
  })

  return (
    <div className="flex flex-col items-center">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Background arc */}
        <path d={bgArc} stroke="var(--border)" strokeWidth={sw} fill="none" strokeLinecap="butt" />

        {/* Filled score arc */}
        {fgArc && (
          <path d={fgArc} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="butt" />
        )}

        {/* Zone boundary ticks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="var(--bg-raised)" strokeWidth={2} />
        ))}

        {/* Score number */}
        <text x={cx} y={cy - 18} textAnchor="middle"
          fontSize="28" fontWeight="bold" fontFamily="monospace"
          fill={color}>
          {score}
        </text>

        {/* Band label */}
        <text x={cx} y={cy - 2} textAnchor="middle"
          fontSize="9" fontFamily="monospace" letterSpacing="1.5"
          fill="var(--text-muted)">
          {band}
        </text>

        {/* Score range labels */}
        <text x={cx - r - 4} y={cy + 14} textAnchor="middle"
          fontSize="8" fontFamily="monospace" fill="var(--text-dim)">300</text>
        <text x={cx + r + 4} y={cy + 14} textAnchor="middle"
          fontSize="8" fontFamily="monospace" fill="var(--text-dim)">850</text>
      </svg>
      <p style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace', letterSpacing: '1.5px', marginTop: '-6px' }}>
        CREDIT REPORT CARD
      </p>
    </div>
  )
}
