import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getFamily, getMembers, getChores, getRewards } from '../db/operations'
import { supabase } from '../db/supabase'
import { FAMILY_ID, DEFAULT_CONFIG } from '../utils/constants'
import { formatCurrency } from '../utils/currency'
import { currentPeriodStart, currentPeriodEnd, isPayday, periodLabel } from '../utils/dates'

const FamilyContext = createContext(null)

export function FamilyProvider({ children }) {
  const [family,      setFamily]      = useState(null)
  const [members,     setMembers]     = useState([])
  const [chores,      setChores]      = useState([])
  const [rewards,     setRewards]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [reloadCount, setReloadCount] = useState(0)

  const loadFamily = useCallback(async () => {
    setLoading(true)
    try {
      const [fam, mems, chs, rews] = await Promise.all([
        getFamily(FAMILY_ID),
        getMembers(FAMILY_ID),
        getChores(FAMILY_ID),
        getRewards(FAMILY_ID),
      ])
      console.log('[Artha] loadFamily:', { family: fam?.id, members: mems?.length, chores: chs?.length })
      setFamily(fam)
      setMembers(mems)
      setChores(chs)
      setRewards(rews)
      setReloadCount(c => c + 1)
    } catch (err) {
      console.error('[Artha] loadFamily error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFamily() }, [loadFamily])

  // ── Realtime subscription ────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('family-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' }, loadFamily)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, loadFamily)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, loadFamily)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, loadFamily)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chore_logs' }, loadFamily)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payslips' }, loadFamily)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_requests' }, loadFamily)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
      reloadCount,
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

/**
 * Returns a formatter function that uses the family's configured currency.
 * Usage: const fmt = useCurrency()  →  fmt(amount)
 */
export function useCurrency() {
  const { family } = useFamily()
  const currency = family?.config?.currency ?? DEFAULT_CONFIG.currency
  return useCallback(
    (amount, opts) => formatCurrency(amount, currency, opts),
    [currency]
  )
}

/**
 * Returns current period dates and payday status derived from family config.
 */
export function usePeriod() {
  const { family } = useFamily()
  const config = family?.config ?? DEFAULT_CONFIG
  return useMemo(() => ({
    periodStart:  currentPeriodStart(config),
    periodEnd:    currentPeriodEnd(config),
    paydayToday:  isPayday(config),
    payPeriod:    config.payPeriod ?? 'weekly',
    label:        periodLabel(config),   // 'week' | 'month'
  }), [config])
}
