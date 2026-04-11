import { useState, useEffect, useCallback } from 'react'
import { Check, X, RefreshCw, Gift } from 'lucide-react'
import { useFamily } from '../../context/FamilyContext'
import {
  getPendingLogsForMembers, approveChoreLog, rejectChoreLog,
  getPendingRewardRequests, approveRewardRequest, rejectRewardRequest,
} from '../../db/operations'
import { displayDate } from '../../utils/dates'
import { formatRupees } from '../../utils/currency'

export default function ApproveChores() {
  const { children, chores } = useFamily()

  const [logs,           setLogs]           = useState([])
  const [rewardRequests, setRewardRequests] = useState([])
  const [loading,        setLoading]        = useState(true)
  const [acting,         setActing]         = useState(null)

  const choreMap  = Object.fromEntries(chores.map(c => [c.id, c]))
  const memberMap = Object.fromEntries(children.map(m => [m.id, m]))

  const loadAll = useCallback(async () => {
    setLoading(true)
    const ids = children.map(c => c.id)
    const [pending, rewards] = await Promise.all([
      getPendingLogsForMembers(ids),
      getPendingRewardRequests(ids),
    ])
    pending.sort((a, b) => b.completedAt - a.completedAt)
    rewards.sort((a, b) => b.requestedAt - a.requestedAt)
    setLogs(pending)
    setRewardRequests(rewards)
    setLoading(false)
  }, [children])

  useEffect(() => { loadAll() }, [loadAll])

  // Chore actions
  const approveChore = async (log) => {
    setActing(log.id)
    await approveChoreLog(log.id)
    setLogs(prev => prev.filter(l => l.id !== log.id))
    setActing(null)
  }
  const rejectChore = async (log) => {
    setActing(log.id)
    await rejectChoreLog(log.id)
    setLogs(prev => prev.filter(l => l.id !== log.id))
    setActing(null)
  }

  // Reward request actions
  const approveReward = async (req) => {
    setActing(req.id)
    try {
      await approveRewardRequest(req.id, req.memberId, req.amount)
      setRewardRequests(prev => prev.filter(r => r.id !== req.id))
    } catch (e) {
      alert(e.message) // insufficient balance — surface to parent
    } finally {
      setActing(null)
    }
  }
  const rejectReward = async (req) => {
    setActing(req.id)
    await rejectRewardRequest(req.id)
    setRewardRequests(prev => prev.filter(r => r.id !== req.id))
    setActing(null)
  }

  // Group chore logs by member
  const groupedChores = children.reduce((acc, child) => {
    const childLogs = logs.filter(l => l.memberId === child.id)
    if (childLogs.length > 0) acc.push({ member: child, logs: childLogs })
    return acc
  }, [])

  // Group reward requests by member
  const groupedRewards = children.reduce((acc, child) => {
    const childReqs = rewardRequests.filter(r => r.memberId === child.id)
    if (childReqs.length > 0) acc.push({ member: child, requests: childReqs })
    return acc
  }, [])

  const totalPending = logs.length + rewardRequests.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PARENT</p>
          <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            Approvals
            {totalPending > 0 && (
              <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full"
                style={{ background: 'var(--negative)', color: '#fff' }}>
                {totalPending}
              </span>
            )}
          </h2>
        </div>
        <button onClick={loadAll} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {loading && (
          <p className="text-xs font-mono text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        )}

        {!loading && totalPending === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-4xl">✅</span>
            <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>All caught up</p>
          </div>
        )}

        {/* ── Chore approvals ── */}
        {groupedChores.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>CHORE COMPLETIONS</p>
            {groupedChores.map(({ member, logs: memberLogs }) => (
              <div key={member.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xl">{member.avatar}</span>
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {member.name.toUpperCase()} — {memberLogs.length} pending
                  </span>
                </div>
                {memberLogs.map(log => {
                  const chore    = choreMap[log.choreId]
                  const isActing = acting === log.id
                  return (
                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', opacity: isActing ? 0.5 : 1 }}>
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
                      <button disabled={isActing} onClick={() => rejectChore(log)}
                        className="p-2 rounded-lg active:scale-95"
                        style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--negative)' }}>
                        <X size={16} />
                      </button>
                      <button disabled={isActing} onClick={() => approveChore(log)}
                        className="p-2 rounded-lg active:scale-95"
                        style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--positive)' }}>
                        <Check size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── Reward requests ── */}
        {groupedRewards.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>REWARD REQUESTS</p>
            {groupedRewards.map(({ member, requests }) => (
              <div key={member.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xl">{member.avatar}</span>
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {member.name.toUpperCase()} — {requests.length} request{requests.length > 1 ? 's' : ''}
                  </span>
                </div>
                {requests.map(req => {
                  const isActing = acting === req.id
                  const wallet   = member.accounts?.spending ?? 0
                  const canAfford = wallet >= req.amount
                  return (
                    <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', opacity: isActing ? 0.5 : 1 }}>
                      <Gift size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                          {req.rewardTitle}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--warning)' }}>
                            {formatRupees(req.amount)}
                          </span>
                          <span className="text-xs font-mono" style={{ color: canAfford ? 'var(--text-muted)' : 'var(--negative)' }}>
                            wallet: {formatRupees(wallet)}
                          </span>
                        </div>
                      </div>
                      <button disabled={isActing} onClick={() => rejectReward(req)}
                        className="p-2 rounded-lg active:scale-95"
                        style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--negative)' }}>
                        <X size={16} />
                      </button>
                      <button disabled={isActing || !canAfford} onClick={() => approveReward(req)}
                        className="p-2 rounded-lg active:scale-95"
                        style={{
                          background: canAfford ? 'rgba(74,222,128,0.15)' : 'var(--bg-raised)',
                          color: canAfford ? 'var(--positive)' : 'var(--text-dim)',
                        }}>
                        <Check size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
