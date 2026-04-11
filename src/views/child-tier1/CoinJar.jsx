import { useAuth } from '../../context/AuthContext'
import { LogOut } from 'lucide-react'

/**
 * Tier 1 — Piggy Bank view.
 * No numbers, no text-heavy UI. Just a coin jar filling toward a goal.
 * Uses warm/playful palette, NOT terminal theme.
 */
export default function CoinJar() {
  const { currentMember, logout } = useAuth()
  const goalJar = currentMember?.accounts?.goalJar
  const progress = goalJar ? Math.min(goalJar.balance / goalJar.target, 1) : 0

  return (
    <div
      className="flex flex-col items-center justify-between h-full py-10 px-6"
      style={{ background: 'var(--t1-bg)', color: 'var(--t1-text)' }}
    >
      {/* Goal image / emoji at top */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-7xl">🏠</span>
        <p className="text-sm font-sans font-medium opacity-60">
          {goalJar?.name ?? 'My Goal'}
        </p>
      </div>

      {/* Coin jar */}
      <div className="flex flex-col items-center gap-4 w-full">
        <div
          className="relative w-48 h-64 rounded-3xl overflow-hidden mx-auto"
          style={{ border: '3px solid var(--t1-accent)', background: '#fff8e7' }}
        >
          {/* Fill */}
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
            style={{
              height: `${progress * 100}%`,
              background: 'linear-gradient(180deg, var(--t1-secondary) 0%, var(--t1-accent) 100%)',
              opacity: 0.85,
            }}
          />
          {/* Coin stack emoji decoration */}
          {progress > 0 && (
            <div
              className="absolute left-0 right-0 flex justify-center text-3xl"
              style={{ bottom: `${progress * 100}%`, transform: 'translateY(50%)' }}
            >
              🪙
            </div>
          )}
        </div>

        {/* Simple progress dots */}
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-all"
              style={{
                background: i < Math.ceil(progress * 5) ? 'var(--t1-accent)' : '#e5e7eb',
              }}
            />
          ))}
        </div>
      </div>

      {/* Logout (subtle, for parents only in practice) */}
      <button
        onClick={logout}
        className="flex items-center gap-1 text-xs opacity-30"
        style={{ color: 'var(--t1-text)' }}
      >
        <LogOut size={12} />
        <span>exit</span>
      </button>
    </div>
  )
}
