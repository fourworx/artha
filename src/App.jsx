import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FamilyProvider } from './context/FamilyContext'
import PinAuth from './auth/PinAuth'
import ParentDashboard from './views/parent/Dashboard'
import Tier2Home from './views/child-tier2/Home'
import CoinJar from './views/child-tier1/CoinJar'

// ── Route guard — redirect to login if not authenticated ──────────────────────
function Protected({ children, allowedRoles, allowedTiers }) {
  const { currentMember } = useAuth()

  if (!currentMember) return <Navigate to="/" replace />

  if (allowedRoles && !allowedRoles.includes(currentMember.role)) {
    return <Navigate to="/" replace />
  }

  if (allowedTiers && !allowedTiers.includes(currentMember.tier)) {
    return <Navigate to="/" replace />
  }

  return children
}

// ── Placeholder for screens being built in later sessions ─────────────────────
function ComingSoon({ label }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
        {label} — coming in Session 2+
      </p>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <FamilyProvider>
        <AuthProvider>
          <Routes>
            {/* Login */}
            <Route path="/" element={<PinAuth />} />

            {/* Parent routes */}
            <Route path="/parent" element={
              <Protected allowedRoles={['parent']}>
                <ParentDashboard />
              </Protected>
            } />
            <Route path="/parent/chores" element={
              <Protected allowedRoles={['parent']}>
                <ComingSoon label="Chore Manager" />
              </Protected>
            } />
            <Route path="/parent/approve" element={
              <Protected allowedRoles={['parent']}>
                <ComingSoon label="Approve Chores" />
              </Protected>
            } />
            <Route path="/parent/utilities" element={
              <Protected allowedRoles={['parent']}>
                <ComingSoon label="Utility Logger" />
              </Protected>
            } />
            <Route path="/parent/economy" element={
              <Protected allowedRoles={['parent']}>
                <ComingSoon label="Economic Controls" />
              </Protected>
            } />
            <Route path="/parent/rewards" element={
              <Protected allowedRoles={['parent']}>
                <ComingSoon label="Reward Manager" />
              </Protected>
            } />
            <Route path="/parent/tax-fund" element={
              <Protected allowedRoles={['parent']}>
                <ComingSoon label="Tax Fund" />
              </Protected>
            } />
            <Route path="/parent/child/:memberId" element={
              <Protected allowedRoles={['parent']}>
                <ComingSoon label="Child Detail" />
              </Protected>
            } />

            {/* Tier 1 child routes */}
            <Route path="/child/jar" element={
              <Protected allowedRoles={['child']} allowedTiers={[1]}>
                <CoinJar />
              </Protected>
            } />

            {/* Tier 2 child routes */}
            <Route path="/child/home" element={
              <Protected allowedRoles={['child']} allowedTiers={[2, 3, 4]}>
                <Tier2Home />
              </Protected>
            } />
            <Route path="/child/chores" element={
              <Protected allowedRoles={['child']} allowedTiers={[2, 3, 4]}>
                <ComingSoon label="Chores" />
              </Protected>
            } />
            <Route path="/child/payslip" element={
              <Protected allowedRoles={['child']} allowedTiers={[2, 3, 4]}>
                <ComingSoon label="Payslip" />
              </Protected>
            } />
            <Route path="/child/savings" element={
              <Protected allowedRoles={['child']} allowedTiers={[2, 3, 4]}>
                <ComingSoon label="Savings" />
              </Protected>
            } />
            <Route path="/child/goal" element={
              <Protected allowedRoles={['child']} allowedTiers={[2, 3, 4]}>
                <ComingSoon label="Goal Jar" />
              </Protected>
            } />
            <Route path="/child/rewards" element={
              <Protected allowedRoles={['child']} allowedTiers={[2, 3, 4]}>
                <ComingSoon label="Rewards" />
              </Protected>
            } />
            <Route path="/child/history" element={
              <Protected allowedRoles={['child']} allowedTiers={[2, 3, 4]}>
                <ComingSoon label="History" />
              </Protected>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </FamilyProvider>
    </BrowserRouter>
  )
}
