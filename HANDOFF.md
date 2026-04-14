---
name: Artha — Session 10 Handoff
description: Full current state after sessions 1–10; use to resume in next session
type: project
---

## Session 10 decisions (2026-04-14)

### Finalised feature roadmap — build order locked

---

#### Phase 3.5 — Core UX (build in order)

**1. Settle / Approve Payslip** *(urgent — auto-payslip runs Apr 18)*
- Add `status: 'draft' | 'settled'` column to `payslips` table in Supabase
- `runPayslip` → saves payslip as `draft` only. NO balance updates, NO transactions, NO tax fund changes
- New `settlePayslip(payslipId)` function → updates member accounts, logs transactions, updates tax fund, sets `status = 'settled'`
- Parent-only action (no child confirmation required)
- Child sees draft payslip immediately with "Pending settlement" badge
- Warn parent if running payslip before period end date
- Duplicate guard already prevents re-run for same `periodEnd` — still intact
- Dashboard layout: move Run Payslip + view payslip buttons to a **second line** below child name (first line = name + credit chip only). Too crowded currently.

**2. Period-wide chore progress bar on parent dashboard**
- Currently: one bar showing today's chore completion
- Add second bar showing full pay-period mandatory chore completion (all due occurrences across the period, not just today)
- Works correctly for all recurrence types (daily, weekday, weekly, custom)

**3. Ledger / Transaction History**
- Display format: grouped by payslip period (not flat chronological feed)
- Each period shows: payslip summary + individual transaction line items (bonus chores by name, rent, utilities, interest, loan repayments)
- Payslip IDs: human-readable label e.g. `PAY-2026-04-18` or `"Week ending Apr 18"` — for parent-child communication ("I'm looking at your Apr-18 payslip")
- **Child access**: the current Payslip tab is renamed to **Ledger** and extended — archive rows when expanded show full transactions for that period
- **Parent access**: tap anywhere on child card → child detail page (all periods stacked, expandable, summary strip at top)
- Settle button lives here: draft payslips show yellow "Settle →" inline, settled show green ✓

**4. Parent Child Detail Page**
- Entry: tap child card on dashboard
- Top: current balances + summary strip (total rent paid this period, total bonus earned, total tax paid)
- Body: all payslip periods stacked, newest first, expandable
- Settle button inline per draft payslip

**5. Philanthropy Account (replaces Goal Jar)**
- Goal Jar removed entirely
- Philanthropy = fixed third account alongside Spending + Savings
- Earns same interest rate as savings (configurable — same slider)
- Auto-save allocation %: family config gets a `philanthropyPercent` field (separate from `autoSavePercent`)
- Can be set to 0% in economic controls (effectively disabled)
- **Home card 3-grid**: Spending / Savings / Philanthropy (replaces Goal Jar cell)
- **Goals tab** (child nav): shows Philanthropy balance at top, then list of custom sub-goal accounts below
- **Sub-goal accounts**: name (e.g. "Bicycle Fund"), target amount, current balance, visual progress bar, earns interest
- Sub-goal accounts are created/managed by parent or child (TBD — decide at build time)
- Route `/child/goal` → becomes Goals screen

**Child nav — final structure (5 items):**
```
Home  |  Chores  |  Ledger  |  Goals  |  Exit
```
- Payslip tab renamed to **Ledger** (covers payslips + transaction history)
- History tab removed (merged into Ledger)
- Rewards tab removed — moved to Home screen as "Rewards Store" section near spending balance
- Goals tab added (Philanthropy + sub-goal accounts)
- Nav goes from 6 crowded tabs to 4 clean tabs + Exit

**6. Utilities — recurring fixed charge**
- Add `utilitiesAmount` field to family config (deducted from every payslip like rent)
- Ad-hoc utility charges (`utility_charges` table) remain for one-off penalties/fines
- Both visible and configurable in Economic Controls
- Payslip shows both: recurring utility deduction + any ad-hoc charges for the period

**7. Simple vs Advanced Economic Controls**
- **Simple mode**: only Rent + Tax + Auto-save % shown. Each can be set to 0.
- **Advanced mode**: all current features + recurring utilities + per-child overrides + inflation meter (future)
- Toggle at top of Economic Controls screen
- Default: Simple for new families

---

#### Phase 4 — Visualisations (after 3.5 complete)

All charts built together as one phase.

**Child Home — "Stats" section** (scrollable, below account balance cards):
- Net worth mini line chart (spending + savings + philanthropy − loan, plotted per payslip using `balancesAfter`)
- Credit Report Card gauge (arc gauge, colour-coded zones, replaces number chip — rename "Credit Score" → "Credit Report Card" throughout app)
- Compounding magic graph: actual savings growth line + projected forward line (same chart, solid + dashed)

**Parent Child Detail Page — analytics strip**:
- Net worth line over time
- "Where does my money go?" pie (transactions grouped by type: salary → rent, tax, savings, spending, loan)

**Tax Fund page** (`/parent/tax-fund`):
- Thermometer showing balance vs a configurable family goal

**Data already available for all charts**:
- Credit history: `member.creditScore` updated each payslip (need to start storing history — add `creditHistory: [{date, score}]` to member or derive from payslip `creditScore` field)
- Net worth: `payslip.balancesAfter` at each payslip date — fully reconstructable
- Transactions: already typed (`salary`, `rent`, `tax`, `bonus`, `interest`, `loan_repay`, etc.)

---

#### Phase 5 — Device & Auth (invite code / QR)
*(details already in HANDOFF below — unchanged)*

---

#### Phase 6 — Native App (Capacitor)
*(details already in HANDOFF below — unchanged)*

---

### Session 10 — features built

**Settle / Approve Payslip**
- `status text DEFAULT 'settled'` column added to `payslips` table in Supabase
- `runPayslip` now saves `status: 'draft'` only — no balance/tax/transaction updates
- New `settlePayslip(payslipId)` in `engine/payslip.js` — loads payslip, recalculates nothing (uses stored calc), updates member accounts + tax fund + transactions + credit score + marks settled
- `getPayslip(payslipId)` and `updatePayslipStatus(payslipId, status)` added to `operations.js`
- Child Payslip tab shows yellow "⏳ Pending settlement" banner on draft payslips

**Settle flow on parent dashboard**
- "Settle Pay" (yellow) button → opens `PayslipSheet` showing full payslip for review
- Sheet footer: "Close" + "Approve & Pay" (green)
- "Approve & Pay" is **hard-locked** before `periodEnd` — shows *"Settlement available from [date]"*
- On/after `periodEnd`: button activates, parent approves, balances update

**Run Payslip hard-block**
- Before period end: shows *"Payslip from [date]"* — no button, nothing to tap
- On/after period end: "Run Payslip" button activates
- Removed mid-period warning popup entirely
- Auto-payslip (on parent app open on payday) still works as before — creates drafts

**Overdue draft reminder banner**
- `getOverdueDrafts(memberIds, currentPeriodEnd)` in `operations.js`
- Only fires for drafts from **previous periods** (`period_end < currentPeriodEnd`) — not current-period pre-runs
- Shows child name (single) or count (multiple) with instruction to settle

**Dashboard layout**
- Child card: name + credit chip on own line, action buttons (Run/View/+) on dedicated second line below
- Two chore progress bars per child: daily (today's completion) + period-wide (all 7 days, all recurrence types)
- Period bar denominator = all calendar days in period × expected occurrences per chore recurrence

**Architecture decision: no mid-period payslip generation**
- Rationale: generating mid-period freezes partial chore data; Apr 14–18 chores would be lost
- Decision: block generation until period end; auto-generate on payday app open
- Future (Phase 5): Supabase Edge Function + pg_cron for true midnight auto-generation

**Apr 19 test checklist**
1. Auto-payslip fires when parent opens app on Apr 18 → drafts created, balances unchanged
2. Apr 19: yellow overdue banner appears on parent dashboard
3. Tap "Settle Pay" → payslip sheet opens, "Approve & Pay" now active (period ended)
4. Approve → balances update, transactions logged, tax fund updates, credit score updates
5. Banner disappears, child "Pending settlement" badge gone

**Other decisions**
- Chore completion % confirmed: based on full period via `activeDates` — NOT just today
- Period progress bar uses all calendar days (not activeDates) so denominator = full 7-day week
- 75 not 77 on period bar → one of 11 chores is 'weekday' recurrence (5 days not 7) — check chore manager
- **Settle feature test note**: The first test of Settle appeared to not update balances because the original payslip was run with the old code (which updated balances immediately), then manually set to `draft` via SQL. Balances were already at post-payslip values so settle wrote the same numbers. To properly test: delete the payslip row in Supabase, run a fresh one (balances will stay unchanged), then settle (balances should jump). First real test will be the Apr 18 auto-payslip.
- **Overdue draft reminder banner**: Yellow banner appears on parent dashboard when any Tier 2 child has a draft payslip whose `periodEnd <= today()`. Queries `payslips` table for `status = 'draft'` and `period_end <= today`. Dismisses automatically once all settled. Single child shows name; multiple shows count.
- **Apr 19 test checklist** (day after first real payday Apr 18):
  1. Auto-payslip fires on Apr 18 → drafts created for all Tier 2 children (balances unchanged)
  2. On Apr 19, yellow banner should appear on parent dashboard for each unsettled child
  3. Tap "Settle Pay" → payslip sheet opens, "Approve & Pay" button should now be active (period has ended)
  4. Approve → balances update, transactions logged, tax fund updates, credit score updates
  5. Banner disappears after all children settled
  6. Child Payslip tab: "Pending settlement" banner gone, payslip shows as settled

---

## Session 9 completed (2026-04-13)

### Phase 3 — Supabase migration (complete)

All data now lives in Supabase (PostgreSQL + Realtime). IndexedDB/Dexie fully replaced.

**Infrastructure:**
- Supabase project: `https://uhmpjkalbzkhrhibgyba.supabase.co`
- Deployed on Vercel: `https://artha-indol.vercel.app`
- `.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- All 9 tables in Supabase: families, members, chores, chore_logs, transactions, payslips, rewards, reward_requests, utility_charges
- Realtime enabled on all tables via `supabase_realtime` publication

**Key implementation files:**
- `src/db/supabase.js` — Supabase client init
- `src/db/operations.js` — all ~40 operations rewritten with camelCase↔snake_case mappers
- `src/db/seed.js` — seeds into Supabase on first launch (checks member count)
- `src/db/migrate.js` — one-time migration helper: reads Dexie → writes to Supabase (accessible via Backup screen)
- `src/context/FamilyContext.jsx` — Realtime subscription on all tables; `reloadCount` counter increments on every reload so views can react to live changes
- `src/context/AuthContext.jsx` — session persisted in `localStorage` (`artha_member_id`); survives page refresh

**Schema quirks (actual DB differs from original plan):**
- `members.pin` (not `pin_hash`)
- `members.tier` — nullable (ALTER TABLE members ALTER COLUMN tier DROP NOT NULL)
- `rewards.emoji` — added via ALTER TABLE
- `chore_logs.completed_at`, `approved_at` — bigint (Unix ms), not timestamptz
- `reward_requests.requested_at`, `resolved_at` — bigint (Unix ms)
- `payslips.created_at` — timestamptz (ISO string)

**Realtime pattern:**
```js
supabase.channel('family-sync')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'chore_logs' }, loadFamily)
  // ... all 7 tables, no filters (filters require REPLICA IDENTITY FULL)
  .subscribe()
```
Views that have their own local state (e.g. Chores.jsx logMap) watch `reloadCount` from FamilyContext to re-fetch when Realtime fires.

---

### Also completed in Session 9

#### Credit score weekly popup (child-facing)
- `src/components/CreditScorePopup.jsx` — bottom sheet with animated arc gauge, delta chip, band message, how-to-improve list, tip
- Shown once per pay period on child Home mount
- Trigger: `member.lastCreditPopupPeriod !== currentPeriodEnd`
- After "Got it!": calls `markCreditPopupSeen(memberId, periodEnd)` → writes `last_credit_popup_period` to Supabase
- Score bands: Excellent (750+), Good (650+), Fair (500+), Poor (350+), Bad (300+)
- Delta = `member.creditScore - latestPayslip.creditScore`

#### Child logout button
- `src/components/ChildNav.jsx` — "Exit" button added to child bottom nav
- Calls `logout()` + navigates to `/`
- Auth session persisted in localStorage so refresh no longer logs users out

---

## Session 8 completed (2026-04-12)

### Phase 2 features implemented

#### 1. Credit score (300–850)

Events and deltas:
- Mandatory chore approved (Tier 1 or Tier 2): **+2**
- Mandatory chore rejected: **−5**
- Payslip — perfect completion (100%): **+10**
- Payslip — <50% completion: **−10**
- Payslip — loan cleared in final payment: **+5**
- Payslip — couldn't afford full scheduled repayment: **−10**
- Early repayment (partial): **+5**
- Early repayment (fully cleared): **+20**

Storage: `member.creditScore` (number, 300–850). Initialises to 500 on first delta.

Visible in:
- **Parent Dashboard**: coloured chip next to child name (green ≥700, yellow ≥500, red <500)
- **Child Home**: "★ 650" badge in header (top-right)

Implementation:
- `operations.js`: `updateCreditScore(memberId, delta)` — clamps to 300–850
- `ApproveChores.jsx`: calls `updateCreditScore` after mandatory chore approve/reject
- `approveTier1ChoreLog`: calls `updateCreditScore(+2)`
- `makeEarlyRepayment`: calls `updateCreditScore(+20 or +5)`
- `runPayslip`: calls `updateCreditScore` based on completion% and loan repayment

---

#### 2. Chore streak + payslip bonus

A streak = consecutive days (counting back from yesterday) where **every due mandatory chore** was approved. Days with no due chores are skipped without breaking the streak.

Bonus tiers applied to `adjustedSalary`:
- 3–6 days: **+5%**
- 7–13 days: **+10%**
- 14+ days: **+15%**

Visible in:
- **Child Home header**: 🔥 `Nd streak` badge (shown if streak ≥ 3)
- **Child Home projected earnings**: `🔥 +₹X streak bonus (+5%)` line
- **PayslipCard**: streak bonus row in EARNINGS section
- **Transaction history**: logged as `bonus` type with streak description

Implementation:
- `engine/chores.js`: `calculateStreak(choreLogs, mandatoryChores)` — looks back 60 days
- `engine/payslip.js`: `calculatePayslip` accepts `streakDays` param; computes `streakBonus` and `streakBonusPct`
- `runPayslip`: loads 60 days of chore logs, calls `calculateStreak`, passes to `calculatePayslip`

---

#### 3. Auto-payslip + configurable payday

**EconomicControls** additions:
- Pay period toggle now shows payday picker:
  - Weekly: 7-button day-of-week selector (Sun–Sat, default Sat)
  - Monthly: numeric input 1–28 (default 28)
- Auto-payslip toggle: "Auto-run payslips on payday" — when on, parent opening the app on payday triggers payslips for all Tier 2 children automatically

**dates.js** updated:
- `currentPeriodEnd(config)` weekly: next occurrence of `config.paydayDow` (including today)
- `currentPeriodStart(config)` weekly: `periodEnd − 6 days`
- `isPayday(config)`: matches `paydayDow` (weekly) or `paydayDom` clamped to last day of month (monthly)
- New export: `daysAgo(n)` — returns date string N days before today

**Dashboard.jsx** additions:
- On mount: if `autoPayslip && isPayday`, auto-runs `runPayslip` for all Tier 2 children (idempotent — throws swallowed if already run)
- Shows "Auto-payslips run ✓ — all children paid for this week/month" banner on success
- Credit score chip on child name row

**constants.js** additions to `DEFAULT_CONFIG`:
- `paydayDow: 6` (Saturday)
- `paydayDom: 28`
- `autoPayslip: false`

---

#### 4. Per-child economic settings

**Problem**: Previously all children shared the same tax rate, rent, savings interest, and loan interest regardless of their salary or circumstances.

**Solution**: Each child can have individual economic overrides stored as `member.config`. Falls back to `family.config` if no override set.

**EconomicControls UI** (full rework):
- Currency, Pay Period, Payday, Auto-payslip — always family-wide (top section)
- **"Same for all children" toggle** (default ON):
  - **ON**: sliders edit `family.config`; saving clears all child overrides
  - **OFF**: child selector (avatar cards) appears; editing sliders and saving writes to that child's `member.config` only
- "custom" label shown on child avatar cards that have overrides active
- **Reset to defaults** button per child when they have custom rates
- Save button label changes: "Save for [Name]" in per-child mode
- Example box shows "· [Name]" when in per-child mode

**Engine** (`runPayslip`):
- Merges `{ ...family.config, ...member.config }` into `effectiveConfig` before calling `calculatePayslip`
- Child Home projected earnings widget does the same merge

**Operations** (`operations.js`):
- `updateMemberConfig(memberId, config)` — stores economic overrides on member, pass `null` to clear

**No schema bump needed** — `member.config` is unindexed and Dexie handles it as a plain field.

---

## Architecture summary (stable)

**Salary model**: `member.baseSalary × completionPct × (1 + streakBonusPct)` = gross. Per-chore display = `baseSalary / totalWeeklyExpected`. Not stored.

**Effective economic config**: `{ ...family.config, ...(member.config ?? {}) }`. Computed in `runPayslip` and in child Home projected earnings. Never stored — always derived at runtime.

**Credit score**: Stored on `member.creditScore`. Range 300–850, init 500.

**Bonus chores**: Approved → `approveBonusChoreLog` → spending wallet immediately. Not via payslip. Does NOT affect credit score.

**Tier 1 chores**: Approved → `approveTier1ChoreLog` → `goalJar.balance` + credit +2. Coin = `baseSalary / totalWeeklyExpected`.

**Loan lifecycle**:
1. `giveLoan` → `accounts.loan = { outstanding, weeklyRepayment, interestFree }`; spending credited immediately
2. Each payslip: interest accrues → repayment deducts → if outstanding = 0, `accounts.loan = null`
3. Prepayment: `makeEarlyRepayment` → spending debited → credit score updated → if 0, loan null
4. Loan null → chip disappears from all UIs

**Period**: `currentPeriodEnd` uses `config.paydayDow` / `config.paydayDom`. Default = Saturday / day 28.

**Currency**: `useCurrency()` from FamilyContext. Never call `formatRupees` in views.

---

## Route map

```
/parent              ParentDashboard
/parent/approve      ApproveChores
/parent/chores       ChoreManager
/parent/members      Members
/parent/loans        Loans
/parent/more         More
/parent/utilities    UtilityLogger
/parent/economy      EconomicControls
/parent/rewards      RewardManager
/parent/tax-fund     TaxFund
/parent/backup       Backup
/child/home          Tier2Home
/child/chores        Chores
/child/payslip       Payslip
/child/savings       Savings
/child/goal          GoalJar
/child/rewards       Rewards
/child/history       History
/child/jar           CoinJar (Tier 1)
```

---

## Known issues / low priority
- `formatRupees` in `currency.js` is a dead legacy alias — safe to delete eventually
- Some hardcoded "week" strings in `Savings.jsx` stat labels (cosmetic)
- Credit score not shown on Tier 1 child view (by design — they don't see numbers)

---

## Phase 2 backlog (next to build)

### Device-tied account flow (invite code / QR) — next priority

**Problem**: Currently any device that knows the URL can see all family accounts. Children can accidentally switch to the parent account. No device identity.

**Desired UX**:
1. First open on a new device → "Join a family" screen with a code entry field
2. Parent generates a 6-digit invite code in their app (expires in 10 mins)
3. Child enters code → device is tied to that family, shows only child accounts (not parent)
4. Returning to the app skips the code step — device remembers the family
5. QR code option: parent shows QR on their screen, child scans with camera

**Data model** (two new Supabase tables):
```sql
join_codes (code text PK, family_id text, created_at timestamptz, expires_at timestamptz)
device_claims (device_id text PK, family_id text, claimed_at timestamptz)
```

**Implementation**:
- `device_id` = UUID generated once and stored in `localStorage` (`artha_device_id`)
- On app load: check `localStorage` for `device_id` → query `device_claims` → if found, load that family; if not, show "Join a family" screen
- Parent generates code: `Math.random().toString(36).slice(2,8).toUpperCase()` → insert into `join_codes` with 10-min expiry
- Child enters code: look up `join_codes`, check not expired, insert into `device_claims`, redirect to member selection showing only children
- Parent device: shows all members (parent + children)
- Child device: shows only children from the family

**Files to create/change**:
- New `src/views/auth/JoinFamily.jsx` — code entry screen
- New `src/views/parent/InviteCode.jsx` — shows generated code + QR (use `qrcode.react` package)
- `src/db/operations.js` — `generateJoinCode(familyId)`, `claimDevice(code, deviceId)`, `getDeviceClaim(deviceId)`
- `src/main.jsx` — check device claim before rendering, pass `familyId` and `allowedRoles` to app
- `src/auth/PinAuth.jsx` — filter members shown based on device claim

---

### Weekly credit score summary popup (child-facing)

**What**: Once per pay period, when the child opens the app, show a full-screen or bottom-sheet modal summarising:
- Their credit score (current number + visual indicator 300–850)
- Delta vs last period: e.g. "+35 this week" (green) or "−20 this week" (red)
- A plain-language explanation of **what caused** the change (e.g. "You completed all chores 4 days in a row", "You missed a loan repayment")
- **Consequences tied to their current score band**:

| Band        | Score  | Message shown to child |
|-------------|--------|------------------------|
| Excellent   | 750–850 | "Your credit is excellent! You qualify for interest-free loans and lower rent." |
| Good        | 650–749 | "Your credit is good. You get standard rates." |
| Fair        | 500–649 | "Your credit is fair. Work on completing chores to improve it." |
| Poor        | 350–499 | "Your credit is poor. Loan interest rates may be higher and penalties stricter." |
| Bad         | 300–349 | "Your credit is bad. You may not qualify for loans until this improves." |

- A forward-looking tip: e.g. "Complete all chores this week to earn +10 next payslip."

**Trigger logic**:
- Show once per pay period — store `member.lastCreditPopupPeriod` (the `periodEnd` string of the last shown popup)
- On child Home mount: if `lastCreditPopupPeriod !== currentPeriodEnd`, show the popup
- After dismissal: write `lastCreditPopupPeriod = currentPeriodEnd` to member record
- Only for Tier 2 (Tier 1 children don't see numbers)

**Score delta**:
- Need to store `member.prevCreditScore` at the start of each period, or derive it from payslip history
- Simplest approach: read the `creditScore` field from the most recent payslip (already stored as `payslip.creditScore` — this is the score at the *time the payslip was saved*). Compare to `member.creditScore` now.
- Delta = `member.creditScore - latestPayslip.creditScore`

**Implementation files**:
- New component: `src/components/CreditScorePopup.jsx` — bottom sheet with score ring/bar, delta, band message, tip
- `src/views/child-tier2/Home.jsx` — load latest payslip on mount, compare scores, conditionally render `<CreditScorePopup>`
- `src/db/operations.js` — add `markCreditPopupSeen(memberId, periodEnd)` → sets `member.lastCreditPopupPeriod`

**Design notes**:
- Score ring: large circular or arc indicator, coloured by band (green/yellow/orange/red)
- Delta shown as `+35 ▲` or `−20 ▼` with matching colour
- Band label shown prominently (e.g. "FAIR CREDIT")
- Consequences shown as 2–3 bullet points (not a table — keep it friendly)
- Tip shown in a dimmer style at the bottom
- One dismiss button: "Got it" — writes the seen marker
- Animation: slide up from bottom, score number counts up from previous value

---

## Phase 3 — Supabase backend (multi-device sync)

**Goal**: Any family member's device sees live data. Parent approves on their phone → child's screen updates in ~200ms.

### Why this is needed
Currently all data lives in IndexedDB on one device. Multi-device requires a shared backend.

### Architecture

```
React + Vite (unchanged)
  ↕ Supabase JS client (replaces Dexie)
Supabase
  PostgreSQL   — family data (replaces IndexedDB)
  Auth         — parent email/password account
  Realtime     — WebSocket subscriptions → live sync
  Storage      — future: avatar images, PDF payslips
```

### Database schema (Postgres)
All tables have a `family_id` foreign key. `accounts` and `config` fields stay as `jsonb` — no normalization needed.

```sql
families        (id, name, config jsonb, tax_fund_balance, tax_fund_history jsonb)
members         (id, family_id, name, avatar, tier, role, pin_hash,
                 base_salary, accounts jsonb, config jsonb,
                 credit_score, last_credit_popup_period)
chores          (id, family_id, title, type, recurrence, days_per_week,
                 value, assigned_to jsonb, is_active)
chore_logs      (id, chore_id, member_id, date, status, completed_at, approved_at)
transactions    (id, member_id, type, amount, description, date, related_id)
payslips        (id, member_id, period_start, period_end, earnings jsonb,
                 deductions jsonb, gross, net, allocations jsonb,
                 interest_earned, loan_outstanding_after, balances_after jsonb,
                 credit_score, created_at)
rewards         (id, family_id, title, category, cost, is_active)
reward_requests (id, member_id, reward_id, reward_title, amount,
                 status, requested_at, resolved_at)
utility_charges (id, member_id, date, reason, amount)
```

### Row-level security
Every table has a policy scoping reads/writes to the authenticated family:
```sql
create policy "family isolation" on members
  using (family_id = (select family_id from members
    where id = auth.uid()));
```

### Auth model
- **Parent**: real Supabase account (email + password). Signs up once, family row created automatically.
- **Children**: no Supabase accounts. Parent session stays active on device. PIN switching is UI-only — PIN checked against `member.pin_hash` from DB, same as today.
- On child's device: parent logs in once, session persists, child picks profile + enters PIN.

### Files that change
- `src/db/schema.js` — replaced with `src/db/supabase.js` (client init)
- `src/db/operations.js` — all ~40 functions rewritten to Supabase client calls
- `src/context/FamilyContext.jsx` — add Supabase Realtime channel; `reload()` becomes a subscription callback
- `src/context/AuthContext.jsx` — replace Dexie member lookup with Supabase session + member query
- New: `src/views/auth/Login.jsx` — simple email/password + "create family" screen

### Files that don't change
Everything in `views/` (except new Login), all of `engine/`, `components/`, `utils/`. The UI is fully decoupled from the data layer.

### Realtime pattern (FamilyContext)
```js
supabase.channel('family-sync')
  .on('postgres_changes', { table: 'members',    filter: `family_id=eq.${id}` }, reload)
  .on('postgres_changes', { table: 'chore_logs', filter: `member_id=in.(${childIds})` }, reload)
  .on('postgres_changes', { table: 'payslips',   filter: `member_id=in.(${childIds})` }, reload)
  .subscribe()
```

### Migration path for existing families
The Backup/Restore feature already exports all data as JSON. A one-time migration tool reads that JSON and POSTs to Supabase. Users run it once.

### Estimated effort
| Task | Time |
|---|---|
| Supabase project + schema + RLS | 3–4 hrs |
| Auth + Login screen | 2–3 hrs |
| `operations.js` rewrite (~40 functions) | 4–6 hrs |
| FamilyContext realtime | 2–3 hrs |
| Migration tool (backup JSON → Supabase) | 1–2 hrs |
| Testing across devices | 3–4 hrs |
| **Total** | **~15–22 hrs** |

---

## Phase 4 — Capacitor + App Store / Play Store

**Goal**: Real native app listing on both stores. Keep the entire React codebase — Capacitor wraps it in a native WebView shell.

### Why Capacitor, not React Native
React Native requires rewriting every UI component (different primitives, no Tailwind). Capacitor wraps the existing Vite build as-is. ~95% of the codebase is untouched.

### How it works
```bash
npm install @capacitor/core @capacitor/cli
npx cap add ios      # generates ios/ Xcode project
npx cap add android  # generates android/ Android Studio project

# Every release:
npm run build
npx cap sync         # copies dist/ into native projects
# → Xcode → archive → App Store Connect
# → Android Studio → build .aab → Play Store
```

### Native plugins to add
| Plugin | Purpose |
|---|---|
| `@capacitor/push-notifications` | Payday reminder, chore approval alert |
| `@capacitor/biometrics` | Face ID / fingerprint replaces PIN entry |
| `@capacitor/haptics` | Tap feedback on chore approval, coin jar |
| `@capacitor/app` | Handle back button on Android |

### What you need to publish
| Item | Cost |
|---|---|
| Apple Developer Program | $99/yr (needs a Mac + Xcode) |
| Google Play Developer | $25 one-time |
| Supabase Pro (at scale) | $25/mo (free tier: ~500 families) |
| RevenueCat (subscriptions) | Free up to $2.5k/mo revenue |
| Privacy policy | Free (generator) — required by both stores |

### Monetisation
Free tier (1 child) + subscription for additional children. RevenueCat abstracts App Store and Play Store purchase APIs into one SDK — define products once, works on both platforms.

### App Store specifics
- Age rating: **4+** (educational, no social features, no user-generated public content)
- Category: Education or Finance
- Apple review: 1–3 days for first submission; use TestFlight for family beta first
- Google Play: internal track available immediately; production review 2–7 days

### Estimated effort (after Phase 3 is done)
| Task | Time |
|---|---|
| Capacitor setup + config | 2–3 hrs |
| Push notification integration | 3–4 hrs |
| Biometric auth (optional but polished) | 2–3 hrs |
| Onboarding / "create family" flow | 3–4 hrs |
| App icons, splash screens, screenshots | 2–3 hrs |
| RevenueCat + subscription gates | 4–6 hrs |
| TestFlight beta + feedback | ongoing |
| **Total** | **~16–23 hrs** |
