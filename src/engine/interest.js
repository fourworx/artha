import { roundRupees } from '../utils/currency'

/**
 * Calculate one week of simple interest on a savings balance.
 * Rate is weekly (e.g. 0.02 = 2%/week — deliberately unrealistic for child's learning timeframe).
 */
export function calculateWeeklyInterest(currentSavings, weeklyRate) {
  if (currentSavings <= 0 || weeklyRate <= 0) return 0
  return roundRupees(currentSavings * weeklyRate)
}

/**
 * Project savings growth over N weeks given a weekly deposit and interest rate.
 * Returns array of { week, balance } for charting.
 */
export function projectSavingsGrowth(startBalance, weeklyDeposit, weeklyRate, weeks = 12) {
  const data = []
  let balance = startBalance
  for (let w = 0; w <= weeks; w++) {
    data.push({ week: w, balance })
    const interest = calculateWeeklyInterest(balance, weeklyRate)
    balance = roundRupees(balance + weeklyDeposit + interest)
  }
  return data
}
