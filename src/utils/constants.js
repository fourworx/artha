export const DEFAULT_CONFIG = {
  taxRate: 0.12,
  rentAmount: 30,
  interestRate: 0.02,
  autoSavePercent: 0.20,
  payDay: 'saturday',
  utilityChargeDefault: 5,
}

export const TIERS = {
  1: { name: 'Piggy Bank', description: 'Coin jar view only' },
  2: { name: 'My First Job', description: 'Full payslip & economy' },
  3: { name: 'Junior Earner', description: 'Phase 2' },
  4: { name: 'Money Manager', description: 'Phase 2' },
}

export const CHORE_RECURRENCE = {
  daily:   'Daily',
  weekday: 'Weekdays',
  weekend: 'Weekends',
  weekly:  'Weekly',
  custom:  'Custom (n×/week)',
  once:    'One-time',
}

export const TRANSACTION_TYPES = {
  salary:     'Salary',
  bonus:      'Bonus',
  tax:        'Tax',
  rent:       'Rent',
  utility:    'Utility',
  interest:   'Interest',
  reward:     'Reward',
  deposit:    'Deposit',
  withdrawal: 'Withdrawal',
}

export const REWARD_CATEGORIES = {
  screen_time: { label: 'Screen Time', emoji: '📱' },
  treat:       { label: 'Treat',       emoji: '🍭' },
  experience:  { label: 'Experience',  emoji: '🎉' },
  material:    { label: 'Material',    emoji: '🎁' },
  custom:      { label: 'Custom',      emoji: '⭐' },
}

export const FAMILY_ID = 'dev-family-001'
