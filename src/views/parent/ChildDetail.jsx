import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFamily, useCurrency, usePeriod } from '../../context/FamilyContext'
import { getPayslips, getTransactionsForPeriod, getTransactions, parentDonate, parentSubGoalWithdrawal, parentDepositToSavings, parentDepositToSubGoal, transferSavingsToWallet, parentWalletWithdrawal } from '../../db/operations'
import { settlePayslip } from '../../engine/payslip'
import PayslipCard from '../../components/PayslipCard'
import { displayDate, today } from '../../utils/dates'
import { ChevronLeft, ChevronDown, ChevronUp, ChevronRight, Heart, Target, ArrowDownToLine, ArrowUpFromLine, Banknote, PiggyBank, X } from 'lucide-react'
import NetWorthChart from '../../components/NetWorthChart'
import SpendingBreakdown from '../../components/SpendingBreakdown'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CreditScoreLineChart } from '../child-tier2/Home'

const TYPE_META = {
  salary:        { label: 'Salary',            emoji: '💼', color: 'var(--positive)' },
  bonus:         { label: 'Bonus',             emoji: '⚡', color: 'var(--positive)' },
  parent_bonus:  { label: 'Bonus from parent', emoji: '🎁', color: 'var(--positive)' },
  loan_credit:   { label: 'Loan received',     emoji: '🤝', color: 'var(--positive)' },
  interest:      { label: 'Interest',          emoji: '📈', color: 'var(--positive)' },
  deposit:       { label: 'Deposit',           emoji: '🏦', color: 'var(--positive)' },
  tax:           { label: 'Tax',               emoji: '🏛',  color: 'var(--negative)' },
  rent:          { label: 'Rent',              emoji: '🏠', color: 'var(--negative)' },
  utility:       { label: 'Utility',           emoji: '💡', color: 'var(--negative)' },
  reward:        { label: 'Reward',            emoji: '🛍', color: 'var(--negative)' },
  loan_repay:    { label: 'Loan repayment',    emoji: '🔄', color: 'var(--negative)' },
  loan_cleared:  { label: 'Loan cleared',      emoji: '🎉', color: 'var(--positive)' },
  loan_interest: { label: 'Loan interest',     emoji: '📉', color: 'var(--negative)' },
  withdrawal:    { label: 'Withdrawal',        emoji: '💸', color: 'var(--negative)' },
}

function periodId(periodEnd) {
  const d = new Date(periodEnd + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '-')
}

function PeriodTxs({ memberId, periodStart, periodEnd }) {
  const fmt = useCurrency()
  const [txs,     setTxs]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTransactionsForPeriod(memberId, periodStart, periodEnd).then(data => {
      setTxs(data)
      setLoading(false)
    })
  }, [memberId, periodStart, periodEnd])

  if (loading) return (
    <p className="text-xs font-mono text-center py-3" style={{ color: 'var(--text-dim)' }}>
      Loading transactions...
    </p>
  )
  if (!txs?.length) return (
    <p className="text-xs font-mono text-center py-3" style={{ color: 'var(--text-dim)' }}>
      No transactions for this period
    </p>
  )

  return (
    <div className="flex flex-col gap-1.5 mt-3">
      <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>TRANSACTIONS</p>
      {txs.map(tx => {
        const meta = TYPE_META[tx.type] ?? { label: tx.type, emoji: '•', color: 'var(--text-muted)' }
        return (
          <div key={tx.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
            <span className="text-base shrink-0">{meta.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                {tx.description}
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                {meta.label} · {displayDate(tx.date)}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold shrink-0" style={{ color: meta.color }}>
              {tx.amount > 0 ? '+' : ''}{fmt(tx.amount)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ChildDetail() {
  const { memberId }  = useParams()
  const navigate      = useNavigate()
  const { children, reload } = useFamily()
  const fmt           = useCurrency()
  const { periodStart, periodEnd, label: periodLabel } = usePeriod()

  const child = children.find(c => c.id === memberId)

  const [payslips,      setPayslips]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [expanded,      setExpanded]      = useState(null)
  const [periodSummary, setPeriodSummary] = useState(null)
  const [settling,      setSettling]      = useState(null)
  const [settleError,   setSettleError]   = useState(null)
  const [allTxs,        setAllTxs]        = useState([])

  const [showNetWorth,  setShowNetWorth]  = useState(false)

  // Parent-direct money actions
  const [activeSheet,   setActiveSheet]   = useState(null) // 'donate'|'savingsToWallet'|'walletToSavings'|'walletWithdraw'|'subGoalDeposit'|'subGoalWithdraw'
  const [sheetAmount,   setSheetAmount]   = useState('')
  const [sheetNote,     setSheetNote]     = useState('')   // charity name or withdrawal dest
  const [sheetSubGoal,  setSheetSubGoal]  = useState(null) // subGoal object for goal sheets
  const [sheetDest,     setSheetDest]     = useState('spending')
  const [sheetDestGoal, setSheetDestGoal] = useState('')
  const [sheetDelete,   setSheetDelete]   = useState(false)
  const [busy,          setBusy]          = useState(false)
  const [actionError,   setActionError]   = useState(null)

  // Legacy aliases so existing handlers still work
  const donateSheet    = activeSheet === 'donate'
  const donateCharity  = sheetNote
  const donateAmount   = sheetAmount
  const withdrawSheet  = activeSheet === 'subGoalWithdraw' ? sheetSubGoal : null
  const withdrawAmount = sheetAmount
  const withdrawDest   = sheetDest
  const withdrawDestGoal = sheetDestGoal
  const withdrawDelete = sheetDelete
  const donating    = busy
  const withdrawing = busy

  const openSheet = (name, extra = {}) => {
    setActiveSheet(name)
    setSheetAmount('')
    setSheetNote(extra.note ?? '')
    setSheetSubGoal(extra.subGoal ?? null)
    setSheetDest('spending')
    setSheetDestGoal('')
    setSheetDelete(false)
    setActionError(null)
  }
  const closeSheet = () => { setActiveSheet(null); setActionError(null) }

  useEffect(() => {
    if (!memberId) return
    Promise.all([
      getPayslips(memberId),
      getTransactions(memberId, 200),
    ]).then(([ps, txs]) => {
      setPayslips([...ps].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)))
      setAllTxs(txs)
      setLoading(false)
    })
  }, [memberId])

  // Period summary: aggregate settled transactions for current period
  useEffect(() => {
    if (!memberId || !periodStart || !periodEnd) return
    getTransactionsForPeriod(memberId, periodStart, periodEnd).then(txs => {
      const rent  = txs.filter(t => t.type === 'rent').reduce((s, t) => s + Math.abs(t.amount), 0)
      const tax   = txs.filter(t => t.type === 'tax').reduce((s, t) => s + Math.abs(t.amount), 0)
      const bonus = txs.filter(t => ['bonus', 'parent_bonus'].includes(t.type)).reduce((s, t) => s + t.amount, 0)
      setPeriodSummary({ rent, tax, bonus })
    })
  }, [memberId, periodStart, periodEnd])

  const handleSettle = async (payslipId) => {
    setSettling(payslipId)
    setSettleError(null)
    try {
      await settlePayslip(payslipId)
      setPayslips(prev => prev.map(p => p.id === payslipId ? { ...p, status: 'settled' } : p))
      await reload()
    } catch (e) {
      setSettleError(e.message)
    } finally {
      setSettling(null)
    }
  }

  const handleDonate = async () => {
    const amt = parseFloat(sheetAmount)
    if (!sheetNote.trim() || !amt || amt <= 0) return
    setBusy(true); setActionError(null)
    try {
      await parentDonate(memberId, amt, sheetNote.trim())
      await reload(); closeSheet()
    } catch (e) { setActionError(e.message) }
    finally { setBusy(false) }
  }

  const handleSavingsToWallet = async () => {
    const amt = parseFloat(sheetAmount)
    if (!amt || amt <= 0) return
    setBusy(true); setActionError(null)
    try {
      await transferSavingsToWallet(memberId, amt)
      await reload(); closeSheet()
    } catch (e) { setActionError(e.message) }
    finally { setBusy(false) }
  }

  const handleWalletToSavings = async () => {
    const amt = parseFloat(sheetAmount)
    if (!amt || amt <= 0) return
    setBusy(true); setActionError(null)
    try {
      await parentDepositToSavings(memberId, amt)
      await reload(); closeSheet()
    } catch (e) { setActionError(e.message) }
    finally { setBusy(false) }
  }

  const handleWalletWithdraw = async () => {
    const amt = parseFloat(sheetAmount)
    if (!amt || amt <= 0) return
    setBusy(true); setActionError(null)
    try {
      await parentWalletWithdrawal(memberId, amt, sheetDest)
      await reload(); closeSheet()
    } catch (e) { setActionError(e.message) }
    finally { setBusy(false) }
  }

  const handleSubGoalDeposit = async () => {
    const amt = parseFloat(sheetAmount)
    if (!sheetSubGoal || !amt || amt <= 0) return
    setBusy(true); setActionError(null)
    try {
      await parentDepositToSubGoal(memberId, sheetSubGoal.id, amt)
      await reload(); closeSheet()
    } catch (e) { setActionError(e.message) }
    finally { setBusy(false) }
  }

  const handleWithdraw = async () => {
    const amt = parseFloat(sheetAmount)
    if (!sheetSubGoal || !amt || amt <= 0) return
    setBusy(true); setActionError(null)
    try {
      const meta = {
        subGoalId:   sheetSubGoal.id,
        subGoalName: sheetSubGoal.name,
        destination: sheetDest,
        ...(sheetDest === 'subgoal' && sheetDestGoal ? { destinationSubGoalId: sheetDestGoal } : {}),
        deleteGoal:  sheetDelete,
      }
      await parentSubGoalWithdrawal(memberId, amt, meta)
      await reload(); closeSheet()
    } catch (e) { setActionError(e.message) }
    finally { setBusy(false) }
  }

  if (!child) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Child not found</p>
      </div>
    )
  }

  const accounts        = child.accounts ?? {}
  const loanOutstanding = accounts.loan?.outstanding ?? 0
  const subGoals        = accounts.subGoals ?? []

  // Chart data
  const netWorthData = [...payslips]
    .filter(p => p.status === 'settled')
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
    .map(p => {
      const b = p.balancesAfter ?? {}
      const nw = (b.spending ?? 0) + (b.savings ?? 0) + (b.philanthropy ?? 0) - (b.loan?.outstanding ?? 0)
      const d = new Date(p.periodEnd + 'T12:00:00')
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '-')
      return { label, value: nw }
    })

  const bonusChartData = [...payslips]
    .filter(p => p.status === 'settled' && (p.bonusPotential ?? 0) > 0)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
    .map(p => {
      const earned = p.earnings?.bonusChoreEarnings ?? 0
      const potential = p.bonusPotential ?? 0
      return {
        period:     periodId(p.periodEnd),
        earned,
        uncaptured: Math.max(0, potential - earned),
        pct:        potential > 0 ? Math.round(earned / potential * 100) : 0,
        potential,
      }
    })

  const creditChartData = [...payslips]
    .filter(p => p.status === 'settled' && p.creditScore != null)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
    .map(p => ({
      label: periodId(p.periodEnd),
      score: p.creditScore,
    }))

  const score = child.creditScore ?? 500
  const scoreColor = score >= 700 ? 'var(--positive)' : score >= 500 ? 'var(--warning)' : 'var(--negative)'
  const scoreBg    = score >= 700 ? 'rgba(74,222,128,0.1)' : score >= 500 ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate('/parent')}
          className="flex items-center gap-1 mb-3 -ml-1"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
          <ChevronLeft size={16} />
          <span className="text-xs font-mono">Dashboard</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{child.avatar}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                {child.name}
              </h2>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded-full"
                style={{ background: scoreBg, color: scoreColor, border: `1px solid ${scoreBg}` }}>
                ★ {score}
              </span>
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {fmt(child.baseSalary)}/{periodLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Balance tiles — always shown */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'SPENDING',     value: accounts.spending     ?? 0, color: 'var(--positive)' },
            { label: 'SAVINGS',      value: accounts.savings      ?? 0, color: 'var(--accent-blue)' },
            { label: 'PHILANTHROPY', value: accounts.philanthropy ?? 0, color: '#D4A017' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-3 rounded-xl text-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{label}</p>
              <p className="text-sm font-mono font-semibold mt-1" style={{ color }}>{fmt(value)}</p>
            </div>
          ))}
        </div>

        {/* Manage Money — parent action buttons */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>MANAGE MONEY</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'walletToSavings',  label: 'Wallet → Savings',  icon: <PiggyBank size={13} />,       color: 'var(--accent-blue)',  disabled: (accounts.spending ?? 0) <= 0 },
              { id: 'savingsToWallet',  label: 'Savings → Wallet',  icon: <ArrowUpFromLine size={13} />,  color: 'var(--positive)',     disabled: (accounts.savings  ?? 0) <= 0 },
              { id: 'walletWithdraw',   label: 'Cash / Bank Out',   icon: <Banknote size={13} />,         color: 'var(--warning)',      disabled: (accounts.spending ?? 0) <= 0 },
              { id: 'donate',           label: 'Donate',            icon: <Heart size={13} />,            color: '#D4A017',             disabled: (accounts.philanthropy ?? 0) <= 0 },
            ].map(({ id, label, icon, color, disabled }) => (
              <button key={id}
                onClick={() => openSheet(id)}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all active:scale-95"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', opacity: disabled ? 0.4 : 1 }}>
                <span style={{ color }}>{icon}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sub-goals */}
        {subGoals.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>SUB-GOALS</p>
            {subGoals.map(sg => {
              const pct = sg.target > 0 ? Math.min(100, Math.round((sg.balance / sg.target) * 100)) : 0
              return (
                <div key={sg.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <Target size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>{sg.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                      {fmt(sg.balance)} / {fmt(sg.target)} · {pct}%
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openSheet('subGoalDeposit', { subGoal: sg })}
                      className="text-xs font-mono px-2 py-1 rounded-lg active:scale-95"
                      style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--positive)', border: '1px solid rgba(74,222,128,0.2)' }}>
                      Deposit
                    </button>
                    <button onClick={() => openSheet('subGoalWithdraw', { subGoal: sg })}
                      className="text-xs font-mono px-2 py-1 rounded-lg active:scale-95"
                      style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(96,165,250,0.3)' }}>
                      Withdraw
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Loan chip */}
        {loanOutstanding > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <span className="text-sm">🤝</span>
            <p className="text-xs font-mono" style={{ color: 'var(--warning)' }}>
              Loan outstanding: {fmt(loanOutstanding)} · {fmt(accounts.loan.weeklyRepayment)}/{periodLabel} repayment
            </p>
          </div>
        )}

        {/* Current period summary */}
        {periodSummary && (periodSummary.rent > 0 || periodSummary.tax > 0 || periodSummary.bonus > 0) && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>
              THIS {periodLabel.toUpperCase()} (SETTLED)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'RENT PAID',  value: periodSummary.rent,  color: 'var(--negative)', prefix: '-' },
                { label: 'TAX PAID',   value: periodSummary.tax,   color: 'var(--negative)', prefix: '-' },
                { label: 'BONUSES',    value: periodSummary.bonus, color: 'var(--positive)', prefix: '+' },
              ].map(({ label, value, color, prefix }) => (
                <div key={label} className="p-3 rounded-xl text-center"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{label}</p>
                  <p className="text-sm font-mono font-semibold mt-1" style={{ color: value > 0 ? color : 'var(--text-dim)' }}>
                    {value > 0 ? prefix : ''}{fmt(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics */}
        {netWorthData.length >= 2 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>ANALYTICS</p>
            <button onClick={() => setShowNetWorth(true)}
              className="p-4 rounded-xl flex flex-col gap-2 w-full text-left transition-all active:scale-95"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>NET WORTH OVER TIME</p>
                <span className="text-xs font-mono flex items-center gap-0.5" style={{ color: 'var(--text-dim)' }}>
                  breakdown <ChevronRight size={11} />
                </span>
              </div>
              <NetWorthChart data={netWorthData} />
            </button>
            {allTxs.length > 0 && (
              <div className="p-4 rounded-xl flex flex-col gap-2"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>WHERE DOES MONEY GO</p>
                <SpendingBreakdown transactions={allTxs} />
              </div>
            )}
          </div>
        )}

        {/* Bonus chore performance chart */}
        {bonusChartData.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>BONUS CHORE PERFORMANCE</p>
            <div className="p-4 rounded-xl flex flex-col gap-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-4 text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                <span className="flex items-center gap-1">
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#6ee7b7' }} />
                  Earned
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--bg-raised)', border: '1px solid var(--border)' }} />
                  Left on table
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ display: 'inline-block', width: 10, height: 2, background: 'var(--warning)' }} />
                  % captured
                </span>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={bonusChartData} margin={{ top: 4, right: 24, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} width={40} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={32} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                    labelStyle={{ color: 'var(--text-muted)', marginBottom: 4 }}
                    formatter={(value, name) => {
                      if (name === 'pct') return [`${value}%`, 'Capture rate']
                      if (name === 'earned') return [fmt(value), 'Earned']
                      if (name === 'uncaptured') return [fmt(value), 'Left on table']
                      return [value, name]
                    }}
                  />
                  <Bar yAxisId="left" dataKey="earned" stackId="a" fill="#6ee7b7" radius={[0, 0, 3, 3]} />
                  <Bar yAxisId="left" dataKey="uncaptured" stackId="a" fill="var(--bg-raised)" stroke="var(--border)" strokeWidth={1} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="pct" stroke="var(--warning)" strokeWidth={2} dot={{ fill: 'var(--warning)', r: 3, strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Credit score history chart */}
        {creditChartData.length >= 2 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>CREDIT SCORE HISTORY</p>
            <div className="p-4 rounded-xl flex flex-col gap-2"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                  {creditChartData.length} period{creditChartData.length > 1 ? 's' : ''}
                </span>
                <span className="text-xs font-mono" style={{ color: score >= 700 ? 'var(--positive)' : score >= 500 ? 'var(--warning)' : 'var(--negative)' }}>
                  {score}
                </span>
              </div>
              <CreditScoreLineChart data={creditChartData} />
            </div>
          </div>
        )}

        {/* Payslip history */}
        {loading ? (
          <p className="text-xs font-mono text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : payslips.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
            <span className="text-5xl">📒</span>
            <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>No payslips yet</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
              Payslips will appear here after the first payday
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-mono px-1" style={{ color: 'var(--text-muted)' }}>
              PAYSLIP HISTORY ({payslips.length})
            </p>

            {settleError && (
              <p className="text-xs font-mono px-1" style={{ color: 'var(--negative)' }}>
                Error: {settleError}
              </p>
            )}

            {payslips.map(p => {
              const isDraft    = p.status === 'draft'
              const isExpanded = expanded === p.id
              const canSettle  = isDraft && today() >= p.periodEnd
              const isSettling = settling === p.id

              return (
                <div key={p.id}>
                  {/* Row header */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : p.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: 'var(--bg-surface)',
                      border: `1px solid ${isExpanded ? 'var(--border-bright)' : isDraft ? 'rgba(251,191,36,0.3)' : 'var(--border)'}`,
                    }}>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {displayDate(p.periodStart)} – {displayDate(p.periodEnd)}
                        </p>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--bg-raised)', color: 'var(--text-dim)', fontSize: 9 }}>
                          {periodId(p.periodEnd)}
                        </span>
                        {isDraft ? (
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--warning)', fontSize: 9 }}>
                            ⏳ DRAFT
                          </span>
                        ) : (
                          <span className="text-xs font-mono" style={{ color: 'var(--positive)', fontSize: 9 }}>
                            ✓ SETTLED
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-mono font-bold mt-0.5" style={{ color: 'var(--positive)' }}>
                        {fmt(p.net)} net
                      </p>
                    </div>
                    {isExpanded
                      ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      : <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    }
                  </button>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="mt-2 flex flex-col gap-2">
                      <PayslipCard payslip={p} member={child} />

                      {/* Settle action for drafts */}
                      {isDraft && (
                        <div className="flex flex-col gap-2 px-1">
                          {!canSettle && (
                            <p className="text-xs font-mono text-center" style={{ color: 'var(--text-muted)' }}>
                              Settlement available from {displayDate(p.periodEnd)}
                            </p>
                          )}
                          <button
                            onClick={() => handleSettle(p.id)}
                            disabled={!canSettle || isSettling}
                            className="w-full py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
                            style={{
                              background: !canSettle ? 'var(--bg-raised)' : isSettling ? 'var(--border)' : 'rgba(74,222,128,0.15)',
                              border: `1px solid ${!canSettle ? 'var(--border)' : 'rgba(74,222,128,0.35)'}`,
                              color: !canSettle ? 'var(--text-dim)' : isSettling ? 'var(--text-dim)' : 'var(--positive)',
                              cursor: !canSettle ? 'not-allowed' : 'pointer',
                            }}>
                            {isSettling ? 'Settling...' : '✓ Approve & Pay'}
                          </button>
                        </div>
                      )}

                      {/* Transactions */}
                      {p.status === 'settled' && (
                        <PeriodTxs
                          memberId={memberId}
                          periodStart={p.periodStart}
                          periodEnd={p.periodEnd}
                        />
                      )}
                      {isDraft && (
                        <p className="text-xs font-mono text-center py-2" style={{ color: 'var(--text-dim)' }}>
                          Transactions will appear after settlement
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Action Sheets ── */}
      {activeSheet && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={closeSheet}>
          <div className="w-full rounded-t-2xl p-5 flex flex-col gap-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            {/* Wallet → Savings */}
            {activeSheet === 'walletToSavings' && <>
              <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>Wallet → Savings</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Wallet: {fmt(accounts.spending ?? 0)}</p>
              <input type="number" placeholder="Amount"
                className="w-full px-3 py-2 rounded-xl text-sm font-mono"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                value={sheetAmount} onChange={e => setSheetAmount(e.target.value)} />
              {actionError && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{actionError}</p>}
              <div className="flex gap-2">
                <button onClick={closeSheet} className="flex-1 py-2.5 rounded-xl text-sm font-mono" style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                <button onClick={handleWalletToSavings} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-mono font-semibold active:scale-95" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(96,165,250,0.3)' }}>{busy ? 'Moving...' : 'Move to Savings'}</button>
              </div>
            </>}

            {/* Savings → Wallet */}
            {activeSheet === 'savingsToWallet' && <>
              <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>Savings → Wallet</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Savings: {fmt(accounts.savings ?? 0)}</p>
              <input type="number" placeholder="Amount"
                className="w-full px-3 py-2 rounded-xl text-sm font-mono"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                value={sheetAmount} onChange={e => setSheetAmount(e.target.value)} />
              {actionError && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{actionError}</p>}
              <div className="flex gap-2">
                <button onClick={closeSheet} className="flex-1 py-2.5 rounded-xl text-sm font-mono" style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                <button onClick={handleSavingsToWallet} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-mono font-semibold active:scale-95" style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--positive)', border: '1px solid rgba(74,222,128,0.3)' }}>{busy ? 'Moving...' : 'Move to Wallet'}</button>
              </div>
            </>}

            {/* Cash / Bank Withdrawal */}
            {activeSheet === 'walletWithdraw' && <>
              <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>Wallet Withdrawal</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Wallet: {fmt(accounts.spending ?? 0)}</p>
              <input type="number" placeholder="Amount"
                className="w-full px-3 py-2 rounded-xl text-sm font-mono"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                value={sheetAmount} onChange={e => setSheetAmount(e.target.value)} />
              <div className="flex gap-2">
                {['cash', 'bank'].map(d => (
                  <button key={d} onClick={() => setSheetDest(d)} className="flex-1 py-2 rounded-xl text-xs font-mono transition-all"
                    style={{ background: sheetDest === d ? 'rgba(251,191,36,0.15)' : 'var(--bg-raised)', color: sheetDest === d ? 'var(--warning)' : 'var(--text-muted)', border: `1px solid ${sheetDest === d ? 'rgba(251,191,36,0.3)' : 'var(--border)'}` }}>
                    {d === 'cash' ? 'Physical Cash' : 'Bank Transfer'}
                  </button>
                ))}
              </div>
              {actionError && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{actionError}</p>}
              <div className="flex gap-2">
                <button onClick={closeSheet} className="flex-1 py-2.5 rounded-xl text-sm font-mono" style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                <button onClick={handleWalletWithdraw} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-mono font-semibold active:scale-95" style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--warning)', border: '1px solid rgba(251,191,36,0.3)' }}>{busy ? 'Processing...' : 'Confirm'}</button>
              </div>
            </>}

            {/* Donate */}
            {activeSheet === 'donate' && <>
              <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>Donate from Philanthropy</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Balance: {fmt(accounts.philanthropy ?? 0)}</p>
              <input placeholder="Charity / cause name"
                className="w-full px-3 py-2 rounded-xl text-sm font-mono"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                value={sheetNote} onChange={e => setSheetNote(e.target.value)} />
              <input type="number" placeholder="Amount"
                className="w-full px-3 py-2 rounded-xl text-sm font-mono"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                value={sheetAmount} onChange={e => setSheetAmount(e.target.value)} />
              {actionError && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{actionError}</p>}
              <div className="flex gap-2">
                <button onClick={closeSheet} className="flex-1 py-2.5 rounded-xl text-sm font-mono" style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                <button onClick={handleDonate} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-mono font-semibold active:scale-95" style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--positive)', border: '1px solid rgba(74,222,128,0.3)' }}>{busy ? 'Processing...' : 'Confirm Donation'}</button>
              </div>
            </>}

            {/* Sub-goal Deposit */}
            {activeSheet === 'subGoalDeposit' && sheetSubGoal && <>
              <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>Deposit → "{sheetSubGoal.name}"</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Wallet: {fmt(accounts.spending ?? 0)} · Goal: {fmt(sheetSubGoal.balance)} / {fmt(sheetSubGoal.target)}</p>
              <input type="number" placeholder="Amount"
                className="w-full px-3 py-2 rounded-xl text-sm font-mono"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                value={sheetAmount} onChange={e => setSheetAmount(e.target.value)} />
              {actionError && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{actionError}</p>}
              <div className="flex gap-2">
                <button onClick={closeSheet} className="flex-1 py-2.5 rounded-xl text-sm font-mono" style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                <button onClick={handleSubGoalDeposit} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-mono font-semibold active:scale-95" style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--positive)', border: '1px solid rgba(74,222,128,0.3)' }}>{busy ? 'Depositing...' : 'Confirm Deposit'}</button>
              </div>
            </>}

            {/* Sub-goal Withdraw */}
            {activeSheet === 'subGoalWithdraw' && sheetSubGoal && <>
              <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>Withdraw from "{sheetSubGoal.name}"</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Balance: {fmt(sheetSubGoal.balance)}</p>
              <input type="number" placeholder="Amount"
                className="w-full px-3 py-2 rounded-xl text-sm font-mono"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                value={sheetAmount} onChange={e => setSheetAmount(e.target.value)} />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>SEND TO</p>
                <div className="flex gap-2">
                  {['spending', 'philanthropy', 'subgoal'].map(dest => (
                    <button key={dest} onClick={() => setSheetDest(dest)} className="flex-1 py-2 rounded-xl text-xs font-mono transition-all"
                      style={{ background: sheetDest === dest ? 'rgba(96,165,250,0.15)' : 'var(--bg-raised)', color: sheetDest === dest ? 'var(--accent-blue)' : 'var(--text-muted)', border: `1px solid ${sheetDest === dest ? 'rgba(96,165,250,0.3)' : 'var(--border)'}` }}>
                      {dest === 'subgoal' ? 'Another Goal' : dest.charAt(0).toUpperCase() + dest.slice(1)}
                    </button>
                  ))}
                </div>
                {sheetDest === 'subgoal' && subGoals.filter(s => s.id !== sheetSubGoal.id).length > 0 && (
                  <select className="w-full px-3 py-2 rounded-xl text-sm font-mono mt-1"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    value={sheetDestGoal} onChange={e => setSheetDestGoal(e.target.value)}>
                    <option value="">Select goal…</option>
                    {subGoals.filter(s => s.id !== sheetSubGoal.id).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setSheetDelete(d => !d)} className="w-10 h-6 rounded-full transition-colors flex items-center px-1"
                  style={{ background: sheetDelete ? 'var(--negative)' : 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <div className="w-4 h-4 rounded-full transition-transform" style={{ background: '#fff', transform: sheetDelete ? 'translateX(16px)' : 'translateX(0)' }} />
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Delete goal after withdrawal</span>
              </label>
              {actionError && <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{actionError}</p>}
              <div className="flex gap-2">
                <button onClick={closeSheet} className="flex-1 py-2.5 rounded-xl text-sm font-mono" style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                <button onClick={handleWithdraw} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-mono font-semibold active:scale-95" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(96,165,250,0.3)' }}>{busy ? 'Processing...' : 'Confirm Withdrawal'}</button>
              </div>
            </>}

          </div>
        </div>
      )}

      {/* Net worth breakdown sheet */}
      {showNetWorth && (() => {
        const accs        = child.accounts ?? {}
        const sgs         = accs.subGoals ?? []
        const subGoalTotal = sgs.reduce((s, g) => s + (g.balance ?? 0), 0)
        const totalSavings = (accs.savings ?? 0) + subGoalTotal
        const spending    = accs.spending ?? 0
        const philanthropy = accs.philanthropy ?? 0
        const loan        = accs.loan?.outstanding ?? 0
        const netWorth    = spending + totalSavings + philanthropy - loan

        const Row = ({ label, value, color, indent = false, sub = false }) => (
          <div className={`flex items-center justify-between py-2 ${indent ? 'pl-6' : ''}`}
            style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'monospace', fontSize: sub ? 10 : 12, color: sub ? 'var(--text-dim)' : 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontFamily: 'monospace', fontSize: sub ? 10 : 12, fontWeight: 600, color: color ?? 'var(--text-primary)' }}>{value}</span>
          </div>
        )

        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={e => e.target === e.currentTarget && setShowNetWorth(false)}>
            <div className="rounded-t-2xl flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '80vh' }}>
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-bright)' }} />
              </div>
              <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Net Worth Breakdown · {child.name}
                </span>
                <button onClick={() => setShowNetWorth(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto px-4 py-3 flex flex-col">
                <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-dim)' }}>ASSETS</p>
                <Row label="Spending wallet" value={fmt(spending)}     color="var(--positive)" />
                <Row label="Savings account" value={fmt(accs.savings ?? 0)} color="#60a5fa" />
                {sgs.map(g => (
                  <Row key={g.id} label={`↳ ${g.name}`} value={`${fmt(g.balance)} / ${fmt(g.target)}`} color="#818cf8" indent sub />
                ))}
                {sgs.length > 0 && (
                  <Row label="Sub-goals total" value={fmt(subGoalTotal)} color="#818cf8" indent />
                )}
                <Row label="Philanthropy" value={fmt(philanthropy)} color="#D4A017" />
                {loan > 0 && (
                  <>
                    <p className="text-xs font-mono mt-3 mb-1" style={{ color: 'var(--text-dim)' }}>LIABILITIES</p>
                    <Row label="Loan outstanding" value={`−${fmt(loan)}`} color="var(--negative)" />
                  </>
                )}
                <div className="flex items-center justify-between mt-4 px-3 py-3 rounded-xl"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-bright)' }}>
                  <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>NET WORTH</span>
                  <span className="text-lg font-mono font-bold" style={{ color: netWorth >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                    {fmt(netWorth)}
                  </span>
                </div>
                <div className="h-4" />
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
