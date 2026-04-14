import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { seedFamily } from './db/seed'

// Seed first, then render — avoids "no members" flash on first launch
seedFamily()
  .then(() => console.log('[Artha] Seed check done'))
  .catch(err => console.error('[Artha] Seed error:', err))
  .finally(() => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
