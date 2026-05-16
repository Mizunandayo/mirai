import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@xyflow/react/dist/style.css'
import App from './App'
import './index.css'
import './App.css'

// @react-three/rapier v0.12 Physics creates EventQueue synchronously via useConst.
// SimViewer is always-mounted (to preserve WebGL context on tab switches), so
// the WASM binary must be fully loaded before React renders any Physics component.
async function bootstrap() {
  try {
    const rapier = await import('@dimforge/rapier3d-compat')
    await rapier.init()
  } catch (err) {
    console.warn('[Mirai] Rapier WASM pre-init failed — Simulate tab may be unavailable:', err)
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

bootstrap()
