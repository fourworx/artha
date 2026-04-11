import { db } from './schema'
import { DEFAULT_CONFIG, FAMILY_ID } from '../utils/constants'
import { hashPin } from '../auth/pinUtils'
import { today } from '../utils/dates'

/**
 * Seeds the database with Dev's family data.
 * Called once on first launch if no family exists.
 *
 * PINs below are placeholders — change them in the app after first login.
 * Parent PIN: 0000  |  Son PIN: 1111  |  Daughter PIN: 2222
 */
export async function seedFamily() {
  const existing = await db.families.get(FAMILY_ID)
  if (existing) return // Already seeded

  const [parentPin, sonPin, daughterPin] = await Promise.all([
    hashPin('0000'),
    hashPin('1111'),
    hashPin('2222'),
  ])

  // ── Family ──────────────────────────────────────────────────────
  await db.families.add({
    id: FAMILY_ID,
    name: "Dev's Family",
    config: { ...DEFAULT_CONFIG },
    taxFundBalance: 0,
    taxFundHistory: [],
    createdAt: Date.now(),
  })

  // ── Members ─────────────────────────────────────────────────────
  const members = [
    {
      id: 'member-dev',
      familyId: FAMILY_ID,
      name: 'Dev',
      role: 'parent',
      tier: null,
      pin: parentPin,
      avatar: '👨',
      baseSalary: 0,
      accounts: { spending: 0, savings: 0, goalJar: null },
      creditScore: 500,
      createdAt: Date.now(),
    },
    {
      id: 'member-spouse',
      familyId: FAMILY_ID,
      name: 'Spouse',
      role: 'parent',
      tier: null,
      pin: parentPin,
      avatar: '👩',
      baseSalary: 0,
      accounts: { spending: 0, savings: 0, goalJar: null },
      creditScore: 500,
      createdAt: Date.now(),
    },
    {
      id: 'member-son',
      familyId: FAMILY_ID,
      name: 'Son',
      role: 'child',
      tier: 2,
      pin: sonPin,
      avatar: '👦',
      baseSalary: 200,
      accounts: {
        spending: 0,
        savings: 0,
        goalJar: { name: 'Lego Set', target: 700, balance: 0 },
      },
      creditScore: 500,
      createdAt: Date.now(),
    },
    {
      id: 'member-daughter',
      familyId: FAMILY_ID,
      name: 'Daughter',
      role: 'child',
      tier: 1,
      pin: daughterPin,
      avatar: '👧',
      baseSalary: 100,
      accounts: {
        spending: 0,
        savings: 0,
        goalJar: { name: 'Doll House', target: 500, balance: 0 },
      },
      creditScore: 500,
      createdAt: Date.now(),
    },
  ]
  await db.members.bulkAdd(members)

  // ── Mandatory Chores — Son ───────────────────────────────────────
  const sonMandatory = [
    { title: 'Morning Prayer',                   recurrence: 'daily'   },
    { title: 'Drink Holy Ganga Jal',             recurrence: 'daily'   },
    { title: 'Make own bed',                     recurrence: 'daily'   },
    { title: 'Pack bag for tomorrow',            recurrence: 'weekday' },
    { title: 'Brush teeth (night)',              recurrence: 'daily'   },
    { title: 'Eat Triphala',                     recurrence: 'daily'   },
    { title: 'Reset shoes',                      recurrence: 'daily'   },
    { title: 'Reset living room',                recurrence: 'daily'   },
    { title: 'Guitar practice 20 min',           recurrence: 'daily'   },
    { title: 'Tell something good that happened today', recurrence: 'daily' },
    { title: 'Touch elders\' feet',              recurrence: 'daily'   },
  ]

  // ── Mandatory Chores — Daughter ──────────────────────────────────
  const daughterMandatory = [
    { title: 'Morning Prayer',        recurrence: 'daily' },
    { title: 'Drink Holy Ganga Jal',  recurrence: 'daily' },
    { title: 'Make own bed',          recurrence: 'daily' },
    { title: 'Brush teeth (night)',   recurrence: 'daily' },
    { title: 'Touch elders\' feet',   recurrence: 'daily' },
  ]

  const mandatoryChores = [
    ...sonMandatory.map((c, i) => ({
      id: `chore-son-m-${i}`,
      familyId: FAMILY_ID,
      title: c.title,
      type: 'mandatory',
      value: 0,
      recurrence: c.recurrence,
      daysPerWeek: null,
      assignedTo: ['member-son'],
      isActive: true,
    })),
    ...daughterMandatory.map((c, i) => ({
      id: `chore-daughter-m-${i}`,
      familyId: FAMILY_ID,
      title: c.title,
      type: 'mandatory',
      value: 0,
      recurrence: c.recurrence,
      daysPerWeek: null,
      assignedTo: ['member-daughter'],
      isActive: true,
    })),
  ]

  // ── Bonus Chores (available to both) ────────────────────────────
  const bonusChores = [
    { title: 'Mop kitchen',           value: 15, recurrence: 'weekend', daysPerWeek: null },
    { title: 'Mop entire house',      value: 30, recurrence: 'weekend', daysPerWeek: null },
    { title: 'Water plants',          value: 10, recurrence: 'weekend', daysPerWeek: null },
    { title: 'Clean car inside',      value: 20, recurrence: 'weekend', daysPerWeek: null },
    { title: 'Reset study table & room', value: 15, recurrence: 'weekend', daysPerWeek: null },
    { title: 'No Sweet Day',          value: 20, recurrence: 'daily',   daysPerWeek: null },
    { title: 'No Junk Food Day',      value: 10, recurrence: 'daily',   daysPerWeek: null },
    { title: 'Learn 3 new words',     value: 15, recurrence: 'weekly',  daysPerWeek: null },
    { title: 'French practice 30 min', value: 12, recurrence: 'custom', daysPerWeek: 3   },
    { title: 'Tennis coaching (attended)', value: 10, recurrence: 'weekday', daysPerWeek: null },
  ].map((c, i) => ({
    id: `chore-bonus-${i}`,
    familyId: FAMILY_ID,
    title: c.title,
    type: 'bonus',
    value: c.value,
    recurrence: c.recurrence,
    daysPerWeek: c.daysPerWeek,
    assignedTo: [], // empty = available to all children
    isActive: true,
  }))

  await db.chores.bulkAdd([...mandatoryChores, ...bonusChores])

  // ── Rewards ──────────────────────────────────────────────────────
  const rewards = [
    { title: '30 min Screen Time',  price: 15,   category: 'screen_time', emoji: '📱' },
    { title: '60 min Screen Time',  price: 25,   category: 'screen_time', emoji: '📺' },
    { title: 'Candy Bar',           price: 20,   category: 'treat',       emoji: '🍫' },
    { title: 'Chips',               price: 20,   category: 'treat',       emoji: '🥨' },
    { title: 'Ice Cream',           price: 30,   category: 'treat',       emoji: '🍦' },
    { title: 'Boba Drink',          price: 40,   category: 'treat',       emoji: '🧋' },
    { title: 'Starbucks / Café visit', price: 60, category: 'experience', emoji: '☕' },
    { title: 'Movie in Theatre',    price: 150,  category: 'experience',  emoji: '🎬' },
    { title: 'New Clothes',         price: 200,  category: 'material',    emoji: '👕' },
    { title: 'One Day Car Trip',    price: 300,  category: 'experience',  emoji: '🚗' },
    { title: 'Live Sporting Event', price: 450,  category: 'experience',  emoji: '🏏' },
    { title: 'Lego Toy (small)',    price: 700,  category: 'material',    emoji: '🧱' },
    { title: 'Lego Toy (large)',    price: 1200, category: 'material',    emoji: '🏗️' },
    { title: 'Beach Vacation',      price: 2000, category: 'experience',  emoji: '🏖️' },
  ].map((r, i) => ({
    id: `reward-${i}`,
    familyId: FAMILY_ID,
    ...r,
    isActive: true,
  }))

  await db.rewards.bulkAdd(rewards)

  console.log('[Artha] Family seeded successfully.')
}
