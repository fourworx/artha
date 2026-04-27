---
name: Artha — Session 17 Handoff
description: Full current state after sessions 1–17; use to resume in next session
type: project
---

## Session 17 completed (2026-04-27)

### Features built / bugs fixed (continued — end of session)

**Sub-goals visible in savings totals (Home + Savings screen)**
- `totalSavings = accounts.savings + subGoals.reduce(balance)` now used everywhere
- Home savings card: shows `totalSavings`, sub-label "incl. X in N goals" when goals exist
- Savings screen header: shows `totalSavings` with breakdown line showing account vs goal split
- Savings history chart: uses `balancesAfter.subGoals` from payslip JSON to include sub-goal balances per period
- Savings projection: uses `totalSavings` as starting balance
- Interest stats: includes `subGoalInterestEarned` alongside `interestEarned`

**Savings screen — sub-goals section**
- Shows each sub-goal card: name, balance, target, % progress bar, "Goal reached!" when 100%
- When sub-goals exist, also shows savings account balance card separately
- Navigate from Home savings growth card → Savings screen (button → navigate)

**Net Worth breakdown sheet (Home)**
- Tapping "NET WORTH OVER TIME" card now opens `NetWorthSheet` bottom sheet
- Shows line-by-line: Wallet, Savings account, each sub-goal (indented with name + balance/target), Sub-goals total, Philanthropy, then Liabilities (loan)
- Large NET WORTH total at bottom

**CashOutSheet — spending wallet withdrawal request (Home)**
- "Cash / Bank out" button on Wallet card opens `CashOutSheet`
- Destinations: Physical Cash / Bank Transfer (with hint labels)
- Quick amounts + custom input + optional note field
- Creates `cash_withdrawal` request → parent approves via ApproveChores screen
- `performSpendingWithdrawal` + `approveSpendingWithdrawal` in operations.js handle the flow

**Cash + Bank withdrawal from sub-goals (GoalJar)**
- WithdrawSheet in GoalJar now shows Cash and Bank as destination options alongside Spending Wallet and Philanthropy
- Each shows label + hint sub-text
- Destinations route through `performSubGoalWithdrawal` (cash/bank branches deduct from goal + log tx, no balance credit — parent hands over physical)

**ApproveChores — cash_withdrawal support**
- Added `cash_withdrawal` case in `approveMemberReq` → calls `approveSpendingWithdrawal`

### Files changed (session 17 end)
- `src/views/child-tier2/Home.jsx` — `NetWorthSheet` + `CashOutSheet` components, both rendered; savings growth card `</div>` → `</button>` fix; totalSavings, subGoals computations
- `src/views/child-tier2/Savings.jsx` — totalSavings header, sub-goals section with progress bars, historyData includes subGoals, projection uses totalSavings, interest stats include subGoalInterestEarned
- `src/views/child-tier2/GoalJar.jsx` — Cash + Bank withdrawal destinations
- `src/db/operations.js` — performSpendingWithdrawal, approveSpendingWithdrawal, cash/bank in performSubGoalWithdrawal, updatePayslipCreditScore
- `src/engine/payslip.js` — settlePayslip writes settled credit score back
- `src/views/parent/ApproveChores.jsx` — cash_withdrawal case

---

### Features built / bugs fixed (earlier — same session)

**Generate Test History (Backup screen — dev tool)**
- New purple card in Parent → More → Backup: "Generate Test History"
- Period selector: 1 / 2 / 4 / 8 past periods
- For each past period × each Tier 2 child:
  - Inserts approved `chore_logs` directly via Supabase (70–100% random completion rate per period)
  - Bonus chores: 50% random chance each bonus chore gets done, on a random day in the period
  - Calls `runPayslip(memberId, { start, end })` then `settlePayslip(id)`
- Live progress text while running; status banner on completion
- Marked as dev-only — to be removed before distribution

**Projected earnings widget payday bug fix (child home)**
- Bug: on Monday (payday), widget showed last week's settled chore data (21%, 356/500)
- Root cause: `loadProjected` used `periodStart`/`periodEnd` which on payday point to the just-settled cycle (Mon–Sun of last week)
- Fix: `usePeriod` already exposes `progressPeriodStart`/`progressPeriodEnd` which flip to today→today+6 on payday; `loadProjected` now uses these instead

**Credit score history chart**
- New SVG chart (same style as NetWorthChart — no recharts) added in two places:
  - **Parent ChildDetail**: in ANALYTICS section after bonus chore chart
  - **Child Home**: in STATS section after Savings Growth chart
- Design: per-segment band colours (green ≥700, gold #D4A017 ≥500, red <500), gradient fill below line tinted to current score's colour, dashed reference lines at 700 and 500, colour-coded key (numbers only, no line swatches), current score shown in parent card header
- Fixed Y domain 300–850 so band positions are spatially meaningful
- Exported as `CreditScoreLineChart` from `Home.jsx`; ChildDetail imports and reuses it

**Credit score stored at post-settlement time (bug fix)**
- Bug: `payslip.creditScore` was written at draft creation (before `settlePayslip` applied the delta) so all periods showed the same pre-settlement score → flat chart
- Fix: `settlePayslip` now computes `settledScore = clamp(300, 850, currentScore + scoreDelta)` and writes it back to the payslip row via new `updatePayslipCreditScore(payslipId, score)` operation
- New DB operation: `updatePayslipCreditScore` in `operations.js`

**Credit score architecture note (updated)**
- Was: `-10` for completion < 50%
- Now: `+10` perfect, `-2×missed` for 50–99%, `-30` for <50% (nuclear)
- Settle-time delta written back to payslip; chart is now accurate

---

## Session 16 completed (2026-04-22)

### Features built / bugs fixed

**Credit score rework at payslip settle**
- Was: `−10` for completion < 50%, no per-chore penalty
- Now:
  - 100% completion → `+10` (unchanged)
  - 50–99% completion → `−2` per missed mandatory chore instance (no log at all, or rejected)
  - < 50% completion → `−30` flat ("nuclear" penalty, no per-instance on top)
- "Done" for penalty purposes = `approved` OR `pending` (parent delay doesn't penalise child)
- `missedMandatoryCount` added to `calculatePayslip` return (full-period loop, same as widget)

**Vacation mode**
- New screen: More → Vacation Mode (`/parent/vacation`)
- Per-child toggle (ON/OFF) + Paid/Unpaid leave selector
- Bulk actions when multiple children: "All on paid leave" / "All on unpaid leave" / "Cancel all"
- "✈️ active" badge on the Vacation Mode item in More list when any child is on vacation
- Stored as `vacation: { active, paidLeave, startDate }` in `member.config`
- `setMemberVacation(memberId, vacation)` helper in operations.js

**Vacation payslip engine logic** (`calculatePayslip`):
- Paid leave: `adjustedSalary = baseSalary`, streak/bonus = 0, normal deductions on full salary, credit unaffected
- Unpaid leave: gross = 0, rent/utilities waived, savings interest still accrues, loan interest still accrues, credit unaffected
- `onVacation` and `paidLeave` saved to `earnings` in payslip for historical accuracy
- `settlePayslip`: chore-related credit changes skipped entirely when `ps.earnings.onVacation === true`
- PayslipCard shows blue ✈️ banner (paid or unpaid wording)

**Vacation visible to child**
- Home screen: blue banner at top of feed explaining paid vs unpaid leave
- Chores screen: slim blue notice bar below header — "chores optional" or "no penalties"

**Future feature logged in handoff**: sibling chore pickup — if Child A is on vacation, Child B can volunteer to do Child A's chores and earn extra. To explore when distribution phase begins.

---

## Session 15 completed (2026-04-22)

### Features built / bugs fixed

**Projected earnings widget — full redesign (child home)**
- Was: showed net pay + "69% chores" (misleading — used `activeDates` denominator, only days with logs)
- Now: shows **gross earned / gross potential** (salary-only denominator, bonus separate)
- Mandatory chore % now iterates all calendar days in the period (Mon–Sun) as denominator — e.g. Wednesday with 3 days approved = 3/7 = 43%, honest and motivational
- Streak bonus shown as separate amber line if active
- **Bonus chores section** (earned / potential) shown only when bonus chores exist for the member
- Interest line (savings + goals combined) shown when > 0
- Footer: "If payslip ran right now"

**Bonus chore potential tracking**
- `calculatePayslip` now computes `bonusPotential` = sum of all active bonus chores × frequency multiplier (daily×7, weekday×5, weekend×2, weekly×1, custom×daysPerWeek)
- `bonusPotential` added to the `calculatePayslip` return value
- Stored as `bonus_potential` column in `payslips` table (column added to Supabase by user)
- `mapPayslip` reads `bonus_potential ?? 0`; `addPayslip` writes it

**PayslipCard bonus % summary**
- After bonus chore items list, shows: "₹X of ₹Y potential (Z%)"
- Only shown when `payslip.bonusPotential > 0`
- `Row` component gained a `color` prop (custom hex colour, falls back through positive/negative/bold)

**Philanthropy gold colour (#D4A017) — applied everywhere**
- `PayslipCard` philanthropy allocation row: `positive` → `color='#D4A017'`
- Parent Dashboard child card philanthropy tile
- Parent Child Detail balance tile
- Parent Child Detail donate section (bg, border, icon, text, button all gold)
- `SpendingBreakdown` donut segment: `#4ade80` → `#D4A017`
- Child Home savings sparkline stays blue; philanthropy sparkline → `#D4A017`

**Bonus chore performance chart (parent child detail)**
- Dual-Y-axis `ComposedChart` (Recharts) added to ChildDetail analytics section
- Left Y-axis (₹): stacked bars — amber bottom = earned, muted top = left on table
- Right Y-axis (%): amber line = capture rate per period
- Only shown when settled payslips with `bonusPotential > 0` exist
- Tooltip: earned / left on table / capture rate

**Reward approval toast fixed (showing on every refresh)**
- Used `useRef(true)` as `isFirstLoad` flag
- On mount: seed all existing reward IDs silently, never toast
- On subsequent `reloadCount` ticks: only toast genuinely new approvals

**Savings colour updated**
- Amount text: `var(--accent-blue)` → `#1E3A8A` (navy)
- Sparkline: `#60a5fa` → `#1E3A8A`

---

## Session 14 completed (2026-04-22)

### Features built / bugs fixed

**Bonus chores now taxed (included in gross)**
- Was: bonus chore earnings bypassed tax, went directly to spending wallet at settle time
- Now: `gross = adjustedSalary + streakBonus + bonusChoreEarnings` — all taxed together
- `newSpending` no longer adds `bonusChoreEarnings` separately
- PayslipCard label changed to "BONUS CHORES (included in gross)"

**PayslipCard earnings order fixed**
- Was: Adjusted Salary → GROSS → BONUS CHORES (confusing order)
- Now: Adjusted Salary → Streak Bonus → BONUS CHORES → divider → GROSS (logical flow)

**Reward store price showing NaN — fixed**
- Root cause: DB column is `cost`, but `mapReward` returned it as `cost` key while all UI/forms used `price`
- Fix: `mapReward` now maps `cost` → `price`; `addReward` writes `reward.price` → `cost`; `updateReward` checks `'price' in changes` and maps to `cost`

**Parent approve-tab badge now includes reward requests + updates in real-time**
- Was: badge only counted chore logs + member requests (donations); reward requests not included
- Was: `useEffect` only depended on `children`, not `reloadCount` — no real-time update
- Fix: added `getPendingRewardRequests(ids)` to badge query; added `reloadCount` as dependency

**Child balance refreshes in real-time after parent approval**
- Was: `Tier2Shell` didn't subscribe to realtime ticks — child's spending balance stayed stale
- Fix: `Tier2Shell` now subscribes to `reloadCount`; calls `refreshMember()` on every tick

**Child toast notification when parent approves a reward**
- New: `Tier2Shell` polls `getRewardRequests` on each `reloadCount` tick
- Uses a `Set` (seenRewardIds) to track known request IDs — seeds on first load, toasts only future approvals
- Green pill toast "🎉 [Reward title] approved!" appears above nav bar for 4 seconds, dismissable on tap
- `fadeInUp` keyframe added to `index.css`

**Reward purchase limit removed**
- Was: child could only buy each reward once per day (blocked by request status check)
- Now: always purchasable; `RewardCard` shows an amber "N pending" badge if there are pending requests
- Replaced `requestMap` (most-recent-status per reward) with `pendingCountMap` (count of pending per reward)

**Spending history date text visibility**
- Date in `SpendingSheet` transaction rows was `var(--text-dim)` (nearly invisible)
- Changed to `var(--text-muted)` for readable contrast

---

## Session 13 completed (2026-04-17)

### Features built / bugs fixed

**P2 (second parent) setup**
- Members screen: two buttons — `+ Child` and `+ Parent`
- `MemberSheet` takes `addingRole` prop; parent form skips tier/salary/goalJar fields
- Placeholder text switches between "Child's name" / "Parent's name"
- `InviteCode` screen: changed `children` → `members` (shows parents too), label "FOR WHICH MEMBER?"

**Economic Controls overhaul**
- Replaced all `SliderRow` components with free-input `InputRow` (no max limit, supports decimals)
- `isPercent` prop converts decimal↔percent automatically
- `pct` formatter shows 2 decimal places: `${+(v * 100).toFixed(2)}%`
- Example calculation uses actual child's `baseSalary` instead of hardcoded ₹200
- Monthly payday: changed from 1–28 cap to 1–31 with explanatory note

**ChoreManager salary display**
- Removed the dual-card 4.33x multiplier display (was confusing)
- Single card showing `PER WEEK` or `PER MONTH` salary (just the actual base salary)

**Bonus chores — full fix**
- Root cause: `isDueToday` was filtering bonus chores by recurrence day (designed for mandatory chores)
- Fix: removed `isDueToday` filter entirely from `getAvailableBonusChores` — bonus chores always visible when active
- Recurrence for bonus = earn frequency, not visibility

**Bonus money timing**
- Was: `approveBonusChoreLog` immediately credited spending wallet
- Now: bonus logs collected in `calculatePayslip`, earnings added to `newSpending` at settle time (bypass tax/allocations)
- `settlePayslip` adds individual bonus transactions per chore item
- Parent approval queue badge shows "⚡ +₹X on payslip" (not "instant")

**Approve All button**
- Shown in `ApproveChores` when more than one log in queue
- Processes all logs sequentially

**Draft payslip UX**
- Home.jsx: amber banner at top when `latestPayslip?.status === 'draft'` → taps to Ledger
- ChildNav: amber dot badge on Ledger tab driven by `hasDraftPayslip` prop from `Tier2Shell`
- `Tier2Shell` in App.jsx fetches latest payslip on mount, passes to ChildNav

**PayslipCard interest rows**
- Always shows interest/loan rows (dimmed when zero) — no conditional hiding
- `+ Interest on savings`, `+ Interest on goals`, `− Loan interest accrued`
- Bonus chores section shows after GROSS (only when items exist)

**Philanthropy / Goals cleanup**
- Philanthropy earns NO interest (by design)
- `GoalJar.jsx`: removed entire philanthropy section — screen now shows ONLY custom sub-goals
- `Home.jsx`: philanthropy card changed from navigable `<button>` to plain `<div>` (no navigation)

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
  paydayDom: 28,                 // 1–31 (monthly; capped at last day of month at run time)
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
- At settle: +10 for 100% completion; −2×missed for 50–99%; −30 for <50% (nuclear, no per-chore on top)
- Pending logs count as done (parent delay doesn't penalise child)
- Real-time: +2 per mandatory chore approved; −5 per rejected
- Loan: +5 on-time repayment; +20 loan fully cleared; −10 missed scheduled repayment
- Vacation: no chore-related credit changes when on vacation
- Post-settlement score written back to payslip row (accurate historical chart)
- Shown as coloured chip on parent dashboard and child home header; history chart in STATS + ChildDetail

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

---

## Commercial Distribution Plan

*Decided 2026-04-17. Currently in personal testing phase. Distribution comes after testing is complete.*

### Strategy
Bootstrap venture. Test with own family first → fix all bugs and polish → then proceed to App Store + Play Store distribution with monetisation.

---

### What needs to change before distribution (build order)

#### Phase A — Finish personal testing (NOW)
- Test all features with real family data
- Fix all bugs found during testing
- Polish UI/UX

#### Phase B — Multi-tenant architecture (most critical)
The single biggest change. Currently `FAMILY_ID = 'dev-family-001'` is hardcoded — all users would share the same database.

Changes required:
- Generate `FAMILY_ID` as `crypto.randomUUID()` during onboarding (already happening in `createFamily()`) — need to persist it to `localStorage('artha_family_id')` and read it everywhere instead of the constant
- Remove `FAMILY_ID` from `constants.js` entirely
- Add **Row Level Security (RLS)** policies to all 12 Supabase tables so `family_id` gates every query
- Every Supabase query that doesn't already filter by `family_id` must be updated

RLS policy pattern (same for every table):
```sql
alter table members enable row level security;
create policy "family isolation" on members
  using (family_id = current_setting('app.family_id', true));
```
Then set `app.family_id` per-request via Supabase client config or a custom JWT claim.

Simpler alternative: use Supabase Auth JWT — store `family_id` in the JWT `app_metadata`, and RLS reads `auth.jwt() ->> 'family_id'`. Ties neatly into Phase C.

#### Phase C — Supabase Auth for founding parent
Currently the founding parent only has a PIN. If all devices are lost, the family account is unrecoverable.

Changes required:
- During onboarding Step 1: collect founding parent's **email + password** (Supabase Auth `signUp`)
- This creates a Supabase Auth session with `user.id` and `app_metadata.family_id`
- Subsequent logins: email+password once → then PIN for daily use
- Required by Apple/Google: must offer account deletion — `deleteFamily()` operation that wipes all rows where `family_id = X` and deletes the Supabase Auth user

#### Phase D — Legal & compliance
- **Privacy Policy**: publish at a URL (e.g. artha.app/privacy). Required by both stores.
- **Terms of Service**: publish at a URL.
- **Account deletion flow**: in-app button (Settings → Delete Family Account) that triggers full data wipe.
- **COPPA / GDPR-K**: app involves children's data. Children do not create accounts themselves (parents manage everything) — this keeps compliance simpler. Note this in privacy policy.
- **Age rating**: both stores will ask about child-directed content. Declare appropriately.

#### Phase E — Capacitor native app
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init Artha com.artha.app --web-dir dist
npx cap add ios && npx cap add android
npm run build && npx cap sync
```
- Configure bundle ID, signing certificates, icons, splash screen
- iOS: Xcode → TestFlight → App Store
- Android: Android Studio → signed APK/AAB → Play Console

#### Phase F — Monetisation
Recommended model: **free 30-day trial → subscription**.
- Use RevenueCat (SDK wraps Apple + Google billing in one API)
- Suggested pricing: ~₹499/month or ₹3,999/year (adjust for market)
- Gate premium features after trial (e.g. multi-child, loans, charts)
- Apple takes 15% (small developer programme, <$1M revenue); Google takes 15% for first $1M/year

#### Phase G — Push notifications
- Supabase Edge Function + pg_cron: runs `runPayslip` at midnight on payday
- Capacitor Push Notifications plugin for APNs (Apple) + FCM (Google)
- Notification: "Payslip ready for [Child] — tap to review and settle"

---

### Cost breakdown (bootstrap)

#### One-time costs
| Item | Cost |
|------|------|
| Apple Developer Account | $99/year (~₹8,300) |
| Google Play Developer Account | $25 one-time (~₹2,100) |
| Domain (e.g. artha.app) | ~$15/year (~₹1,250) |
| **Total first year one-time** | **~$140 / ₹11,700** |

#### Monthly recurring (at launch)
| Item | Cost | Notes |
|------|------|-------|
| Supabase Pro | $25/month | Essential — free tier pauses DB after 1 week of inactivity. Pro = always-on, daily backups, 8GB DB |
| Vercel Pro | $0–20/month | Free hobby tier is fine for PWA. Go Pro ($20) when you need commercial SLA. For pure native Capacitor app, Vercel is optional — assets are bundled in the APK. |
| RevenueCat | $0/month | Free up to $2,500 monthly tracked revenue |
| **Total monthly** | **$25–45/month** | **₹2,100–3,800/month** |

#### Break-even (subscription model)
At ₹499/month per family, after store cut (15%): ~₹424 net per family.
- Supabase + domain costs: ~₹2,200/month
- Break even: **~6 paying families**
- Profitable from family #7 onwards

#### Free tier limits (Supabase) — when to upgrade
| Limit | Free | Pro |
|-------|------|-----|
| Database size | 500MB | 8GB |
| Monthly active users | 50,000 | 100,000 |
| Database pauses | Yes (1 wk inactivity) | Never |
| Daily backups | No | Yes |
| **Verdict** | Dev/testing only | Use for production |

**Bottom line: ₹2,100/month (~$25) gets you a production-grade backend that can serve hundreds of families comfortably. Start on Supabase Free for testing, switch to Pro the day you launch.**

---

### Tech stack stays the same
React + Vite + Supabase + Capacitor is the right professional stack for this. No need to switch anything. The core changes are architectural (multi-tenant, auth) not a rewrite.
