import { format, subDays, getDay } from 'date-fns'
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
 * Calculate the current chore streak for a member.
 * A streak is the number of consecutive days (going back from yesterday)
 * where every mandatory chore that was due was also approved.
 * Days with no due chores are skipped (don't break or count the streak).
 *
 * @param {Array} choreLogs - All chore logs for the past 60 days
 * @param {Array} mandatoryChores - Active mandatory chores assigned to the member
 * @returns {number} streak in days
 */
export function calculateStreak(choreLogs, mandatoryChores) {
  if (mandatoryChores.length === 0) return 0

  // Build a map: date → Set of approved choreIds
  const approvedByDate = {}
  for (const log of choreLogs) {
    if (log.status !== 'approved') continue
    if (!approvedByDate[log.date]) approvedByDate[log.date] = new Set()
    approvedByDate[log.date].add(log.choreId)
  }

  let streak = 0
  let day = subDays(new Date(), 1) // start from yesterday

  for (let i = 0; i < 60; i++) {
    const dateStr  = format(day, 'yyyy-MM-dd')
    const dow      = getDay(day)

    // Which chores were due on this day?
    const dueIds = mandatoryChores
      .filter(c => {
        if (!c.isActive) return false
        switch (c.recurrence) {
          case 'daily':   return true
          case 'weekday': return dow >= 1 && dow <= 5
          case 'weekend': return dow === 0 || dow === 6
          case 'weekly':  return dow === 1
          case 'custom':  return true
          default:        return false
        }
      })
      .map(c => c.id)

    if (dueIds.length === 0) {
      // No chores due — skip this day without breaking streak
      day = subDays(day, 1)
      continue
    }

    const approvedSet = approvedByDate[dateStr] ?? new Set()
    if (!dueIds.every(id => approvedSet.has(id))) break

    streak++
    day = subDays(day, 1)
  }

  return streak
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
