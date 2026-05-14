import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  taskNameAtom,
  taskDescriptionAtom,
  taskValidationAtom,
  taskNodesAtom,
  taskEdgesAtom,
} from '../../store/taskAtoms'
import { exportTaskJson, loadTaskFromFile } from '../../utils/taskExport'

import { armSegmentsAtom, armGripperAtom } from '../../store/atoms'
import {
  aiLoadingAtom,
  confidenceScoreAtom,
  generatedTaskSpecAtom,
  preflightReportAtom,
  reactStepsAtom,
} from '../../store/aiAtoms'
import { repairTask, streamTaskPlan } from '../../utils/geminiClient'
import { buildArmContext, getSceneObjectNames, buildAllowedVerbs } from '../../utils/armContextBuilder'
import { buildFlowFromAITask } from '../../utils/taskFromAI'
import NodePalette from './NodePalette'
import { useVoiceToText } from '../../hooks/useVoiceToText'
import type { ArmSegment } from '../../types/arm'

const SEGMENT_MIN_LENGTH = 0.05
const SEGMENT_MAX_LENGTH = 0.8

function parseReachDistance(message: string): { distance: number; maxReach: number } | null {
  const match = message.match(/is\s+([\d.]+)m away, but max reach is\s+([\d.]+)m/i)
  if (!match) return null

  const distance = Number(match[1])
  const maxReach = Number(match[2])
  if (!Number.isFinite(distance) || !Number.isFinite(maxReach)) return null
  return { distance, maxReach }
}

function autoConfigureArmForReach(
  armSegments: ArmSegment[],
  reachErrors: Array<{ message: string }>,
): { updated: ArmSegment[]; changed: boolean } {
  if (reachErrors.length === 0) return { updated: armSegments, changed: false }

  let requiredMaxReach = 0
  for (const error of reachErrors) {
    const parsed = parseReachDistance(String(error.message || ''))
    if (!parsed) continue
    // Keep a small practical margin to reduce immediate re-failures.
    requiredMaxReach = Math.max(requiredMaxReach, parsed.distance + 0.02)
  }

  if (requiredMaxReach <= 0) return { updated: armSegments, changed: false }

  const currentTotalLength = armSegments.reduce((sum, segment) => sum + segment.length, 0)
  if (currentTotalLength <= 0) return { updated: armSegments, changed: false }

  const targetTotalLength = Math.max(currentTotalLength, requiredMaxReach / 1.1)
  if (targetTotalLength <= currentTotalLength + 1e-6) {
    return { updated: armSegments, changed: false }
  }

  const scalableIndexes = armSegments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => segment.joint !== 'fixed')
    .map(({ index }) => index)

  if (scalableIndexes.length === 0) return { updated: armSegments, changed: false }

  const scalableTotal = scalableIndexes.reduce((sum, index) => sum + armSegments[index].length, 0)
  if (scalableTotal <= 0) return { updated: armSegments, changed: false }

  const extraNeeded = targetTotalLength - currentTotalLength
  const updated = armSegments.map((segment) => ({ ...segment }))

  let appliedExtra = 0
  for (const index of scalableIndexes) {
    const baseLength = armSegments[index].length
    const share = baseLength / scalableTotal
    const delta = extraNeeded * share
    const nextLength = Math.min(SEGMENT_MAX_LENGTH, Math.max(SEGMENT_MIN_LENGTH, baseLength + delta))
    updated[index].length = Number(nextLength.toFixed(3))
    appliedExtra += nextLength - baseLength
  }

  // If some growth was clipped by max limits, distribute remainder where possible.
  let remainder = extraNeeded - appliedExtra
  if (remainder > 1e-6) {
    for (const index of scalableIndexes) {
      if (remainder <= 1e-6) break
      const current = updated[index].length
      const headroom = SEGMENT_MAX_LENGTH - current
      if (headroom <= 0) continue
      const add = Math.min(headroom, remainder)
      updated[index].length = Number((current + add).toFixed(3))
      remainder -= add
    }
  }

  const changed = updated.some((segment, index) => Math.abs(segment.length - armSegments[index].length) > 1e-6)
  return { updated, changed }
}

export default function TaskEditorPanel() {

  const [taskName, setTaskName]         = useAtom(taskNameAtom)
  const [description, setDescription]   = useAtom(taskDescriptionAtom)
  const validation                      = useAtomValue(taskValidationAtom)
  const nodes                           = useAtomValue(taskNodesAtom)
  const edges                           = useAtomValue(taskEdgesAtom)

  // AI integration state
  const [aiInput, setAIInput] = useState('')
  const [aiError, setAIError] = useState<string | null>(null)
  const [isAILoading, setIsAILoading] = useAtom(aiLoadingAtom)
  const [reactSteps, setReactSteps] = useAtom(reactStepsAtom)
  const [generatedTask, setGeneratedTask] = useAtom(generatedTaskSpecAtom)
  const [preflight, setPreflight] = useAtom(preflightReportAtom)
  const [confidence, setConfidence] = useAtom(confidenceScoreAtom)
  const [segments, setSegments] = useAtom(armSegmentsAtom)
  const [gripper] = useAtom(armGripperAtom)
  const abortRef = useRef<AbortController | null>(null)
  const voiceSeedRef = useRef('')
  const [showAIResults, setShowAIResults] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  // Voice input state
  const {
    transcript,
    isListening,
    error: voiceError,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoiceToText()

  useEffect(() => {
    if (!isListening) return

    const base = voiceSeedRef.current.trim()
    const live = transcript.trim()
    if (!live) {
      setAIInput(base)
      return
    }

    setAIInput(base ? `${base} ${live}` : live)
  }, [isListening, transcript])

  const suggestions = useMemo(() => {
    if (!preflight) return [] as string[]

    const items: string[] = []
    const seen = new Set<string>()
    const push = (message: string) => {
      if (seen.has(message)) return
      seen.add(message)
      items.push(message)
    }

    for (const failure of preflight.errors || []) {
      const code = String(failure.error_code || '').toLowerCase()
      if (code.includes('reach')) {
        push('Move the target closer or increase arm reach by adjusting segment lengths.')
        continue
      }
      if (code.includes('payload') || code.includes('weight')) {
        push('Reduce payload, lower speed, or switch to a stronger gripper profile.')
        continue
      }
      if (code.includes('collision')) {
        push('Insert approach and retreat waypoints to avoid obstacles before grip/place.')
        continue
      }
      if (code.includes('grip')) {
        push('Ensure grip-close happens before move and grip-open happens after placement.')
        continue
      }
      if (code.includes('order') || code.includes('precondition')) {
        push('Reorder steps so preconditions are satisfied at each step.')
        continue
      }
      if (failure.suggested_fix) {
        push(String(failure.suggested_fix))
        continue
      }
      push('Break this into smaller explicit steps with named target zones.')
    }

    for (const warning of preflight.warnings || []) {
      const text = String(warning).toLowerCase()
      if (text.includes('limit') || text.includes('near')) {
        push('Slow down motion near joint limits to reduce torque spikes.')
      } else if (text.includes('confidence')) {
        push('Use shorter, explicit pick/place phrasing for higher planner confidence.')
      } else {
        push('Replay in simulation and inspect timeline markers before export.')
      }
    }

    return items.slice(0, 6)
  }, [preflight])

  const reachErrors = useMemo(
    () => (preflight?.errors || []).filter((error) => error.error_code === 'reach_violation'),
    [preflight],
  )

  const reachabilitySummary = useMemo(() => {
    if (!preflight) {
      return { label: 'Unknown', detail: 'No preflight result yet.' }
    }
    if (reachErrors.length === 0) {
      return { label: 'Pass', detail: 'All generated move targets are reachable.' }
    }
    return {
      label: 'Failed',
      detail: `${reachErrors.length} reach violation${reachErrors.length !== 1 ? 's' : ''}`,
    }
  }, [preflight, reachErrors])

  const handleAIFix = async () => {
    if (!generatedTask || !preflight || preflight.errors.length === 0 || isAILoading) return

    setIsAILoading(true)
    setAIError(null)
    try {
      let workingSegments = segments
      const reachFailures = preflight.errors.filter((error) => error.error_code === 'reach_violation')
      if (reachFailures.length > 0) {
        const tuned = autoConfigureArmForReach(segments, reachFailures)
        if (tuned.changed) {
          workingSegments = tuned.updated
          setSegments(tuned.updated)
        }
      }

      const armContext = buildArmContext(workingSegments, gripper, {})
      const repaired = await repairTask(generatedTask, preflight.errors, armContext)
      const repairedTask = repaired.repaired_task || repaired.repairedTask || null
      if (!repairedTask) {
        throw new Error('Repair endpoint returned no task')
      }

      setGeneratedTask(repairedTask)
      setTaskName(String(repairedTask.task_name || repairedTask.taskName || 'AI Repaired Task'))

      const flow = buildFlowFromAITask(repairedTask)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mirai:load-task', {
          detail: {
            nodes: flow.nodes,
            edges: flow.edges,
          },
        }))
      }

      setPreflight({
        is_safe: true,
        errors: [],
        warnings: ['Task was repaired by AI. Validate in simulation before export.', ...(reachFailures.length > 0 ? ['Arm segments auto-tuned for reachability.'] : [])],
      })

      const repairedScore = Number(repairedTask.confidence_score ?? repairedTask.confidenceScore ?? 0.8)
      setConfidence({
        overall: Math.max(0, Math.min(1, repairedScore)),
        warningFlags: ['Auto-repair applied'],
      })
    } catch (err: any) {
      setAIError('AI fix error: ' + (err?.message || String(err)))
    } finally {
      setIsAILoading(false)
    }
  }

  // AI motion generation handler
  const handleAIGenerate = async () => {
    if (!aiInput.trim() || isAILoading) return
    setIsAILoading(true)
    setAIError(null)
    setReactSteps([])
    setGeneratedTask(null)
    setPreflight(null)
    setShowAIResults(false)
    setShowAISuggestions(false)
    try {
      abortRef.current = new AbortController()
      const armContext = buildArmContext(segments, gripper, {})
      const request = {
        userInput: aiInput,
        armContext,
        sceneObjects: getSceneObjectNames({}),
        allowedVerbs: buildAllowedVerbs(),
      }
      let foundTask = false
      for await (const chunk of streamTaskPlan(request)) {
        if (abortRef.current?.signal.aborted) break
        if (chunk.type === 'react_step' && chunk.phase && chunk.content) {
          const phase = chunk.phase
          const content = chunk.content
          setReactSteps((prev) => ([
            ...prev,
            {
              phase,
              content,
              timestamp: Date.now(),
            },
          ]))
        }
        if (chunk.type === 'task_spec' && chunk.task) {
          const flow = buildFlowFromAITask(chunk.task)

          if (flow.nodes.length <= 2) {
            setAIError('AI returned an empty plan. Try a more explicit prompt like: "pick object A and place it in Zone B".')
            continue
          }

          const preflight = chunk.preflight || { is_safe: false, errors: [], warnings: ['No preflight report'] }

          setGeneratedTask(chunk.task)
          setPreflight(preflight)

          const baseConfidence = Number(chunk.task.confidence_score ?? chunk.task.confidenceScore ?? 0.75)
          setConfidence({
            overall: Math.max(0, Math.min(1, baseConfidence)),
            warningFlags: preflight.warnings || [],
          })

          // Instead of setNodes/setEdges, dispatch event for TaskFlowCanvas
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mirai:load-task', {
              detail: {
                nodes: flow.nodes,
                edges: flow.edges,
              },
            }))
          }
          setTaskName(String(chunk.task.task_name || chunk.task.taskName || 'AI Generated Task'))
          foundTask = true
        }
        if (chunk.type === 'error') {
          setAIError(chunk.error || 'AI planning error')
        }
      }
      if (!foundTask) {
        setAIError('No valid task generated by AI.')
      }
    } catch (err: any) {
      setAIError('AI error: ' + (err?.message || String(err)))
    } finally {
      setIsAILoading(false)
    }
  }

  const errorCount   = validation.issues.filter((i) => i.severity === 'error').length
  const warningCount = validation.issues.filter((i) => i.severity === 'warning').length

  const handleExport = useCallback(() => {
    exportTaskJson(taskName, description, nodes, edges)
  }, [taskName, description, nodes, edges])

  const handleLoad = useCallback(async () => {
    // Note: Canvas also handles this via the pendingAddNodeAtom pattern.
    // For full load, we emit to a shared atom that TaskFlowCanvas watches.
    // This is wired in TaskFlowCanvas via loadResultAtom — see Step 9.
    const result = await loadTaskFromFile()
    if (!result) return
    setTaskName(result.name)
    setDescription(result.description)
    // Signal canvas to reload nodes/edges — see Step 9 for loadResultAtom
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mirai:load-task', { detail: result }))
    }
  }, [setTaskName, setDescription])

  const blockCount = nodes.filter((n) => n.data.kind !== 'start').length











  
  return (
    <aside className="designer-panel task-editor-panel">



      {/* Topbar */}
      <div className="panel-topbar">
        <input
          className="panel-arm-name"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value.slice(0, 60))}
          placeholder="Unnamed task"
          maxLength={60}
          spellCheck={false}
          aria-label="Task name"
        />
        <div className="panel-topbar-actions">
          <button
            className="btn-topbar btn-topbar--ghost"
            onClick={handleLoad}
            title="Load task from file"
            style={{ cursor: 'pointer' }}
          >
            Open
          </button>
          <button
            className="btn-topbar btn-topbar--primary"
            onClick={handleExport}
            title="Save task as JSON"
            style={{ cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>




      {/* Description */}
      <div className="task-panel-desc-wrap">
        <textarea
          className="task-panel-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 400))}
          placeholder="Describe what this task does (optional)"
          rows={2}
          maxLength={400}
          spellCheck={false}
        />
      </div>






      {/* AI Generate Motion */}
      <div className="task-ai-generate-wrap">
        <div className="task-ai-generate-input-wrap">
          <textarea
            className="task-ai-generate-input"
            value={aiInput}
            onChange={e => setAIInput(e.target.value)}
            placeholder="Describe the task (e.g. pick and place the red box)"
            maxLength={200}
            disabled={isAILoading}
            aria-label="AI task description"
          />
          <button
            type="button"
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            onClick={() => {
              if (isListening) {
                stopListening()
                clearTranscript()
              } else {
                voiceSeedRef.current = aiInput
                clearTranscript()
                startListening()
              }
            }}
            className={`task-ai-voice-btn${isListening ? ' task-ai-voice-btn--listening' : ''}`}
            tabIndex={0}
            disabled={isAILoading}
          >
            {/* Mic SVG */}
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={isListening ? '#fff' : '#222'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="4" width="6" height="9" rx="3" fill={isListening ? '#fff' : 'none'} />
              <path d="M10 17v-2" />
              <path d="M6 13a4 4 0 0 0 8 0" />
            </svg>
          </button>
        </div>
        <div className="task-ai-generate-actions">
          <button
            onClick={handleAIGenerate}
            disabled={isAILoading || !aiInput.trim()}
            className={"btn-topbar btn-topbar--primary task-ai-generate-btn"}
            title="Generate motion blocks from AI"
          >
            {isAILoading ? 'Generating...' : 'Generate motion'}
          </button>
        </div>
        {(aiError || voiceError) && (
          <div className="task-ai-error">{aiError || voiceError}</div>
        )}

        <div className="task-ai-results-dropdown">
          <button
            type="button"
            className="task-ai-results-toggle"
            onClick={() => setShowAIResults((v) => !v)}
            aria-expanded={showAIResults}
          >
            <span className="task-ai-results-copy">AI Results</span>
            <svg
              className={`task-ai-results-icon${showAIResults ? ' task-ai-results-icon--open' : ''}`}
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path d="M3 5.5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showAIResults && (
            <div className="task-ai-results-body">
              {generatedTask ? (
                <>
                  <div className="task-ai-results-row">
                    <span>Confidence</span>
                    <strong>{Math.round((confidence.overall || 0) * 100)}%</strong>
                  </div>
                  <div className="task-ai-results-row">
                    <span>Safety</span>
                    <strong>{(generatedTask && confidence.warningFlags.length === 0) ? 'Safe' : 'Needs review'}</strong>
                  </div>
                  <div className="task-ai-results-row">
                    <span>Reachability</span>
                    <strong className={reachabilitySummary.label === 'Pass' ? 'task-ai-pass' : 'task-ai-fail'}>
                      {reachabilitySummary.label}
                    </strong>
                  </div>
                  {reachabilitySummary.label !== 'Pass' && (
                    <div className="task-ai-results-steps">{reachabilitySummary.detail}</div>
                  )}
                  {reachErrors.length > 0 && (
                    <ul className="task-ai-results-warnings">
                      {reachErrors.slice(0, 3).map((error, index) => (
                        <li key={index}>{error.message}</li>
                      ))}
                    </ul>
                  )}
                  {confidence.warningFlags.length > 0 && (
                    <ul className="task-ai-results-warnings">
                      {confidence.warningFlags.slice(0, 4).map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  )}
                  {reactSteps.length > 0 && (
                    <div className="task-ai-results-steps">ReAct steps: {reactSteps.length}</div>
                  )}

                  <div className="task-ai-results-actions">
                    <button
                      type="button"
                      className="task-ai-results-action-btn task-ai-results-action-btn--fix"
                      onClick={handleAIFix}
                      disabled={isAILoading || !preflight || preflight.errors.length === 0}
                      title={!preflight || preflight.errors.length === 0 ? 'No fix needed' : 'Apply AI fixes to this task'}
                    >
                      {isAILoading ? 'Fixing...' : 'AI Fix'}
                    </button>
                    <button
                      type="button"
                      className="task-ai-results-action-btn"
                      onClick={() => setShowAISuggestions((v) => !v)}
                    >
                      {showAISuggestions ? 'Hide AI Suggestions' : 'AI Suggestions'}
                    </button>
                  </div>

                  {showAISuggestions && (
                    <div className="task-ai-suggestions-list">
                      {suggestions.length > 0 ? (
                        suggestions.map((item, index) => (
                          <div key={index} className="task-ai-suggestion-item">
                            {item}
                          </div>
                        ))
                      ) : (
                        <div className="task-ai-suggestion-empty">
                          No suggestions right now.
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="task-ai-results-empty">No AI result yet. Generate motion to see summary.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Palette */}
      <div className="panel-content">
        <NodePalette />
      </div>




      {/* Validation footer */}
      <div className="panel-footer task-validation-footer">
        <div className={`task-val-badge ${validation.isValid ? 'task-val-badge--ok' : 'task-val-badge--fail'}`}>
          {validation.isValid ? (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M5 8.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Valid — {blockCount} block{blockCount !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6"/>
                <line x1="8" y1="4.5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <circle cx="8" cy="11" r="0.9" fill="currentColor"/>
              </svg>
              {errorCount > 0 && `${errorCount} error${errorCount !== 1 ? 's' : ''}`}
              {errorCount > 0 && warningCount > 0 && ', '}
              {warningCount > 0 && `${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
            </>
          )}
        </div>

        {validation.issues.length > 0 && (
          <div className="task-val-issues">
            {validation.issues.slice(0, 5).map((issue, i) => (
              <div
                key={i}
                className={`task-val-issue task-val-issue--${issue.severity}`}
              >
                <span className="task-val-issue-dot" />
                <span className="task-val-issue-msg">{issue.message}</span>
              </div>
            ))}
            {validation.issues.length > 5 && (
              <div className="task-val-issue-more">
                +{validation.issues.length - 5} more
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}