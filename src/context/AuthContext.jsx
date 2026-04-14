import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getMember } from '../db/operations'
import { verifyPin } from '../auth/pinUtils'

const AuthContext = createContext(null)
const STORAGE_KEY = 'artha_member_id'

export function AuthProvider({ children }) {
  const [currentMember, setCurrentMember] = useState(null)
  const [loginError, setLoginError]       = useState(null)
  const [restoring, setRestoring]         = useState(true)

  // ── Restore session from localStorage on mount ──────────────────
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) { setRestoring(false); return }
    getMember(saved)
      .then(member => { if (member) setCurrentMember(member) })
      .catch(() => {})
      .finally(() => setRestoring(false))
  }, [])

  const login = useCallback(async (memberId, rawPin) => {
    setLoginError(null)
    try {
      const member = await getMember(memberId)
      if (!member) { setLoginError('Member not found'); return false }
      const valid = await verifyPin(rawPin, member.pin)
      if (!valid) { setLoginError('Wrong PIN'); return false }
      setCurrentMember(member)
      localStorage.setItem(STORAGE_KEY, member.id)
      return true
    } catch {
      setLoginError('Something went wrong')
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setCurrentMember(null)
    setLoginError(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const refreshMember = useCallback(async () => {
    if (!currentMember) return
    const updated = await getMember(currentMember.id)
    if (updated) setCurrentMember(updated)
  }, [currentMember])

  if (restoring) return null  // brief blank while restoring — avoids flash to login

  return (
    <AuthContext.Provider value={{ currentMember, login, logout, loginError, setLoginError, refreshMember }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
