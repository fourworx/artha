/**
 * Format a number as Indian Rupees.
 * Always shows ₹ prefix, minimum ₹1, no decimals for whole numbers.
 */
export function formatRupees(amount, opts = {}) {
  const { showSign = false, forceDecimals = false } = opts
  const abs = Math.abs(amount)
  const formatted = forceDecimals
    ? abs.toFixed(2)
    : Number.isInteger(abs) ? abs.toString() : abs.toFixed(2)

  const prefix = showSign && amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${prefix}₹${formatted}`
}

/**
 * Format for payslip display — always 2 decimal places, right-aligned.
 */
export function formatPayslip(amount) {
  const sign = amount < 0 ? '−' : ' '
  return `${sign}₹${Math.abs(amount).toFixed(2)}`
}

/**
 * Round to nearest rupee (minimum ₹1 for positive amounts).
 */
export function roundRupees(amount) {
  if (amount > 0 && amount < 1) return 1
  return Math.round(amount)
}
