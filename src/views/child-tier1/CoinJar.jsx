import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useFamily } from '../../context/FamilyContext'
import { getDueChoresForMember, buildLogMap } from '../../engine/chores'
import { getChoreLogsForDate, addChoreLog } from '../../db/operations'
import { today } from '../../utils/dates'

/* ─── Floating coin component ───────────────────────────────────────────────── */
function FloatingCoin({ style }) {
  return (
    <span
      className="absolute select-none pointer-events-none"
      style={{ fontSize: '1.4rem', ...style }}
    >
      🪙
    </span>
  )
}

const COINS = [
  { bottom: '10%', left: '15%', animDuration: '3.1s', animDelay: '0s' },
  { bottom: '25%', left: '55%', animDuration: '2.7s', animDelay: '0.4s' },
  { bottom: '40%', left: '25%', animDuration: '3.5s', animDelay: '0.8s' },
  { bottom: '15%', left: '65%', animDuration: '2.9s', animDelay: '1.2s' },
  { bottom: '55%', left: '40%', animDuration: '3.3s', animDelay: '0.2s' },
  { bottom: '30%', left: '75%', animDuration: '2.5s', animDelay: '1.6s' },
]

/* ─── Chore row for Tier 1 ───────────────────────────────────────────────────── */
function ChoreButton({ chore, log, onMark, marking }) {
  const status = log?.status ?? null
  const isMarking = marking === chore.id
  const canMark = !status || status === 'rejected'
  const icon = isMarking ? '🔄' : status === 'approved' ? '✅' : status === 'pending' ? '⏳' : '⭕'

  return (
    <button
      disabled={!canMark || isMarking}
      onClick={() => onMark(chore)}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-left transition-transform active:scale-[0.97]"
      style={{
        background: status === 'approved'
          ? 'rgba(74,222,128,0.18)'
          : status === 'pending'
          ? 'rgba(251,191,36,0.22)'
          : 'rgba(255,255,255,0.55)',
        border: `2px solid ${
          status === 'approved' ? 'rgba(74,222,128,0.35)' :
          status === 'pending'  ? 'rgba(251,191,36,0.45)' :
          'rgba(146,64,14,0.18)'
        }`,
        cursor: canMark && !isMarking ? 'pointer' : 'default',
      }}
    >
      <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{icon}</span>
      <span
        className="text-sm font-semibold flex-1"
        style={{
          color: '#92400e',
          fontFamily: 'system-ui, sans-serif',
          textDecoration: status === 'approved' ? 'line-through' : 'none',
          opacity: status === 'approved' ? 0.45 : 1,
        }}
      >
        {chore.title}
      </span>
      {canMark && !isMarking && (
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-xl"
          style={{
            background: 'rgba(251,191,36,0.35)',
            color: '#92400e',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Done!
        </span>
      )}
      {status === 'pending' && (
        <span className="text-xs" style={{ color: '#92400e', opacity: 0.5, fontFamily: 'system-ui' }}>
          waiting…
        </span>
      )}
    </button>
  )
}

export default function CoinJar() {
  const { currentMember, logout } = useAuth()
  const { chores: allChores }     = useFamily()
  const goalJar   = currentMember?.accounts?.goalJar
  const progress  = goalJar ? Math.min(goalJar.balance / goalJar.target, 1) : 0
  const [displayProgress, setDisplayProgress] = useState(0)
  const [showCelebration, setShowCelebration]  = useState(false)
  const prevProgress = useRef(0)

  // Chore state
  const dateStr  = today()
  const dueChores = getDueChoresForMember(allChores, currentMember?.id ?? '')
  const [logMap,  setLogMap]  = useState({})
  const [marking, setMarking] = useState(null)

  const loadLogs = useCallback(async () => {
    if (!currentMember) return
    const logs = await getChoreLogsForDate(currentMember.id, dateStr)
    setLogMap(buildLogMap(logs))
  }, [currentMember, dateStr])

  useEffect(() => { loadLogs() }, [loadLogs])

  const handleMark = async (chore) => {
    const log = logMap[chore.id]
    if (log && log.status !== 'rejected') return
    setMarking(chore.id)
    await addChoreLog({ choreId: chore.id, memberId: currentMember.id, date: dateStr })
    await loadLogs()
    setMarking(null)
  }

  // Animate fill on mount + when progress changes
  useEffect(() => {
    const timer = setTimeout(() => setDisplayProgress(progress), 120)
    if (progress >= 1 && prevProgress.current < 1) {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 2800)
    }
    prevProgress.current = progress
    return () => clearTimeout(timer)
  }, [progress])

  const visibleCoins = Math.ceil(displayProgress * COINS.length)
  const milestones   = [0.25, 0.5, 0.75, 1.0]

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #fef9f0 0%, #fde68a 60%, #fbbf24 100%)' }}
    >
      {/* ── Main visual area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-between py-6 px-6 relative overflow-hidden min-h-0">
        {/* Celebration burst */}
        {showCelebration && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ animation: 'fadeInOut 2.8s ease forwards' }}
          >
            <div className="text-8xl" style={{ animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
              🎉
            </div>
          </div>
        )}

        {/* Goal name + emoji */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div
            className="text-6xl transition-all duration-500"
            style={{
              filter: progress >= 1 ? 'drop-shadow(0 0 16px #fbbf24)' : 'none',
              transform: progress >= 1 ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            {progress >= 1 ? '🌟' : '🏠'}
          </div>
          <p
            className="text-sm font-semibold tracking-wide"
            style={{ color: '#92400e', opacity: 0.8, fontFamily: 'system-ui, sans-serif' }}
          >
            {goalJar?.name ?? 'My Goal'}
          </p>
        </div>

        {/* Jar + milestones */}
        <div className="relative flex items-center justify-center w-full" style={{ height: 280 }}>
          {/* Left milestone stars */}
          <div className="absolute flex flex-col gap-5 items-center" style={{ left: 0, top: '50%', transform: 'translateY(-50%)' }}>
            {[1.0, 0.75].map((m) => (
              <div
                key={m}
                className="transition-all duration-700"
                style={{
                  fontSize: displayProgress >= m ? '1.8rem' : '1.3rem',
                  opacity: displayProgress >= m ? 1 : 0.2,
                  filter: displayProgress >= m ? 'drop-shadow(0 0 6px #fbbf24)' : 'none',
                }}
              >
                ⭐
              </div>
            ))}
          </div>

          {/* Right milestone stars */}
          <div className="absolute flex flex-col gap-5 items-center" style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}>
            {[0.5, 0.25].map((m) => (
              <div
                key={m}
                className="transition-all duration-700"
                style={{
                  fontSize: displayProgress >= m ? '1.8rem' : '1.3rem',
                  opacity: displayProgress >= m ? 1 : 0.2,
                  filter: displayProgress >= m ? 'drop-shadow(0 0 6px #fbbf24)' : 'none',
                }}
              >
                ⭐
              </div>
            ))}
          </div>

          {/* Glass jar */}
          <div
            className="relative overflow-hidden"
            style={{
              width: 150,
              height: 220,
              borderRadius: '12px 12px 24px 24px',
              background: 'rgba(255,255,255,0.35)',
              border: '3px solid rgba(251,191,36,0.7)',
              boxShadow:
                'inset 2px 0 12px rgba(255,255,255,0.5), inset -2px 0 8px rgba(0,0,0,0.06), 0 8px 32px rgba(251,191,36,0.25)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {/* Empty state hint */}
            {displayProgress === 0 && (
              <div
                className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none"
                style={{ opacity: 0.25 }}
              >
                <span style={{ fontSize: '2rem' }}>🪙</span>
              </div>
            )}

            {/* Liquid fill */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: `${displayProgress * 100}%`,
                background: 'linear-gradient(180deg, #fb923c 0%, #f59e0b 60%, #d97706 100%)',
                transition: 'height 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '0 0 20px 20px',
              }}
            >
              {/* Wave on surface */}
              {displayProgress > 0.03 && (
                <div
                  className="absolute top-0 left-0 right-0"
                  style={{ height: 12, overflow: 'hidden', transform: 'translateY(-8px)' }}
                >
                  <svg viewBox="0 0 200 12" preserveAspectRatio="none" style={{ width: '200%', height: '100%', animation: 'wave 2s linear infinite' }}>
                    <path
                      d="M0 6 C20 0, 40 12, 60 6 C80 0, 100 12, 120 6 C140 0, 160 12, 180 6 C200 0, 220 12, 240 6 L240 12 L0 12 Z"
                      fill="#fb923c"
                    />
                  </svg>
                </div>
              )}

              {/* Floating coins in liquid */}
              {COINS.slice(0, visibleCoins).map((c, i) => (
                <FloatingCoin
                  key={i}
                  style={{
                    bottom: c.bottom,
                    left: c.left,
                    animation: `floatCoin ${c.animDuration} ease-in-out ${c.animDelay} infinite`,
                    opacity: 0.9,
                  }}
                />
              ))}
            </div>

            {/* Glass shine overlay */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: 10,
                width: 18,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)',
                borderRadius: 8,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: 8, left: 16, right: 40, height: 6,
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 3,
              }}
            />
          </div>

          {/* Jar lid */}
          <div
            className="absolute"
            style={{
              width: 162,
              height: 18,
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(180deg, #fde68a, #f59e0b)',
              border: '2.5px solid rgba(251,191,36,0.8)',
              borderRadius: '10px 10px 4px 4px',
              boxShadow: '0 -2px 8px rgba(251,191,36,0.3)',
            }}
          />
        </div>

        {/* Progress dots + message */}
        <div className="flex flex-col items-center gap-3 z-10">
          <div className="flex gap-3 items-center">
            {milestones.map((m, i) => (
              <div
                key={i}
                className="transition-all duration-500"
                style={{
                  width: displayProgress >= m ? 14 : 10,
                  height: displayProgress >= m ? 14 : 10,
                  borderRadius: '50%',
                  background: displayProgress >= m
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : 'rgba(0,0,0,0.12)',
                  border: displayProgress >= m ? '2px solid #d97706' : '2px solid rgba(0,0,0,0.1)',
                  boxShadow: displayProgress >= m ? '0 0 8px rgba(251,191,36,0.6)' : 'none',
                }}
              />
            ))}
          </div>
          <p
            className="text-xs text-center"
            style={{ color: '#92400e', opacity: 0.65, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}
          >
            {displayProgress >= 1
              ? 'Goal reached! 🎉'
              : displayProgress >= 0.75
              ? 'Almost there! 🚀'
              : displayProgress >= 0.5
              ? 'Halfway! Keep going 💪'
              : displayProgress >= 0.25
              ? 'Great start! ⭐'
              : 'Every coin counts! 🪙'}
          </p>
          {/* Star milestone tracker — no numbers, just visual progress */}
          <div className="flex items-center gap-1" style={{ opacity: 0.6 }}>
            {milestones.map((m, i) => (
              <span
                key={i}
                style={{
                  fontSize: '0.85rem',
                  filter: displayProgress >= m ? 'none' : 'grayscale(1)',
                  opacity: displayProgress >= m ? 1 : 0.3,
                  transition: 'all 0.5s',
                }}
              >
                ⭐
              </span>
            ))}
          </div>
        </div>

        {/* Logout — barely visible */}
        <button
          onClick={logout}
          className="absolute bottom-3 right-4 text-xs"
          style={{ color: '#92400e', opacity: 0.15, fontFamily: 'system-ui, sans-serif' }}
        >
          exit
        </button>
      </div>

      {/* ── Chore strip ──────────────────────────────────────────────────── */}
      {dueChores.length > 0 && (
        <div
          className="shrink-0 px-4 pb-5 pt-3 flex flex-col gap-2"
          style={{ borderTop: '1.5px solid rgba(146,64,14,0.12)' }}
        >
          <p
            className="text-xs text-center font-semibold"
            style={{ color: '#92400e', opacity: 0.45, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.05em' }}
          >
            TODAY'S TASKS
          </p>
          {dueChores.map(chore => (
            <ChoreButton
              key={chore.id}
              chore={chore}
              log={logMap[chore.id]}
              onMark={handleMark}
              marking={marking}
            />
          ))}
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes floatCoin {
          0%, 100% { transform: translateY(0px) rotate(-8deg); }
          50% { transform: translateY(-10px) rotate(8deg); }
        }
        @keyframes wave {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.5); }
          20% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes pop {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
