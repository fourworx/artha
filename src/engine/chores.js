import { isDueToday } from '../utils/dates'

/**
 * Returns mandatory chores assigned to a member that are due today.
 */
export function getDueChoresForMember(allChores, memberId) {
  return allChores.filter(chore =>
    chore.isActive &&
    chore.type === 'mandatory' &&
    chore.assignedTo.includes(memberId) &&
    isDueToday(chore.recurrence, chore.daysPerWeek)
  )
}

/**
 * Returns bonus chores available today for a member.
 * Empty assignedTo = open to all children.
 */
export function getAvailableBonusChores(allChores, memberId) {
  return allChores.filter(chore =>
    chore.isActive &&
    chore.type === 'bonus' &&
    (chore.assignedTo.length === 0 || chore.assignedTo.includes(memberId)) &&
    isDueToday(chore.recurrence, chore.daysPerWeek)
  )
}

/**
 * Build a map of choreId → chore log for a given set of logs.
 * Used to quickly look up today's status per chore.
 */
export function buildLogMap(logs) {
  return Object.fromEntries(logs.map(log => [log.choreId, log]))
}

/**
 * Calculate the % of mandatory chores approved over a period.
 * Used by the payslip engine.
 * @param {string[]} dueChoreIds - IDs of all mandatory chores due in the period
 * @param {string[]} approvedChoreIds - IDs of chores with approved logs
 */
export function mandatoryCompletionPercent(dueChoreIds, approvedChoreIds) {
  if (dueChoreIds.length === 0) return 1
  const approvedSet = new Set(approvedChoreIds)
  const approved = dueChoreIds.filter(id => approvedSet.has(id)).length
  return approved / dueChoreIds.length
}

/**
 * Count how many bonus chores a member completed (approved) in a period.
 * Returns array of { choreId, title, count, valueEach, total }.
 */
export function summariseBonusEarnings(choreLogs, allChores) {
  const bonusLogs = choreLogs.filter(l => l.status === 'approved')
  const choreMap = Object.fromEntries(allChores.map(c => [c.id, c]))
  const counts = {}

  for (const log of bonusLogs) {
    const chore = choreMap[log.choreId]
    if (!chore || chore.type !== 'bonus') continue
    if (!counts[log.choreId]) {
      counts[log.choreId] = { choreId: log.choreId, title: chore.title, count: 0, valueEach: chore.value }
    }
    counts[log.choreId].count++
  }

  return Object.values(counts).map(c => ({ ...c, total: c.count * c.valueEach }))
}
