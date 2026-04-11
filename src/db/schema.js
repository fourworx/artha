import Dexie from 'dexie'

export const db = new Dexie('ArthaDB')

db.version(1).stores({
  // Primary key + indexed fields only (Dexie syntax)
  families:      '&id, name',
  members:       '&id, familyId, role, tier',
  chores:        '&id, familyId, type, isActive, *assignedTo',
  choreLogs:     '&id, choreId, memberId, date, status',
  transactions:  '&id, memberId, type, date',
  rewards:       '&id, familyId, isActive',
  payslips:      '&id, memberId, periodEnd',
  utilityCharges:'&id, memberId, date',
})

export default db
