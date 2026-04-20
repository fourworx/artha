import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FamilyProvider, useFamily } from './context/FamilyContext'
import { getPendingLogsForMembers, getPendingMemberRequests, getDeviceClaim, getOrCreateDeviceId, checkFamilyExists, getLatestPayslip } from './db/operations'
import { supabase } from './db/supabase'
import { FAMILY_ID } from './utils/constants'
import ParentNav from './components/ParentNav'
import ChildNav from './components/ChildNav'
import InstallPrompt from './components/InstallPrompt'
import JoinFamily from './views/auth/JoinFamily'
import Onboarding from './views/onboarding/Onboarding'

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
import Expenses         from './views/parent/Expenses'

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

import { DeviceContext } from './context/DeviceContext'
export { useDevice } from './context/DeviceContext'

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

// Runs before any routing. Routes to:
//   'onboarding' → no family exists yet (brand new install)
//   'join'       → family exists but this device is unclaimed
//   'ready'      → device is claimed, proceed to app
function DeviceGate({ children }) {
  const cached = readCachedClaim()
  const [screen, setScreen] = useState(cached ? 'ready' : 'checking')
  const [claim,  setClaim]  = useState(cached)

  useEffect(() => {
    if (cached) return // already ready, skip async check
    Promise.all([getDeviceClaim(), checkFamilyExists()])
      .then(([c, familyExists]) => {
        if (c) {
          writeCachedClaim(c)
          setClaim(c)
          setScreen('ready')
        } else if (!familyExists) {
          setScreen('onboarding')
        } else {
          setScreen('join')
        }
      })
      .catch(() => setScreen('join'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClaimed = (c) => {
    writeCachedClaim(c)
    setClaim(c)
    setScreen('ready')
  }

  if (screen === 'checking') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>
        Loading...
      </span>
    </div>
  )

  if (screen === 'onboarding') return (
    <Onboarding
      onComplete={handleClaimed}
      onJoinInstead={() => setScreen('join')}
    />
  )

  if (screen === 'join') return (
    <JoinFamily
      onClaimed={handleClaimed}
      onSkip={async () => {
        const deviceId = getOrCreateDeviceId()
        await supabase.from('device_claims').upsert({
          device_id: deviceId, family_id: FAMILY_ID,
          member_id: null, claimed_at: new Date().toISOString(),
        })
        handleClaimed({ deviceId, familyId: FAMILY_ID, memberId: null })
      }}
    />
  )

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
  const [hasDraftPayslip, setHasDraftPayslip] = useState(false)

  const checkDraft = useCallback(async () => {
    if (!currentMember) return
    const ps = await getLatestPayslip(currentMember.id).catch(() => null)
    setHasDraftPayslip(ps?.status === 'draft')
  }, [currentMember?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { checkDraft() }, [checkDraft])

  if (!currentMember || currentMember.role !== 'child' || currentMember.tier < 2) {
    return <Navigate to="/" replace />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
        <Outlet />
      </div>
      <ChildNav hasDraftPayslip={hasDraftPayslip} />
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
              <Route path="expenses"        element={<Expenses />} />
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
