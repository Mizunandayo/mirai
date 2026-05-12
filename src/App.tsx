import { useState, useRef } from 'react'
import { useAtom } from 'jotai'
import { isAdvancedModeAtom } from './store/atoms'
import ArmViewer, { type ArmViewerHandle } from './components/ArmViewer'
import ArmDesignerPanel from './components/arm-designer/ArmDesignerPanel'

type NavItem = 'design' | 'tasks' | 'simulate' | 'export'
const NAV_ITEMS: { id: NavItem; label: string }[] = [
  { id: 'design', label: 'Design' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'simulate', label: 'Simulate' },
  { id: 'export', label: 'Export' },
]

export default function App() {
  const [isAdvanced, setIsAdvanced] = useAtom(isAdvancedModeAtom)
  const [activeNav, setActiveNav] = useState<NavItem>('design')
  const [panelOpen, setPanelOpen] = useState(true)
  const [showHint, setShowHint] = useState(true)
  const viewerRef = useRef<ArmViewerHandle>(null)

  function handleNavClick(nav: NavItem) {
    if (nav === activeNav) {
      setPanelOpen((o) => !o)
    } else {
      setActiveNav(nav)
      setPanelOpen(nav === 'design')
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <nav className="hdr-nav" aria-label="Workflow steps">
          {NAV_ITEMS.map(({ id, label }) => (
            <span
              key={id}
              className={`hdr-nav-item${activeNav === id ? ' hdr-nav-item--active' : ''}`}
              onClick={() => handleNavClick(id)}
              style={{ cursor: 'pointer' }}
            >
              {label}
            </span>
          ))}
        </nav>

        <div className="hdr-brand">
          <span className="hdr-logo">未来</span>
          <span className="hdr-wordmark">MIRAI</span>
        </div>

        <div className="hdr-right">
          <span className="hdr-step">Step 1 of 4</span>
          <button
            className={`hdr-mode${isAdvanced ? ' hdr-mode--detailed' : ''}`}
            onClick={() => setIsAdvanced(!isAdvanced)}
            title={isAdvanced ? 'Switch to Basic' : 'Switch to Detailed'}
            aria-pressed={isAdvanced}
          >
            <span className="hdr-mode-opt">Basic</span>
            <span className="hdr-mode-opt">Detailed</span>
          </button>
        </div>
      </header>

      <div className="app-body">
        <ArmDesignerPanel hidden={!panelOpen} />

        <main className="viewport-wrapper">
          <ArmViewer ref={viewerRef} />

          <button
            className="viewport-reset-btn"
            onClick={() => viewerRef.current?.resetCamera()}
            title="Reset camera to center"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 2.5v4.5h-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.36 7A6 6 0 1 1 10.5 3.14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
          {showHint && (
            <div className="viewport-hint">
              <span>Drag to orbit · Ctrl+right-click to pan · Click a part to select</span>
              <button
                className="viewport-hint-close"
                onClick={() => setShowHint(false)}
                title="Dismiss"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}

        </main>
      </div>

      <footer className="app-status-bar">
        <span className="status-item">
          <span className="status-dot status-dot--green" />
          Live preview ready
        </span>
        <span className="status-item">
          Server: <span className="status-offline">not connected · run python server/main.py</span>
        </span>
        <span className="status-item status-right">
          Mirai 0.1.0 · arm designer complete
        </span>
      </footer>
    </div>
  )
}