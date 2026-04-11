import { createContext, useContext, useState, useCallback } from 'react'
import { getMember } from '../db/operations'
import { verifyPin } from '../auth/pinUtils'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentMember, setCurrentMember] = useState(null)
  const [loginError, setLoginError] = useState(null)

  const login = useCallback(async (memberId, rawPin) => {
    setLoginError(null)
    try {
      const member = await getMember(memberId)
      if (!member) {
        setLoginError('Member not found')
        return false
      }
      const valid = await verifyPin(rawPin, member.pin)
      if (!valid) {
        setLoginError('Wrong PIN')
        return false
      }
      setCurrentMember(member)
      return true
    } catch (err) {
      setLoginError('Something went wrong')
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setCurrentMember(null)
    setLoginError(null)
  }, [])

  // Refresh current member from DB (e.g. after balance update)
  const refreshMember = useCallback(async () => {
    if (!currentMember) return
    const updated = await getMember(currentMember.id)
    if (updated) setCurrentMember(updated)
  }, [currentMember])

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
