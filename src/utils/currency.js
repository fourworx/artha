import { CURRENCIES } from './constants'

/**
 * Format a number with the given currency symbol.
 * Falls back to INR if currency is unknown.
 */
export function formatCurrency(amount, currency = 'INR', opts = {}) {
  const { showSign = false, forceDecimals = false } = opts
  const curr = CURRENCIES[currency] ?? CURRENCIES.INR
  const abs = Math.abs(amount)
  const formatted = forceDecimals
    ? abs.toFixed(2)
    : Number.isInteger(abs) ? abs.toString() : abs.toFixed(2)
  const prefix = showSign && amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${prefix}${curr.symbol}${formatted}`
}

/** Payslip-style: always 2dp, sign prefix with a space if positive. */
export function formatPayslipAmt(amount, currency = 'INR') {
  const curr = CURRENCIES[currency] ?? CURRENCIES.INR
  const sign = amount < 0 ? '−' : ' '
  return `${sign}${curr.symbol}${Math.abs(amount).toFixed(2)}`
}

/** Round to nearest unit (minimum 1 for positive amounts). */
export function roundRupees(amount) {
  if (amount > 0 && amount < 1) return 1
  return Math.round(amount)
}

// Legacy alias — kept so any un-migrated callsite still works with INR.
export const formatRupees  = (amount, opts) => formatCurrency(amount, 'INR', opts)
export const formatPayslip = (amount) => formatPayslipAmt(amount, 'INR')
