import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
  getDay,
  addDays,
  subDays,
  getDaysInMonth,
} from 'date-fns'

/** Returns today's date as YYYY-MM-DD string */
export function today() {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Returns the end of the current pay period.
 *  Weekly: next occurrence of paydayDow (including today if today is payday).
 *  Monthly: last day of current month (paydayDom controls when the payslip *runs*). */
export function currentPeriodEnd(config = null) {
  const now = new Date()
  if (config?.payPeriod === 'monthly') {
    return format(endOfMonth(now), 'yyyy-MM-dd')
  }
  const paydayDow  = config?.paydayDow ?? 6 // default Saturday
  const daysUntil  = (paydayDow - getDay(now) + 7) % 7
  return format(addDays(now, daysUntil), 'yyyy-MM-dd')
}

/** Returns the start of the current pay period.
 *  Weekly: periodEnd − 6 days.
 *  Monthly: first day of current month. */
export function currentPeriodStart(config = null) {
  if (config?.payPeriod === 'monthly') {
    return format(startOfMonth(new Date()), 'yyyy-MM-dd')
  }
  const end = parseISO(currentPeriodEnd(config))
  return format(subDays(end, 6), 'yyyy-MM-dd')
}

/** Returns the next payday date string (same as period end). */
export function nextPayday(config = null) {
  return currentPeriodEnd(config)
}

/** True if today is payday.
 *  Weekly: today's day-of-week matches paydayDow.
 *  Monthly: today's date matches paydayDom (clamped to last day of month). */
export function isPayday(config = null) {
  const now = new Date()
  if (config?.payPeriod === 'monthly') {
    const dom        = config?.paydayDom ?? 28
    const clampedDom = Math.min(dom, getDaysInMonth(now))
    return now.getDate() === clampedDom
  }
  return getDay(now) === (config?.paydayDow ?? 6)
}

/** Human label for the pay period: 'week' | 'month' */
export function periodLabel(config = null) {
  return config?.payPeriod === 'monthly' ? 'month' : 'week'
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
 */
export function isDueToday(recurrence, daysPerWeek) {
  const day = getDay(new Date()) // 0=Sun, 1=Mon, ..., 6=Sat
  switch (recurrence) {
    case 'daily':   return true
    case 'weekday': return day >= 1 && day <= 5
    case 'weekend': return day === 0 || day === 6
    case 'weekly':  return day === 1 // Mondays
    case 'once':    return false
    case 'custom':  return true
    default:        return false
  }
}

/** Format as short "Apr 12" */
export function shortDate(dateStr) {
  return format(parseISO(dateStr), 'MMM d')
}

/** Returns a date string N days before today */
export function daysAgo(n) {
  return format(subDays(new Date(), n), 'yyyy-MM-dd')
}
