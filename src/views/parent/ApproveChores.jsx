import { useState, useEffect, useCallback } from 'react'
import { Check, X, RefreshCw } from 'lucide-react'
import { useFamily } from '../../context/FamilyContext'
import { getPendingLogsForMembers, approveChoreLog, rejectChoreLog } from '../../db/operations'
import { displayDate } from '../../utils/dates'

export default function ApproveChores() {
  const { children, chores } = useFamily()
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(null) // log id being acted on

  const choreMap  = Object.fromEntries(chores.map(c => [c.id, c]))
  const memberMap = Object.fromEntries(children.map(m => [m.id, m]))

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const ids = children.map(c => c.id)
    const pending = await getPendingLogsForMembers(ids)
    // Sort newest first
    pending.sort((a, b) => b.completedAt - a.completedAt)
    setLogs(pending)
    setLoading(false)
  }, [children])

  useEffect(() => { loadLogs() }, [loadLogs])

  const handleApprove = async (log) => {
    setActing(log.id)
    await approveChoreLog(log.id)
    setLogs(prev => prev.filter(l => l.id !== log.id))
    setActing(null)
  }

  const handleReject = async (log) => {
    setActing(log.id)
    await rejectChoreLog(log.id)
    setLogs(prev => prev.filter(l => l.id !== log.id))
    setActing(null)
  }

  // Group by member
  const grouped = children.reduce((acc, child) => {
    const childLogs = logs.filter(l => l.memberId === child.id)
    if (childLogs.length > 0) acc.push({ member: child, logs: childLogs })
    return acc
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT</p>
          <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            Approve Chores
            {logs.length > 0 && (
              <span className="ml-2 text-sm font-mono px-2 py-0.5 rounded-full"
                style={{ background: 'var(--negative)', color: '#fff', fontSize: '12px' }}>
                {logs.length}
              </span>
            )}
          </h2>
        </div>
        <button onClick={loadLogs} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {loading && (
          <p className="text-xs font-mono text-center py-8" style={{ color: 'var(--text-muted)' }}>
            Loading...
          </p>
        )}

        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-4xl">✅</span>
            <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
              All caught up — nothing to approve
            </p>
          </div>
        )}

        {grouped.map(({ member, logs: memberLogs }) => (
          <div key={member.id} className="flex flex-col gap-2">
            {/* Child header */}
            <div className="flex items-center gap-2 px-1">
              <span className="text-xl">{member.avatar}</span>
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
                {member.name.toUpperCase()} — {memberLogs.length} pending
              </span>
            </div>

            {memberLogs.map(log => {
              const chore = choreMap[log.choreId]
              const isActing = acting === log.id

              return (
                <div key={log.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    opacity: isActing ? 0.5 : 1,
                  }}>
                  {/* Chore info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                      {chore?.title ?? 'Unknown chore'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {displayDate(log.date)}
                      </span>
                      {chore?.type === 'bonus' && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--bg-raised)', color: 'var(--positive)', border: '1px solid var(--border)' }}>
                          +₹{chore.value}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    disabled={isActing}
                    onClick={() => handleReject(log)}
                    className="p-2 rounded-lg transition-all active:scale-95"
                    style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--negative)' }}>
                    <X size={16} />
                  </button>
                  <button
                    disabled={isActing}
                    onClick={() => handleApprove(log)}
                    className="p-2 rounded-lg transition-all active:scale-95"
                    style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--positive)' }}>
                    <Check size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
