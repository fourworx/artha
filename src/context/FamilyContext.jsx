import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getFamily, getMembers, getChores, getRewards } from '../db/operations'
import { FAMILY_ID } from '../utils/constants'

const FamilyContext = createContext(null)

export function FamilyProvider({ children }) {
  const [family, setFamily] = useState(null)
  const [members, setMembers] = useState([])
  const [chores, setChores] = useState([])
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)

  const loadFamily = useCallback(async () => {
    setLoading(true)
    try {
      const [fam, mems, chs, rews] = await Promise.all([
        getFamily(FAMILY_ID),
        getMembers(FAMILY_ID),
        getChores(FAMILY_ID),
        getRewards(FAMILY_ID),
      ])
      setFamily(fam)
      setMembers(mems)
      setChores(chs)
      setRewards(rews)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFamily()
  }, [loadFamily])

  const children_ = members.filter(m => m.role === 'child')
  const parents   = members.filter(m => m.role === 'parent')

  return (
    <FamilyContext.Provider value={{
      family,
      members,
      children: children_,
      parents,
      chores,
      rewards,
      loading,
      reload: loadFamily,
    }}>
      {children}
    </FamilyContext.Provider>
  )
}

export const useFamily = () => {
  const ctx = useContext(FamilyContext)
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider')
  return ctx
}
