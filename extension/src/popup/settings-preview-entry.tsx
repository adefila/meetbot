import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Settings from './Settings'

const s: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: '-0.4px',
  color: '#0f0f0f',
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <button style={{ background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', color: '#1a73e8', fontWeight: 500, letterSpacing: '-0.2px', fontFamily: "'Inter', sans-serif" }}>← Back</button>
        <span style={s}>Settings</span>
      </div>
      <Settings email="adefilasamuel929@gmail.com" token="preview-token" onDisconnect={() => {}} />
    </div>
  </StrictMode>
)
