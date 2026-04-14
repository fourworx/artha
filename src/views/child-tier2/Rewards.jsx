import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useFamily } from '../../context/FamilyContext'
import { addRewardRequest, getRewardRequests } from '../../db/operations'
import { useCurrency } from '../../context/FamilyContext'
import { REWARD_CATEGORIES } from '../../utils/constants'
import { ShoppingBag, X, Check } from 'lucide-react'

// ── Confirm purchase sheet ────────────────────────────────────────────────────
function BuySheet({ reward, spending, onConfirm, onClose }) {
  const fmt = useCurrency()
  const canAfford = spending >= reward.price

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-t-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-bright)' }} />
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Reward */}
          <div className="flex items-center gap-4">
            <span className="text-5xl">{reward.emoji}</span>
            <div>
              <p className="text-lg font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                {reward.title}
              </p>
              <p className="text-sm font-mono" style={{ color: 'var(--positive)' }}>
                {fmt(reward.price)}
              </p>
            </div>
          </div>

          {/* Balance check */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>YOUR WALLET</span>
            <span className="text-sm font-mono font-bold" style={{ color: canAfford ? 'var(--positive)' : 'var(--negative)' }}>
              {fmt(spending)}
            </span>
          </div>

          {!canAfford && (
            <p className="text-xs font-mono text-center" style={{ color: 'var(--negative)' }}>
              Need {fmt(reward.price - spending)} more to afford this
            </p>
          )}

          <p className="text-xs font-mono text-center" style={{ color: 'var(--text-muted)' }}>
            A parent must approve before it's redeemed
          </p>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-mono transition-all active:scale-95"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
            <button
              disabled={!canAfford}
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
              style={{
                background: canAfford ? 'rgba(74,222,128,0.15)' : 'var(--bg-raised)',
                border: `1px solid ${canAfford ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                color: canAfford ? 'var(--positive)' : 'var(--text-dim)',
              }}>
              Request
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reward card ───────────────────────────────────────────────────────────────
function RewardCard({ reward, spending, requestStatus, onBuy }) {
  const fmt = useCurrency()
  const canAfford = spending >= reward.price
  const isPending  = requestStatus === 'pending'
  const isApproved = requestStatus === 'approved'

  return (
    <button
      onClick={() => !isPending && !isApproved && onBuy(reward)}
      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all active:scale-95 text-center"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${isPending ? 'var(--border-bright)' : isApproved ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
        opacity: !canAfford && !isPending && !isApproved ? 0.5 : 1,
        cursor: isPending || isApproved ? 'default' : 'pointer',
      }}>
      <span className="text-4xl">{reward.emoji}</span>
      <p className="text-xs font-mono font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
        {reward.title}
      </p>
      {isPending ? (
        <span className="text-xs font-mono" style={{ color: 'var(--warning)' }}>⏳ Pending</span>
      ) : isApproved ? (
        <span className="text-xs font-mono" style={{ color: 'var(--positive)' }}>✓ Approved</span>
      ) : (
        <span className="text-xs font-mono font-bold" style={{ color: canAfford ? 'var(--positive)' : 'var(--text-dim)' }}>
          {fmt(reward.price)}
        </span>
      )}
    </button>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Rewards() {
  const { currentMember } = useAuth()
  const { rewards } = useFamily()
  const fmt = useCurrency()

  const [requests, setRequests]   = useState([])
  const [buying, setBuying]       = useState(null)  // reward being confirmed
  const [requesting, setRequesting] = useState(false)
  const [activeCategory, setCategory] = useState('all')

  const spending = currentMember?.accounts?.spending ?? 0

  const loadRequests = useCallback(async () => {
    if (!currentMember) return
    const reqs = await getRewardRequests(currentMember.id)
    setRequests(reqs)
  }, [currentMember])

  useEffect(() => { loadRequests() }, [loadRequests])

  // Map rewardId → most recent request status
  const requestMap = requests.reduce((acc, req) => {
    if (!acc[req.rewardId] || req.requestedAt > acc[req.rewardId].requestedAt) {
      acc[req.rewardId] = req
    }
    return acc
  }, {})

  const handleConfirm = async () => {
    if (!buying || requesting) return
    setRequesting(true)
    await addRewardRequest({
      memberId:    currentMember.id,
      rewardId:    buying.id,
      rewardTitle: buying.title,
      amount:      buying.price,
    })
    await loadRequests()
    setRequesting(false)
    setBuying(null)
  }

  const categories = ['all', ...new Set(rewards.map(r => r.category))]
  const filtered = rewards.filter(r =>
    activeCategory === 'all' || r.category === activeCategory
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>REWARD STORE</p>
        <div className="flex items-center justify-between mt-0.5">
          <h2 className="text-base font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            Marketplace
          </h2>
          <span className="text-sm font-mono font-bold" style={{ color: 'var(--positive)' }}>
            <ShoppingBag size={14} className="inline mr-1" />
            {fmt(spending)}
          </span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 px-4 pt-3 pb-1 shrink-0 overflow-x-auto">
        {categories.map(cat => {
          const meta = REWARD_CATEGORIES[cat]
          return (
            <button key={cat} onClick={() => setCategory(cat)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all shrink-0"
              style={{
                background: activeCategory === cat ? 'var(--accent-blue)' : 'var(--bg-raised)',
                border: `1px solid ${activeCategory === cat ? 'var(--accent-blue)' : 'var(--border)'}`,
                color: activeCategory === cat ? '#fff' : 'var(--text-muted)',
              }}>
              {meta ? `${meta.emoji} ${meta.label}` : 'All'}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(reward => (
            <RewardCard
              key={reward.id}
              reward={reward}
              spending={spending}
              requestStatus={requestMap[reward.id]?.status}
              onBuy={setBuying}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-xs font-mono text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No rewards in this category
          </p>
        )}
      </div>

      {/* Buy confirmation sheet */}
      {buying && (
        <BuySheet
          reward={buying}
          spending={spending}
          onConfirm={handleConfirm}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  )
}
