import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createFamily } from '../../db/operations'
import { hashPin } from '../../auth/pinUtils'

const AVATARS = [
  '👨','👩','👴','👵','🧑','👨‍💼','👩‍💼','👨‍🦱','👩‍🦱',
  '👨‍🦳','👩‍🦳','🧔','👱','👱‍♀️','🙎','🙎‍♀️',
]

const ROLES = [
  { label: 'Dad',      avatar: '👨' },
  { label: 'Mum',      avatar: '👩' },
  { label: 'Guardian', avatar: '🧑' },
  { label: 'Grandad',  avatar: '👴' },
  { label: 'Grandma',  avatar: '👵' },
]

// ── Reusable PIN pad ──────────────────────────────────────────────────────────
function PinEntry({ value, onChange }) {
  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  const handle = (k) => {
    if (k === '⌫') { onChange(value.slice(0, -1)); return }
    if (value.length < 4) onChange(value + k)
  }
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg-raised)', border: `2px solid ${i < value.length ? 'var(--accent-blue)' : 'var(--border)'}` }}>
            {i < value.length && <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent-blue)' }} />}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5 w-52">
        {digits.map((d, i) => (
          d === '' ? <div key={i} /> :
          <button key={i} onClick={() => handle(d)}
            className="h-13 w-full rounded-xl text-lg font-mono font-medium transition-all active:scale-90"
            style={{ height: 52, background: d === '⌫' ? 'transparent' : 'var(--bg-raised)', border: `1px solid ${d === '⌫' ? 'transparent' : 'var(--border)'}`, color: 'var(--text-primary)' }}>
            {d === '⌫' ? '⌫' : d}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Onboarding ───────────────────────────────────────────────────────────
export default function Onboarding({ onComplete, onJoinInstead }) {
  const [step,       setStep]       = useState(0)
  const [familyName, setFamilyName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [avatar,     setAvatar]     = useState('')
  const [pin,        setPin]        = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError,   setPinError]   = useState(null)
  const [creating,   setCreating]   = useState(false)
  const [error,      setError]      = useState(null)

  const TOTAL_STEPS = 4 // 0=welcome, 1=family name, 2=your profile, 3=pin

  const next = () => setStep(s => s + 1)
  const back = () => { setStep(s => s - 1); setPinError(null) }

  const handleRoleSelect = (role) => {
    setAvatar(role.avatar)
    setMemberName(prev => prev || role.label)
  }

  const handleCreate = async () => {
    if (pin !== pinConfirm) { setPinError('PINs don\'t match'); return }
    if (pin.length !== 4)   { setPinError('PIN must be 4 digits'); return }
    setCreating(true)
    setError(null)
    try {
      const pinHash = await hashPin(pin)
      const result = await createFamily({
        familyName: familyName.trim() || 'My Family',
        memberName: memberName.trim(),
        avatar,
        pinHash,
      })
      // Auto-login: store memberId so AuthContext restores the session
      localStorage.setItem('artha_member_id', result.memberId)
      onComplete(result)
    } catch (e) {
      setError(e.message ?? 'Something went wrong')
      setCreating(false)
    }
  }

  // ── Step 0: Welcome ────────────────────────────────────────────────
  if (step === 0) return (
    <div className="flex flex-col items-center justify-between h-full py-12 px-6">
      <div />
      <div className="flex flex-col items-center gap-4 text-center">
        <div style={{ fontSize: 64 }}>🏠</div>
        <div>
          <p className="text-xs font-mono tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>ARTHA</p>
          <h1 className="text-2xl font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
            Welcome to Artha
          </h1>
          <p className="text-sm font-mono mt-2" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            A real economy for your family.{'\n'}
            Teach children how money works.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <button onClick={next}
          className="w-full py-4 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
          style={{ background: 'var(--accent-blue)', color: '#fff' }}>
          Set up our family →
        </button>
        <button onClick={onJoinInstead}
          className="w-full py-3 rounded-xl text-sm font-mono transition-all active:scale-95"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          I have an invite code
        </button>
      </div>
    </div>
  )

  // ── Step 1: Family name ────────────────────────────────────────────
  if (step === 1) return (
    <div className="flex flex-col h-full py-10 px-6 gap-8">
      <button onClick={back} className="self-start -ml-1 p-1" style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={22} />
      </button>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-mono tracking-widest" style={{ color: 'var(--text-dim)' }}>STEP 1 OF 3</p>
        <h2 className="text-xl font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
          What's your family name?
        </h2>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          This is shown across the app.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          <span className="text-sm font-mono" style={{ color: 'var(--text-dim)' }}>The</span>
          <input
            autoFocus
            value={familyName}
            onChange={e => setFamilyName(e.target.value)}
            placeholder="Kamboj"
            className="flex-1 bg-transparent text-sm font-mono outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <span className="text-sm font-mono" style={{ color: 'var(--text-dim)' }}>Family</span>
        </div>
        {familyName.trim() && (
          <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            "The {familyName.trim()} Family"
          </p>
        )}
      </div>

      <div className="mt-auto">
        <button onClick={next} disabled={!familyName.trim()}
          className="w-full py-4 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
          style={{ background: familyName.trim() ? 'var(--accent-blue)' : 'var(--bg-raised)', color: familyName.trim() ? '#fff' : 'var(--text-dim)', border: `1px solid ${familyName.trim() ? 'var(--accent-blue)' : 'var(--border)'}` }}>
          Continue →
        </button>
      </div>
    </div>
  )

  // ── Step 2: Your profile ───────────────────────────────────────────
  if (step === 2) return (
    <div className="flex flex-col h-full py-10 px-6 gap-6 overflow-y-auto">
      <button onClick={back} className="self-start -ml-1 p-1 shrink-0" style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={22} />
      </button>

      <div className="flex flex-col gap-1 shrink-0">
        <p className="text-xs font-mono tracking-widest" style={{ color: 'var(--text-dim)' }}>STEP 2 OF 3</p>
        <h2 className="text-xl font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
          Your profile
        </h2>
      </div>

      {/* Role quick-select */}
      <div className="flex flex-col gap-2 shrink-0">
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>I AM THE</p>
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(r => (
            <button key={r.label} onClick={() => handleRoleSelect(r)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95"
              style={{
                background: avatar === r.avatar ? 'var(--accent-blue)' : 'var(--bg-raised)',
                border: `1px solid ${avatar === r.avatar ? 'var(--accent-blue)' : 'var(--border)'}`,
              }}>
              <span>{r.avatar}</span>
              <span className="text-xs font-mono"
                style={{ color: avatar === r.avatar ? '#fff' : 'var(--text-muted)' }}>
                {r.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-2 shrink-0">
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>YOUR NAME</p>
        <input
          value={memberName}
          onChange={e => setMemberName(e.target.value)}
          placeholder="e.g. Deepak"
          className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Avatar picker */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PICK AN AVATAR</p>
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map(a => (
            <button key={a} onClick={() => setAvatar(a)}
              className="h-11 rounded-xl flex items-center justify-center text-2xl transition-all active:scale-90"
              style={{
                background: avatar === a ? 'rgba(96,165,250,0.15)' : 'var(--bg-raised)',
                border: `2px solid ${avatar === a ? 'var(--accent-blue)' : 'transparent'}`,
              }}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 mt-2">
        <button onClick={next} disabled={!memberName.trim() || !avatar}
          className="w-full py-4 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95"
          style={{ background: memberName.trim() && avatar ? 'var(--accent-blue)' : 'var(--bg-raised)', color: memberName.trim() && avatar ? '#fff' : 'var(--text-dim)', border: `1px solid ${memberName.trim() && avatar ? 'var(--accent-blue)' : 'var(--border)'}` }}>
          Continue →
        </button>
      </div>
    </div>
  )

  // ── Step 3: PIN ────────────────────────────────────────────────────
  if (step === 3) return (
    <div className="flex flex-col items-center h-full py-10 px-6 gap-6">
      <button onClick={back} className="self-start -ml-1 p-1" style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={22} />
      </button>

      <div className="flex flex-col gap-1 w-full">
        <p className="text-xs font-mono tracking-widest" style={{ color: 'var(--text-dim)' }}>STEP 3 OF 3</p>
        <h2 className="text-xl font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
          {pin.length < 4 ? 'Set your PIN' : 'Confirm your PIN'}
        </h2>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {pin.length < 4 ? 'Choose a 4-digit PIN to log in.' : 'Enter the same PIN again.'}
        </p>
      </div>

      {/* Avatar preview */}
      <div className="flex flex-col items-center gap-1">
        <span style={{ fontSize: 48 }}>{avatar}</span>
        <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{memberName}</span>
      </div>

      <PinEntry value={pin.length < 4 ? pin : pinConfirm} onChange={pin.length < 4 ? setPin : setPinConfirm} />

      {pinError && (
        <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{pinError}</p>
      )}
      {error && (
        <p className="text-xs font-mono" style={{ color: 'var(--negative)' }}>{error}</p>
      )}

      {pin.length === 4 && pinConfirm.length === 4 && (
        <button onClick={handleCreate} disabled={creating}
          className="w-full py-4 rounded-xl text-sm font-mono font-semibold transition-all active:scale-95 mt-auto"
          style={{ background: 'var(--accent-blue)', color: '#fff', opacity: creating ? 0.7 : 1 }}>
          {creating ? 'Creating your family...' : `Create The ${familyName} Family →`}
        </button>
      )}
    </div>
  )

  return null
}
