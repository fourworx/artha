import { db } from './schema'
import { today } from '../utils/dates'

// ── Family ──────────────────────────────────────────────────────────────────

export const getFamily = (id) => db.families.get(id)

export const updateFamilyConfig = (familyId, config) =>
  db.families.update(familyId, { config })

export const updateTaxFund = (familyId, balance, history) =>
  db.families.update(familyId, { taxFundBalance: balance, taxFundHistory: history })

// ── Members ──────────────────────────────────────────────────────────────────

export const getMembers = (familyId) =>
  db.members.where('familyId').equals(familyId).toArray()

export const getMember = (id) => db.members.get(id)

export const updateMember = (id, changes) => db.members.update(id, changes)

export const updateMemberAccounts = (memberId, accounts) =>
  db.members.update(memberId, { accounts })

// ── Chores ───────────────────────────────────────────────────────────────────

export const getChores = (familyId) =>
  db.chores.where('familyId').equals(familyId).toArray()

export const addChore = (chore) =>
  db.chores.add({ id: crypto.randomUUID(), ...chore })

export const updateChore = (id, changes) => db.chores.update(id, changes)

export const toggleChoreActive = (id, current) =>
  db.chores.update(id, { isActive: !current })

export const deleteChore = (id) => db.chores.update(id, { isActive: false })

// ── Chore Logs ───────────────────────────────────────────────────────────────

export const getChoreLogsForDate = (memberId, date) =>
  db.choreLogs
    .where('memberId').equals(memberId)
    .filter(log => log.date === date)
    .toArray()

export const getChoreLogsForPeriod = (memberId, startDate, endDate) =>
  db.choreLogs
    .where('memberId').equals(memberId)
    .filter(log => log.date >= startDate && log.date <= endDate)
    .toArray()

/** All pending logs across a set of member IDs (for parent approval screen) */
export const getPendingLogsForMembers = (memberIds) =>
  db.choreLogs
    .where('status').equals('pending')
    .filter(log => memberIds.includes(log.memberId))
    .toArray()

export const addChoreLog = (chore) =>
  db.choreLogs.add({
    id: crypto.randomUUID(),
    choreId: chore.choreId,
    memberId: chore.memberId,
    date: chore.date,
    status: 'pending',
    completedAt: Date.now(),
    approvedAt: null,
  })

export const approveChoreLog = (id) =>
  db.choreLogs.update(id, { status: 'approved', approvedAt: Date.now() })

export const rejectChoreLog = (id) =>
  db.choreLogs.update(id, { status: 'rejected', approvedAt: Date.now() })

export const updateChoreLog = (id, changes) => db.choreLogs.update(id, changes)

// ── Transactions ─────────────────────────────────────────────────────────────

export const getTransactions = (memberId, limit = 50) =>
  db.transactions
    .where('memberId').equals(memberId)
    .reverse()
    .limit(limit)
    .toArray()

export const addTransaction = (tx) => db.transactions.add(tx)

// ── Rewards ──────────────────────────────────────────────────────────────────

export const getRewards = (familyId) =>
  db.rewards
    .where('familyId').equals(familyId)
    .filter(r => r.isActive)
    .toArray()

export const addReward = (reward) => db.rewards.add(reward)

export const updateReward = (id, changes) => db.rewards.update(id, changes)

export const deleteReward = (id) => db.rewards.update(id, { isActive: false })

// ── Payslips ─────────────────────────────────────────────────────────────────

export const getPayslips = (memberId) =>
  db.payslips
    .where('memberId').equals(memberId)
    .reverse()
    .toArray()

export const getLatestPayslip = (memberId) =>
  db.payslips
    .where('memberId').equals(memberId)
    .last()

export const addPayslip = (payslip) => db.payslips.add(payslip)

// ── Utility Charges ──────────────────────────────────────────────────────────

export const getUtilityCharges = (memberId, weekStart, weekEnd) =>
  db.utilityCharges
    .where('memberId').equals(memberId)
    .filter(u => u.date >= weekStart && u.date <= weekEnd)
    .toArray()

export const getAllPendingUtilityCharges = (memberId) =>
  db.utilityCharges
    .where('memberId').equals(memberId)
    .toArray()

export const addUtilityCharge = (charge) => db.utilityCharges.add(charge)

// ── Data Export / Import (Backup & Restore) ──────────────────────────────────

export async function exportAllData() {
  const [families, members, chores, choreLogs, transactions, rewards, payslips, utilityCharges] =
    await Promise.all([
      db.families.toArray(),
      db.members.toArray(),
      db.chores.toArray(),
      db.choreLogs.toArray(),
      db.transactions.toArray(),
      db.rewards.toArray(),
      db.payslips.toArray(),
      db.utilityCharges.toArray(),
    ])

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    families,
    members,
    chores,
    choreLogs,
    transactions,
    rewards,
    payslips,
    utilityCharges,
  }
}

export async function importAllData(data) {
  await db.transaction('rw',
    [db.families, db.members, db.chores, db.choreLogs, db.transactions, db.rewards, db.payslips, db.utilityCharges],
    async () => {
      await Promise.all([
        db.families.clear(),
        db.members.clear(),
        db.chores.clear(),
        db.choreLogs.clear(),
        db.transactions.clear(),
        db.rewards.clear(),
        db.payslips.clear(),
        db.utilityCharges.clear(),
      ])
      await Promise.all([
        db.families.bulkAdd(data.families),
        db.members.bulkAdd(data.members),
        db.chores.bulkAdd(data.chores),
        db.choreLogs.bulkAdd(data.choreLogs),
        db.transactions.bulkAdd(data.transactions),
        db.rewards.bulkAdd(data.rewards),
        db.payslips.bulkAdd(data.payslips),
        db.utilityCharges.bulkAdd(data.utilityCharges),
      ])
    }
  )
}
