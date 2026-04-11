import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isSaturday,
  isToday,
  parseISO,
  getDay,
} from 'date-fns'

/** Returns today's date as YYYY-MM-DD string */
export function today() {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Returns the start (Sunday) of the current pay week */
export function currentPeriodStart(date = new Date()) {
  return format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd')
}

/** Returns the end (Saturday = payday) of the current pay week */
export function currentPeriodEnd(date = new Date()) {
  return format(endOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd')
}

/** Returns the next payday (Saturday) from a given date */
export function nextPayday(date = new Date()) {
  const end = endOfWeek(date, { weekStartsOn: 0 })
  return format(end, 'yyyy-MM-dd')
}

/** True if today is payday (Saturday) */
export function isPayday(date = new Date()) {
  return isSaturday(date)
}

/** Human-readable date: "Sat, 12 Apr" */
export function displayDate(dateStr) {
  return format(parseISO(dateStr), 'EEE, d MMM')
}

/** Human-readable date with year: "12 Apr 2026" */
export function displayDateFull(dateStr) {
  return format(parseISO(dateStr), 'd MMM yyyy')
}

/**
 * Whether a chore is due today based on its recurrence.
 * @param {string} recurrence - daily | weekday | weekend | weekly | custom | once
 * @param {number} [daysPerWeek] - for custom recurrence (e.g. 3 for French 3×/week)
 */
export function isDueToday(recurrence, daysPerWeek) {
  const day = getDay(new Date()) // 0=Sun, 1=Mon, ..., 6=Sat
  switch (recurrence) {
    case 'daily':   return true
    case 'weekday': return day >= 1 && day <= 5
    case 'weekend': return day === 0 || day === 6
    case 'weekly':  return day === 1 // Mondays
    case 'once':    return false // parent handles these manually
    case 'custom':  return true  // parent discretion; child marks when done
    default:        return false
  }
}

/** Format as short "Apr 12" */
export function shortDate(dateStr) {
  return format(parseISO(dateStr), 'MMM d')
}
