import { useCallback, useRef, useState } from 'react'
import { useSetAtom } from 'jotai'
import { armSegmentsAtom, armGripperAtom, armDesignTargetsAtom } from '../../store/atoms'
import { designArmFromNL, type NLDesignResult } from '../../utils/armNLDesigner'

type Phase = 'idle' | 'loading' | 'done' | 'error'









export default function NLArmDesigner() {
  const setSegments = useSetAtom(armSegmentsAtom)
  const setGripper  = useSetAtom(armGripperAtom)
  const setTargets  = useSetAtom(armDesignTargetsAtom)

  const [input, setInput]   = useState('')
  const [phase, setPhase]   = useState<Phase>('idle')
  const [result, setResult] = useState<NLDesignResult | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const inputRef            = useRef<HTMLInputElement>(null)

  const handleConfigure = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || phase === 'loading') return

    setPhase('loading')
    setError(null)
    setResult(null)

    try {
      const design = await designArmFromNL(trimmed)
      if (!design) {
        setError('Could not interpret this description. Try: "reach 1m, lift 500g"')
        setPhase('error')
        return
      }

      setSegments(design.segments)
      setGripper(design.gripper)
      setTargets({
        reachMeters: design.params.reachMeters,
        payloadGrams: design.params.payloadGrams,
        jointCount: design.params.jointCount,
      })
      setResult(design)
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration failed.')
      setPhase('error')
    }
  }, [input, phase, setSegments, setGripper, setTargets])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleConfigure()
    if (e.key === 'Escape') {
      setInput('')
      setPhase('idle')
      setResult(null)
      setError(null)
    }
  }

  const handleDismiss = () => {
    setPhase('idle')
    setResult(null)
    setError(null)
    setInput('')
    inputRef.current?.focus()
  }









  return (
    <div className="nld-root">
      <div className="nld-input-row">
        {/* Gemini sparkle icon */}
        <span className="nld-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </span>

        <input
          ref={inputRef}
          className="nld-input"
          type="text"
          placeholder="reach 1.2m, lift 500g, 3 joints…"
          value={input}
          onChange={e => setInput(e.target.value.slice(0, 120))}
          onKeyDown={handleKeyDown}
          disabled={phase === 'loading'}
          aria-label="Describe arm in natural language"
          maxLength={120}
        />

        <button
          type="button"
          className={`nld-btn${phase === 'loading' ? ' nld-btn--loading' : ''}`}
          onClick={handleConfigure}
          disabled={!input.trim() || phase === 'loading'}
          title="Configure arm from description"
          style={{ cursor: (!input.trim() || phase === 'loading') ? 'default' : 'pointer' }}
        >
          {phase === 'loading'
            ? <svg className="nld-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 1 1-3.1-6.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            : 'Set'
          }
        </button>
      </div>

      {/* Result / error strip */}
      {phase === 'done' && result && (
        <div className="nld-result" key={result.summary}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="nld-result-text">
            <strong>Configured:</strong> {result.summary}
          </span>
          {result.confidence !== 'high' && (
            <span className="nld-confidence-pill">~{result.confidence}</span>
          )}
          <button
            type="button"
            className="nld-dismiss"
            onClick={handleDismiss}
            title="Dismiss"
            style={{ cursor: 'pointer' }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {phase === 'error' && error && (
        <div className="nld-error">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span>{error}</span>
          <button
            type="button"
            className="nld-dismiss"
            onClick={handleDismiss}
            title="Dismiss"
            style={{ cursor: 'pointer' }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
