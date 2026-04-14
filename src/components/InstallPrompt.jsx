import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

/**
 * Listens for the browser's beforeinstallprompt event and shows a
 * slim install banner at the bottom of the screen. Dismissed state
 * is persisted to localStorage so it only shows once per session.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Already dismissed this session
    if (sessionStorage.getItem('artha-install-dismissed')) return

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
    if (outcome === 'accepted') {
      sessionStorage.setItem('artha-install-dismissed', '1')
    }
  }

  const handleDismiss = () => {
    setVisible(false)
    sessionStorage.setItem('artha-install-dismissed', '1')
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-20 left-0 right-0 mx-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        maxWidth: 480 - 32,
        margin: '0 auto',
        marginBottom: 76,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-bright)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="text-xl shrink-0">📲</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          Add Artha to home screen
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          Works offline, feels native
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all active:scale-95"
        style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}>
        <Download size={13} /> Install
      </button>
      <button onClick={handleDismiss} style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
        <X size={16} />
      </button>
    </div>
  )
}
