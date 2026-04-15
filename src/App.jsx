import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FamilyProvider, useFamily } from './context/FamilyContext'
import { getPendingLogsForMembers, getPendingMemberRequests, getDeviceClaim, getOrCreateDeviceId } from './db/operations'
import { supabase } from './db/supabase'
import { FAMILY_ID } from './utils/constants'
import ParentNav from './components/ParentNav'
import ChildNav from './components/ChildNav'
import InstallPrompt from './components/InstallPrompt'
import JoinFamily from './views/auth/JoinFamily'

// Auth
import PinAuth from './auth/PinAuth'

// Parent views
import ParentDashboard  from './views/parent/Dashboard'
import ChoreManager     from './views/parent/ChoreManager'
import ApproveChores    from './views/parent/ApproveChores'
import UtilityLogger    from './views/parent/UtilityLogger'
import EconomicControls from './views/parent/EconomicControls'
import RewardManager    from './views/parent/RewardManager'
import TaxFund          from './views/parent/TaxFund'
import More             from './views/parent/More'
import Backup           from './views/parent/Backup'
import Members          from './views/parent/Members'
import Loans            from './views/parent/Loans'
import ChildDetail      from './views/parent/ChildDetail'
import InviteCode       from './views/parent/InviteCode'

// Child Tier 2 views
import Tier2Home  from './views/child-tier2/Home'
import Chores     from './views/child-tier2/Chores'
import Ledger     from './views/child-tier2/Ledger'
import Savings    from './views/child-tier2/Savings'
import GoalJar    from './views/child-tier2/GoalJar'
import FamilyFund from './views/child-tier2/FamilyFund'
import Rewards    from './views/child-tier2/Rewards'
import History    from './views/child-tier2/History'

// Child Tier 1
import CoinJar from './views/child-tier1/CoinJar'

// ── Device context ────────────────────────────────────────────────────────────
export const DeviceContext = createContext(null)
export function useDevice() { return useContext(DeviceContext) }

// ── Device gate ───────────────────────────────────────────────────────────────
// localStorage key for persisting the claim so it's synchronous on return visits
const CLAIM_KEY = 'artha_device_claim'

function readCachedClaim() {
  try {
    const raw = localStorage.getItem(CLAIM_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeCachedClaim(claim) {
  try { localStorage.setItem(CLAIM_KEY, JSON.stringify(claim)) } catch {}
}

function saveClaim(setClaim) {
  return (claim) => {
    writeCachedClaim(claim)
    setClaim(claim)
  }
}

// Runs before any routing. If this device has never been claimed,
// show JoinFamily until the code is entered (or parent bypass used).
function DeviceGate({ children }) {
  // Initialise synchronously from localStorage — no loading flash for returning devices
  const [claim, setClaimRaw] = useState(() => readCachedClaim())
  const setClaim = saveClaim(setClaimRaw)

  useEffect(() => {
    // If we already have a cached claim, verify it against Supabase in the background
    // (in case it was revoked) but don't block rendering
    if (readCachedClaim()) return

    // New device — query Supabase
    getDeviceClaim()
      .then(c => { if (c) setClaim(c) else setClaimRaw(null) })
      .catch(() => setClaimRaw(null))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // claim === null  →  unclaimed device, show join screen
  // claim === obj   →  claimed, proceed
  if (claim === null) {
    const handleSkip = async () => {
      const deviceId = getOrCreateDeviceId()
      await supabase.from('device_claims').upsert({
        device_id: deviceId,
        family_id: FAMILY_ID,
        member_id: null,
        claimed_at: new Date().toISOString(),
      })
      setClaim({ deviceId, familyId: FAMILY_ID, memberId: null })
    }
    return <JoinFamily onClaimed={setClaim} onSkip={handleSkip} />
  }

  // claim is truthy — device is known (or localStorage was populated)
  return (
    <DeviceContext.Provider value={claim}>
      {children}
    </DeviceContext.Provider>
  )
}

// ── Placeholder ───────────────────────────────────────────────────────────────
function ComingSoon({ label }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
        {label} — coming soon
      </p>
    </div>
  )
}

// ── Parent shell ──────────────────────────────────────────────────────────────
function ParentShell() {
  const { currentMember } = useAuth()
  const { children } = useFamily()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!children.length) return
    const ids = children.map(c => c.id)
    Promise.all([
      getPendingLogsForMembers(ids),
      getPendingMemberRequests(ids),
    ]).then(([logs, memberReqs]) => setPendingCount(logs.length + memberReqs.length))
  }, [children])

  if (!currentMember || currentMember.role !== 'parent') return <Navigate to="/" replace />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
        <Outlet />
      </div>
      <ParentNav pendingCount={pendingCount} />
    </div>
  )
}

// ── Tier 2 child shell ────────────────────────────────────────────────────────
function Tier2Shell() {
  const { currentMember } = useAuth()
  if (!currentMember || currentMember.role !== 'child' || currentMember.tier < 2) {
    return <Navigate to="/" replace />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
        <Outlet />
      </div>
      <ChildNav />
    </div>
  )
}

// ── Tier 1 guard ──────────────────────────────────────────────────────────────
function Tier1Guard() {
  const { currentMember } = useAuth()
  if (!currentMember || currentMember.role !== 'child' || currentMember.tier !== 1) {
    return <Navigate to="/" replace />
  }
  return <CoinJar />
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <FamilyProvider>
        <DeviceGate>
        <AuthProvider>
          <InstallPrompt />
        <Routes>
            <Route path="/" element={<PinAuth />} />

            {/* Parent routes */}
            <Route path="/parent" element={<ParentShell />}>
              <Route index           element={<ParentDashboard />} />
              <Route path="chores"   element={<ChoreManager />} />
              <Route path="approve"  element={<ApproveChores />} />
              <Route path="more"     element={<More />} />
              <Route path="utilities" element={<UtilityLogger />} />
              <Route path="economy"  element={<EconomicControls />} />
              <Route path="rewards"  element={<RewardManager />} />
              <Route path="tax-fund" element={<TaxFund />} />
              <Route path="backup"   element={<Backup />} />
              <Route path="members"     element={<Members />} />
              <Route path="loans"       element={<Loans />} />
              <Route path="invite-code" element={<InviteCode />} />
              <Route path="child/:memberId" element={<ChildDetail />} />
            </Route>

            {/* Tier 2+ child routes */}
            <Route path="/child" element={<Tier2Shell />}>
              <Route path="home"    element={<Tier2Home />} />
              <Route path="chores"  element={<Chores />} />
              <Route path="ledger"  element={<Ledger />} />
              <Route path="payslip" element={<Navigate to="/child/ledger" replace />} />
              <Route path="savings" element={<Savings />} />
              <Route path="goal"        element={<GoalJar />} />
              <Route path="family-fund" element={<FamilyFund />} />
              <Route path="rewards" element={<Rewards />} />
              <Route path="history" element={<Navigate to="/child/ledger" replace />} />
            </Route>

            {/* Tier 1 */}
            <Route path="/child/jar" element={<Tier1Guard />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
        </DeviceGate>
      </FamilyProvider>
    </BrowserRouter>
  )
}
