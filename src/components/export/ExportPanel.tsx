// src/components/export/ExportPanel.tsx
import { useAtomValue }                          from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'
import { armSegmentsAtom, armGripperAtom, armNameAtom, armServoTierAtom } from '../../store/atoms'
import { compiledPlanAtom }                      from '../../store/simAtoms'
import { taskNameAtom, taskDescriptionAtom }     from '../../store/taskAtoms'
import type { ArmSegment }                       from '../../types/arm'
import type { ExportPreviewData, ExportPreviewTab } from '../../types/export'
import { sampleWaypoints, buildExportPayload }  from '../../utils/exportHelpers'
import CodePreview                              from './CodePreview'
import BOMTable                                 from './BOMTable'
import './export.css'







const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? 'http://localhost:8000'

const TAB_LABELS: Record<ExportPreviewTab, string> = {
  arduino: 'Arduino .ino',
  python:  'Python .py',
  bom:     'Bill of Materials',
  urdf:    'URDF',
}









//Spinner SVG 
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="exp-spin"
      width={size} height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M14 8a6 6 0 1 1-2-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}









// Component 
export default function ExportPanel() {

  //Read from existing Jotai atoms
  const segments  = useAtomValue(armSegmentsAtom)
  const gripper   = useAtomValue(armGripperAtom)
  const armName   = useAtomValue(armNameAtom)
  const servoTier = useAtomValue(armServoTierAtom)
  const plan      = useAtomValue(compiledPlanAtom)
  const taskName  = useAtomValue(taskNameAtom)
  const taskDesc  = useAtomValue(taskDescriptionAtom)

  const liveUrl = (import.meta.env.VITE_LIVE_URL as string | undefined) ?? ''

  // ── Local UI state ────────────────────────────────────────────────────────
  const [activeTab,     setActiveTab]    = useState<ExportPreviewTab>('arduino')
  const [preview,       setPreview]      = useState<ExportPreviewData | null>(null)
  const [loadPreview,   setLoadPreview]  = useState(false)
  const [downloading,   setDownloading]  = useState(false)
  const [error,         setError]        = useState<string | null>(null)
  const [sha256,        setSha256]       = useState<string | null>(null)
  const autoRan = useRef(false)

  // Auto-generate preview once when the plan is available
  useEffect(() => {
    if (plan && !preview && !loadPreview && !autoRan.current) {
      autoRan.current = true
      handleGeneratePreview()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan])

  // ── API: preview ──────────────────────────────────────────────────────────
  const handleGeneratePreview = useCallback(async () => {
    if (!plan) return
    setLoadPreview(true)
    setError(null)
    try {
      const body = buildExportPayload(
        armName, taskName, taskDesc, segments, gripper, servoTier, plan, liveUrl,
      )
      const res = await fetch(`${API_BASE}/export/preview`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Preview failed — HTTP ${res.status}`)
      setPreview(await res.json())
    } catch (err: any) {
      setError(err.message ?? 'Preview failed. Is the backend running?')
    } finally {
      setLoadPreview(false)
    }
  }, [plan, armName, taskName, taskDesc, segments, gripper, servoTier, liveUrl])

  // ── API: download bundle ──────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (!plan) return
    setDownloading(true)
    setError(null)
    try {
      const body = buildExportPayload(
        armName, taskName, taskDesc, segments, gripper, servoTier, plan, liveUrl,
      )
      const res = await fetch(`${API_BASE}/export/bundle`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Bundle failed — HTTP ${res.status}`)

      const hash = res.headers.get('X-SHA256')
      if (hash) setSha256(hash)

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const slug = (taskName || 'mirai_task').toLowerCase().replace(/\s+/g, '_')
      a.href     = url
      a.download = `${slug}_mirai.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message ?? 'Download failed. Is the backend running?')
    } finally {
      setDownloading(false)
    }
  }, [plan, armName, taskName, taskDesc, segments, gripper, servoTier, liveUrl])

  // ── Derived helpers ────────────────────────────────────────────────────────
  const revolute    = segments.filter((s: ArmSegment) => s.joint === 'revolute')
  const waypoints   = plan ? sampleWaypoints(plan, segments) : []
  const totalReachMm = Math.round(
    segments.reduce((s: number, seg: ArmSegment) => s + seg.length, 0) * 1100,
  )

  // ── Empty state — no simulation compiled yet ───────────────────────────────
  if (!plan) {
    return (
      <div className="exp-root">
        <div className="exp-empty">
          <svg className="exp-empty-icon" width="52" height="52" viewBox="0 0 52 52" fill="none">
            <rect x="10" y="8" width="32" height="38" rx="4"
                  stroke="currentColor" strokeWidth="2" />
            <line x1="17" y1="18" x2="35" y2="18"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="17" y1="24" x2="35" y2="24"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="17" y1="30" x2="27" y2="30"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="exp-empty-title">Nothing to export yet</span>
          <span className="exp-empty-sub">
            Design arm → generate task in Tasks tab → run simulation → come back here.
          </span>
        </div>
      </div>
    )
  }











  // Main panel
  return (
    <div className="exp-root">

      {/*Hero */}
      <div className="exp-hero">
        <div className="exp-hero-left">
          <div className="exp-hero-title">{taskName || 'Untitled Task'}</div>
          <div className="exp-hero-sub">
            {armName} &middot; {revolute.length} joints &middot; {waypoints.length} waypoints
            &middot; {(plan.durationMs / 1000).toFixed(1)}s &middot; max reach {totalReachMm}mm
          </div>
        </div>
        {preview && (
          <span className="exp-hero-badge">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="m5 8 2 2 4-4"
                    stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Preview ready
          </span>
        )}
      </div>

      {/*  Error banner*/}
      {error && (
        <div className="exp-error-banner">{error}</div>
      )}

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="exp-tabs">
        {(Object.keys(TAB_LABELS) as ExportPreviewTab[]).map(tab => (
          <button
            key={tab}
            className={`exp-tab${activeTab === tab ? ' exp-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ cursor: 'pointer' }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}

        {/* Regenerate button — right aligned */}
        <button
          className="exp-tab"
          onClick={handleGeneratePreview}
          disabled={loadPreview}
          style={{ cursor: loadPreview ? 'default' : 'pointer', marginLeft: 'auto' }}
        >
          {loadPreview ? <Spinner /> : (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 2.5v4.5h-4.5"
                    stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.36 7A6 6 0 1 1 10.5 3.14"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          {loadPreview ? 'Generating...' : preview ? 'Regenerate' : 'Generate preview'}
        </button>
      </div>

      {/* ── Content area ─────────────────────────────────────────────────── */}
      <div className="exp-content">

        {/* Left: code / bom view */}
        {loadPreview ? (
          <div className="exp-code-panel exp-code-panel--loading">
            <Spinner size={28} />
            <span style={{ fontSize: '0.88rem', color: '#888', marginTop: 12 }}>
              Generating code...
            </span>
          </div>
        ) : preview ? (
          <>
            {activeTab === 'arduino' && (
              <CodePreview code={preview.arduino} language="arduino" />
            )}
            {activeTab === 'python' && (
              <CodePreview code={preview.python} language="python" />
            )}
            {activeTab === 'urdf' && (
              <CodePreview code={preview.urdf} language="urdf" />
            )}
            {activeTab === 'bom' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <BOMTable bom={preview.bom} />
              </div>
            )}
          </>
        ) : (
          <div className="exp-code-panel exp-code-panel--loading">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"
                 style={{ color: '#d1d5db' }}>
              <path d="M18 6v12M12 13l6 5 6-5"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
              <rect x="6" y="25" width="24" height="5" rx="2"
                    stroke="currentColor" strokeWidth="2" />
            </svg>
            <span style={{ fontSize: '0.88rem', color: '#888', marginTop: 10 }}>
              Click "Generate preview" to see the code
            </span>
          </div>
        )}

        {/* Right: sidebar */}
        <div className="exp-sidebar">

          {/* Download bundle */}
          <div className="exp-card">
            <div className="exp-card-title">Export Bundle</div>
            <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: 14, lineHeight: 1.5 }}>
              Downloads a signed ZIP with .ino, .py, BOM, URDF, QR code, and SHA-256 manifest.
            </p>
            <button
              className="exp-dl-primary"
              onClick={handleDownload}
              disabled={downloading}
              style={{ cursor: downloading ? 'default' : 'pointer' }}
            >
              {downloading ? (
                <><Spinner /> Building bundle...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v8M5 7l3 3 3-3"
                          stroke="currentColor" strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1"
                          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Download Bundle (.zip)
                </>
              )}
            </button>
          </div>

          {/* SHA-256 */}
          {sha256 && (
            <div className="exp-card">
              <div className="exp-card-title">SHA-256 Signature</div>
              <div className="exp-sha">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="7" width="10" height="8" rx="1.5"
                        stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5 7V5a3 3 0 0 1 6 0v2"
                        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                {sha256}
              </div>
            </div>
          )}

          {/* Arm summary */}
          <div className="exp-card">
            <div className="exp-card-title">Arm Configuration</div>
            {segments.map((seg: ArmSegment, i: number) => (
              <div key={seg.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: i < segments.length - 1
                  ? '1px solid rgba(0,0,0,0.05)' : 'none',
                fontSize: '0.82rem',
              }}>
                <span style={{ color: '#333', fontWeight: 500 }}>{seg.name}</span>
                <span style={{ color: '#666' }}>
                  {(seg.length * 1000).toFixed(0)}mm &middot; {seg.joint}
                </span>
              </div>
            ))}
            <div style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid rgba(0,0,0,0.07)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
            }}>
              <span style={{ color: '#333', fontWeight: 600 }}>Gripper</span>
              <span style={{ color: '#666' }}>{gripper.type.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Task stats */}
          <div className="exp-card">
            <div className="exp-card-title">Task Stats</div>
            {[
              { label: 'Duration',      value: `${(plan.durationMs / 1000).toFixed(1)}s` },
              { label: 'Total frames',  value: plan.totalFrames.toLocaleString() },
              { label: 'Waypoints',     value: String(waypoints.length) },
              { label: 'Revolute joints', value: String(revolute.length) },
              { label: 'Max reach',     value: `${totalReachMm}mm` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '5px 0',
                fontSize: '0.82rem',
              }}>
                <span style={{ color: '#666' }}>{label}</span>
                <span style={{
                  color: '#0d0d0d',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
