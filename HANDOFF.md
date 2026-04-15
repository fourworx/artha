---
name: Artha — Session 12 Handoff
description: Full current state after sessions 1–12; use to resume in next session
type: project
---

## Session 12 completed (2026-04-15)

### Features built

**Philanthropy sparkline — cumulative donations**
- Replaced balance-over-time sparkline with cumulative-donations-over-time
- Calculation: for each payslip, `donated = max(0, prevBalance + allocationThisPeriod - newBalance)`
- Flat line = not giving = visible problem; rising line = actively giving
- Sub-label changed to "cumulative donations ↑"
- No extra DB call — derived from payslip `balancesAfter` consecutive diffs

**Recurring utilities in config**
- New `utilitiesAmount` field in `family.config` (and per-child overrides)
- Deducted every payslip alongside rent as `deductions.recurringUtilities`
- Logged as `utility` transaction type on settle
- Shown on PayslipCard as "Utilities (recurring)" row
- Slider in Economic Controls (Advanced mode only)

**Simple / Advanced Economic Controls**
- Simple mode: Tax + Rent + Auto-save % only
- Advanced mode: adds Recurring Utilities, Savings Interest, Loan Interest, Philanthropy %, per-child overrides
- Toggle at top of Economic Controls screen
- Save always preserves advanced settings even when edited in Simple mode

**Phase 5 — Device auth (Invite Codes)**
- `DeviceGate` in App.jsx wraps all routes — intercepts every app load before routing or auth
- `localStorage('artha_device_claim')` checked synchronously first — no loading flash for returning devices
- Unclaimed device → `JoinFamily` screen (6-char alphanumeric code entry + "I'm the parent" bypass)
- `generateJoinCode(familyId, memberId)` — parent generates per-child code with 10-min TTL
- `claimDevice(code)` — marks code used, upserts device_claims row
- `getDeviceClaim()` — reads device_claims by device_id
- `InviteCode` parent screen (More → Invite Code): child selector, generate button, live countdown bar
- After claiming: `DeviceContext` provides claim to app; PinAuth auto-selects claimed member
- Parent bypass: "I'm the parent on the main device →" link creates a claim with `member_id: null`

**Supabase tables created by user:**
```sql
create table join_codes (
  code text primary key,
  family_id text not null,
  member_id text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);
create table device_claims (
  device_id text primary key,
  family_id text not null,
  member_id text,
  claimed_at timestamptz default now()
);
-- Both tables: RLS disabled
alter table join_codes    disable row level security;
alter table device_claims disable row level security;
```

**Bug fixes**
- Circular import: moved `DeviceContext` + `useDevice` to `src/context/DeviceContext.jsx`
- Fixed `if/else` on same line (rolldown production bundler stricter than Vite dev)
- Service worker PWA cache issue: `localStorage`-first initialisation makes DeviceGate synchronous

---

## Current app state (as of session 12)

### All phases complete

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Core payroll engine (salary, chores, deductions, allocations) | ✅ |
| 1 | Tier 1 coin jar | ✅ |
| 1 | Tier 2 full payslip system | ✅ |
| 2 | Credit score (300–850) | ✅ |
| 2 | Chore streak bonuses | ✅ |
| 2 | Loans (give, repay, early repay, interest) | ✅ |
| 2 | Rewards store | ✅ |
| 2 | Bonus chores | ✅ |
| 3 | Supabase migration (full backend, realtime) | ✅ |
| 3.5 | Settle / approve payslip (draft → settled) | ✅ |
| 3.5 | Period-wide + daily chore progress bars | ✅ |
| 3.5 | Ledger (payslip history + transaction history, grouped by period) | ✅ |
| 3.5 | Parent child detail page | ✅ |
| 3.5 | Philanthropy account + sub-goals | ✅ |
| 3.5 | Recurring utilities in config | ✅ |
| 3.5 | Simple / Advanced Economic Controls | ✅ |
| 4 | Net worth chart (child home + parent child detail) | ✅ |
| 4 | Credit gauge (arc gauge, child home) | ✅ |
| 4 | Savings growth projection chart | ✅ |
| 4 | Spending breakdown donut (parent child detail) | ✅ |
| 4 | Tax fund thermometer | ✅ |
| 4 | Sparklines on all home cards | ✅ |
| 4 | Family Fund child view (contributions, goal voting, history) | ✅ |
| 4 | Parent Tax Fund: goal label, delete goal, child vote approval | ✅ |
| 5 | Device auth: invite codes, DeviceGate, JoinFamily, InviteCode | ✅ |

### Remaining

| Phase | Feature | Notes |
|-------|---------|-------|
| — | Supabase Edge Function auto-payslip | True midnight cron; current approach runs on parent app open on payday |
| 6 | Native app (Capacitor) | Wrap PWA as iOS/Android app |

---

## Architecture

**Stack**: React 19 + Vite 8 + TailwindCSS 4 + Supabase (PostgreSQL + Realtime) + PWA

**Supabase project**: `https://uhmpjkalbzkhrhibgyba.supabase.co`
**Deployed on Vercel**: `https://artha-indol.vercel.app`
**GitHub**: `https://github.com/fourworx/artha`

### Key files

| File | Purpose |
|------|---------|
| `src/db/operations.js` | All ~50 DB operations (camelCase↔snake_case mappers) |
| `src/db/supabase.js` | Supabase client init |
| `src/db/seed.js` | Seeds family + members on first launch (checks member count) |
| `src/engine/payslip.js` | `calculatePayslip` (pure) + `runPayslip` + `settlePayslip` |
| `src/engine/chores.js` | `calculateStreak` |
| `src/engine/interest.js` | `calculateWeeklyInterest` |
| `src/context/FamilyContext.jsx` | Realtime subscription; `reloadCount` trigger |
| `src/context/AuthContext.jsx` | Session persisted in `localStorage('artha_member_id')` |
| `src/context/DeviceContext.jsx` | `DeviceContext` + `useDevice` hook |
| `src/App.jsx` | Routes + `DeviceGate` + shells |
| `src/auth/PinAuth.jsx` | Avatar grid + PIN pad; auto-selects member from device claim |
| `src/views/auth/JoinFamily.jsx` | First-time device code entry screen |
| `src/views/parent/InviteCode.jsx` | Parent generates invite codes |

### Supabase tables

| Table | Notes |
|-------|-------|
| `families` | One row; config JSON includes all economic settings |
| `members` | parents + children; `config` JSON for per-child overrides |
| `chores` | `assignedTo: string[]`, `type: mandatory\|bonus`, `recurrence` |
| `chore_logs` | `status: pending\|approved\|rejected` |
| `transactions` | Typed: salary/tax/rent/utility/interest/bonus/loan_repay/etc |
| `payslips` | `status: draft\|settled`; `balancesAfter` JSON |
| `rewards` | Items in rewards store |
| `reward_requests` | Child redemption requests |
| `utility_charges` | Ad-hoc one-off charges |
| `member_requests` | donation / subgoal_withdrawal / tax_goal_vote |
| `join_codes` | 6-char invite codes, 10-min TTL, RLS disabled |
| `device_claims` | device_id → family_id + member_id, RLS disabled |

### family.config fields

```js
{
  currency: 'INR',
  payPeriod: 'weekly',           // 'weekly' | 'monthly'
  paydayDow: 6,                  // 0=Sun … 6=Sat (weekly)
  paydayDom: 28,                 // 1–28 (monthly)
  autoPayslip: false,
  taxRate: 0.12,
  rentAmount: 30,
  utilitiesAmount: 0,            // recurring fixed utility deduction
  interestRate: 0.02,
  loanInterestRate: 0.05,
  autoSavePercent: 0.20,
  philanthropyPercent: 0.03,
  taxFundGoal: null,             // number or null
  taxFundGoalLabel: null,        // string or null
}
```

### member.accounts fields

```js
{
  spending: number,
  savings: number,
  philanthropy: number,
  subGoals: [{ id, name, target, balance }],
  loan: { outstanding, weeklyRepayment, interestFree } | null,
}
```

### Payroll engine logic

1. Mandatory chore completion % → `adjustedSalary = baseSalary × pct`
2. Streak bonus (3d=+5%, 7d=+10%, 14d=+15%) → `gross = adjustedSalary + streakBonus`
3. Deductions: tax + rent + recurringUtilities + ad-hoc utilities
4. Net = max(0, gross − totalDeductions)
5. Allocations: savings (autoSavePercent), philanthropy (philanthropyPercent), spending (remainder)
6. Loan: interest accrues on outstanding, then repayment up to min(weeklyRepay, outstanding, spending)
7. Savings interest = `savings × interestRate` (per period)
8. Sub-goals each earn the same interest rate
9. Philanthropy earns NO interest (by design — discourages hoarding)

### Payslip lifecycle

- `runPayslip(memberId)` → saves `status: 'draft'`, NO balance updates
- `settlePayslip(payslipId)` → updates accounts + tax fund + transactions + credit score → `status: 'settled'`
- Overdue draft banner on parent dashboard when `period_end < today` and status = draft

### Device auth flow

- `localStorage('artha_device_id')` — UUID, created once per device
- `localStorage('artha_device_claim')` — cached claim JSON; synchronous gate check
- Unclaimed → JoinFamily → enter 6-char code → `claimDevice()` → saves to Supabase + localStorage
- Parent bypass → creates claim with `member_id: null` → sees all members
- Child device → claim has specific `member_id` → PinAuth auto-selects that member

### Credit score

- Range 300–850, init 500
- +10 per payslip for 100% chore completion; −10 for <50%
- +2 per mandatory chore approved; −5 per rejected
- +5/+20 early loan repayment; −10 missed scheduled repayment
- Shown as coloured chip on parent dashboard and child home header

---

## Known issues / low priority

- `formatRupees` in `currency.js` is a dead legacy alias — safe to delete
- Some hardcoded "week" strings in `Savings.jsx` stat labels (cosmetic)
- Credit score not shown on Tier 1 child view (by design)
- Service worker `autoUpdate`: users need to clear PWA cache once after a major deploy to get new code

---

## Next session: Phase 6 (Capacitor native app)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init Artha com.artha.app --web-dir dist
npx cap add ios
npm run build && npx cap sync
# Open Xcode: npx cap open ios
# Configure: bundle ID, signing, icons, splash screen
```

Optional: push notifications for payday reminders via Capacitor Push Notifications plugin.
