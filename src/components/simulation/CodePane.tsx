import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  codeLanguageAtom,
  generatedCodeCacheAtom,
  codePaneLoadingAtom,
} from '../../store/mujocoAtoms'
import { currentFrameAtom, compiledPlanAtom } from '../../store/simAtoms'
import { armSegmentsAtom, armGripperAtom, armNameAtom } from '../../store/atoms'
import { taskNameAtom } from '../../store/taskAtoms'
import { fetchCodePreview } from '../../utils/geminiClient'
import { sampleWaypoints } from '../../utils/exportHelpers'


type CodeLanguage = 'arduino' | 'python'

type DisplayLine = {
  text: string
  originalLineNum: number
}



const ARDUINO_KEYWORDS = new Set([
  'void','int','float','bool','char','if','else','for','while','return',
  'setup','loop','Serial','delay','analogWrite','digitalWrite','HIGH','LOW',
  'true','false','const','#include','#define',
])

const PYTHON_KEYWORDS = new Set([
  'import','from','def','class','if','else','elif','for','while','return',
  'True','False','None','and','or','not','in','is','with','as','try',
  'except','finally','pass','break','continue','lambda',
])

type Token = { kind: 'keyword' | 'number' | 'string' | 'comment' | 'plain'; text: string }

function tokenize(line: string, lang: CodeLanguage): Token[] {
  const keywords = lang === 'arduino' ? ARDUINO_KEYWORDS : PYTHON_KEYWORDS
  const tokens: Token[] = []

  // Single-line comments
  const commentStart = lang === 'python' ? line.indexOf('#') : line.indexOf('//')
  let code = line
  let comment = ''
  if (commentStart !== -1) {
    code    = line.slice(0, commentStart)
    comment = line.slice(commentStart)
  }

  // Tokenize code portion with simple regex
  const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|[^A-Za-z0-9_"'\s]+|\s+)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(code)) !== null) {
    const t = match[0]
    if (!t) continue
    if ((t.startsWith('"') || t.startsWith("'")) && t.length > 1) {
      tokens.push({ kind: 'string', text: t })
    } else if (/^\d/.test(t)) {
      tokens.push({ kind: 'number', text: t })
    } else if (keywords.has(t)) {
      tokens.push({ kind: 'keyword', text: t })
    } else {
      tokens.push({ kind: 'plain', text: t })
    }
  }

  if (comment) tokens.push({ kind: 'comment', text: comment })
  return tokens
}

function isPrintStatement(line: string, lang: CodeLanguage): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  if (lang === 'arduino') {
    return trimmed.includes('Serial.print(') || trimmed.includes('Serial.println(')
  }

  return /(^|\s)print\s*\(/.test(trimmed)
}

function extractPrintOutput(line: string, lang: CodeLanguage): string {
  const trimmed = line.trim()

  if (lang === 'arduino') {
    const match = trimmed.match(/Serial\.print(?:ln)?\(F\((['"])(.*?)\1\)\)/)
      ?? trimmed.match(/Serial\.print(?:ln)?\((['"])(.*?)\1\)/)
    return match?.[2] ?? trimmed
  }

  const match = trimmed.match(/print\((['"])(.*?)\1\)/)
  return match?.[2] ?? trimmed
}

function buildDisplayLines(code: string | null, lang: CodeLanguage, printOnly: boolean): DisplayLine[] {
  if (!code) return []

  const sourceLines = code.split('\n')
  if (!printOnly) {
    return sourceLines.map((text, index) => ({ text, originalLineNum: index + 1 }))
  }

  return sourceLines
    .map((text, index) => ({
      source: text,
      text: extractPrintOutput(text, lang),
      originalLineNum: index + 1,
    }))
    .filter(({ source }) => isPrintStatement(source, lang))
    .map(({ text, originalLineNum }) => ({ text, originalLineNum }))
}

function CodeLine({ line, lineNum, isActive, lang }: {
  line: string
  lineNum: number
  isActive: boolean
  lang: CodeLanguage
}) {
  const tokens = tokenize(line, lang)
  return (
    <div className={`cp-line${isActive ? ' cp-line--active' : ''}`}>
      <span className="cp-linenum">{lineNum}</span>
      <span className="cp-code">
        {tokens.map((t, i) => (
          <span key={i} className={`cp-tok cp-tok--${t.kind}`}>{t.text}</span>
        ))}
      </span>
    </div>
  )
}




















// Main component

export default function CodePane() {
  const [lang, setLang]             = useAtom(codeLanguageAtom)
  const [codeCache, setCodeCache]   = useAtom(generatedCodeCacheAtom)
  const [loading, setLoading]       = useAtom(codePaneLoadingAtom)
  const currentFrame                = useAtomValue(currentFrameAtom)
  const compiledPlan                = useAtomValue(compiledPlanAtom)
  const segments                    = useAtomValue(armSegmentsAtom)
  const gripper                     = useAtomValue(armGripperAtom)
  const armName                     = useAtomValue(armNameAtom)
  const taskName                    = useAtomValue(taskNameAtom)

  const [error, setError]           = useState<string | null>(null)
  const [copied, setCopied]         = useState(false)
  const [printOnly, setPrintOnly]   = useState(false)
  const containerRef                = useRef<HTMLDivElement>(null)

  const code = codeCache ? codeCache[lang] : null
  const displayLines = buildDisplayLines(code, lang, printOnly)
  const copyText = displayLines.map(({ text }) => text).join('\n')
  const totalFrames = compiledPlan?.totalFrames ?? 1

  // Map current frame to approximate active code line
  const progress    = Math.min(1, currentFrame / Math.max(1, totalFrames - 1))
  const activeLine  = Math.max(0, Math.floor(progress * Math.max(0, displayLines.length - 1)))

  // Auto-scroll active line into view
  useEffect(() => {
    const el = containerRef.current
    if (!el || displayLines.length === 0) return
    const lineHeight = 22  // matches CSS cp-line height
    const targetScrollTop = Math.max(0, (activeLine - 8) * lineHeight)
    el.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
  }, [activeLine, displayLines.length])

  const handleFetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Build minimal arm export payload matching ArmConfigExport schema
      const armPayload = {
        name: armName || 'Mirai Arm',
        segments: segments.map(s => ({
          id:              s.id,
          name:            s.name,
          length:          s.length,
          mass:            s.mass,
          joint:           s.joint,
          joint_limit_min: s.jointLimitMin ?? -180,
          joint_limit_max: s.jointLimitMax ??  180,
          material:        s.material ?? 'aluminum',
        })),
        gripper: {
          type:  gripper.type,
          name:  gripper.name,
          width: gripper.width,
          force: gripper.force,
        },
      }

      // Use the same semantic sampler as Export so Simulation preview matches downloaded output.
      const waypoints = compiledPlan
        ? sampleWaypoints(compiledPlan, segments)
        : [{ time_ms: 0, waist_yaw_deg: 0, pitch_angles: [0, 0], gripper_open: true, gripper_force: 0, end_effector: [0, 0, 0], label: 'default' }]

      const taskPayload = {
        task_name:        taskName || 'Mirai Task',
        task_description: '',
        waypoints,
      }

      const result = await fetchCodePreview(
        armPayload as Record<string, unknown>,
        taskPayload as Record<string, unknown>,
      )
      setCodeCache(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code generation failed.')
    } finally {
      setLoading(false)
    }
  }, [armName, segments, gripper, compiledPlan, taskName, setCodeCache, setLoading])

  const handleCopy = useCallback(() => {
    if (!copyText) return
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [copyText])

  // Auto-fetch when pane becomes visible and there's a compiled plan
  useEffect(() => {
    if (!codeCache && compiledPlan && !loading) {
      handleFetch()
    }
  }, [codeCache, compiledPlan])  // eslint-disable-line react-hooks/exhaustive-deps

  const progressPct = Math.round(progress * 100)

  return (
    <div className="cp-root">
      {/* Toolbar */}
      <div className="cp-toolbar">
        <div className="cp-lang-toggle">
          <button
            className={`cp-lang-btn${lang === 'arduino' ? ' cp-lang-btn--active' : ''}`}
            onClick={() => setLang('arduino')}
            style={{ cursor: 'pointer' }}
          >
            Arduino
          </button>
          <button
            className={`cp-lang-btn${lang === 'python' ? ' cp-lang-btn--active' : ''}`}
            onClick={() => setLang('python')}
            style={{ cursor: 'pointer' }}
          >
            Python
          </button>
          <button
            className={`cp-lang-btn${printOnly ? ' cp-lang-btn--active' : ''}`}
            onClick={() => setPrintOnly((value) => !value)}
            style={{ cursor: 'pointer' }}
            title="Show only print statements"
          >
            Prints only
          </button>
        </div>

        <div className="cp-toolbar-right">
          <span className="cp-frame-badge">{progressPct}%</span>
          <button
            className="cp-icon-btn"
            onClick={handleFetch}
            disabled={loading}
            title="Regenerate code"
            style={{ cursor: loading ? 'default' : 'pointer' }}
          >
            <svg
              width="14" height="14" viewBox="0 0 16 16" fill="none"
              className={loading ? 'cp-spin' : ''}
            >
              <path d="M13.5 2.5v4.5h-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.36 7A6 6 0 1 1 10.5 3.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            className="cp-icon-btn"
            onClick={handleCopy}
            disabled={!copyText}
            title={copied ? 'Copied!' : printOnly ? 'Copy print statements' : 'Copy code'}
            style={{ cursor: !copyText ? 'default' : 'pointer' }}
          >
            {copied
              ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3 8 3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            }
          </button>
        </div>
      </div>

      {/* Playback progress bar */}
      <div className="cp-progress-track">
        <div className="cp-progress-bar" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Content area */}
      {loading && (
        <div className="cp-loading">
          <svg className="cp-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 12a9 9 0 1 1-3.1-6.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <span>Generating code...</span>
        </div>
      )}

      {error && !loading && (
        <div className="cp-error">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span>{error}</span>
          <button className="cp-retry-btn" onClick={handleFetch} style={{ cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && !code && (
        <div className="cp-empty">
          <span>Compile a task in Simulate to generate code.</span>
          {compiledPlan && (
            <button className="cp-gen-btn" onClick={handleFetch} style={{ cursor: 'pointer' }}>
              Generate code
            </button>
          )}
        </div>
      )}

      {!loading && !error && !!code && printOnly && displayLines.length === 0 && (
        <div className="cp-empty">
          <span>No print statements found in the {lang} code.</span>
        </div>
      )}

      {!loading && !error && code && displayLines.length > 0 && (
        <div className="cp-scroll" ref={containerRef}>
          {displayLines.map(({ text, originalLineNum }, i) => (
            <CodeLine
              key={`${originalLineNum}-${i}`}
              line={text}
              lineNum={originalLineNum}
              isActive={i === activeLine}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  )
}
