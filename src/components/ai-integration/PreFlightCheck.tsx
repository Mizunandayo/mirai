import { useAtom } from 'jotai'
import { useMemo, useState } from 'react'
import {
  preflightReportAtom,
  generatedTaskSpecAtom,
  aiLoadingAtom,
  confidenceScoreAtom,
} from '../../store/aiAtoms'
import { taskNodesAtom, taskEdgesAtom, taskNameAtom } from '../../store/taskAtoms'
import { repairTask } from '../../utils/geminiClient'
import { buildFlowFromAITask } from '../../utils/taskFromAI'
import './preflight-check.css'

type PreFlightCheckProps = {
  armContext: any
}

export default function PreFlightCheck({ armContext }: PreFlightCheckProps) {
  const [preflightReport, setPreflightReport] = useAtom(preflightReportAtom)
  const [generatedTask, setGeneratedTask] = useAtom(generatedTaskSpecAtom)
  const [, setIsLoading] = useAtom(aiLoadingAtom)
  const [, setConfidence] = useAtom(confidenceScoreAtom)
  const [, setNodes] = useAtom(taskNodesAtom)
  const [, setEdges] = useAtom(taskEdgesAtom)
  const [, setTaskName] = useAtom(taskNameAtom)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = useMemo(() => {
    if (!preflightReport) return [] as string[]

    const items: string[] = []
    const seen = new Set<string>()
    const push = (message: string) => {
      if (seen.has(message)) return
      seen.add(message)
      items.push(message)
    }

    for (const failure of preflightReport.errors) {
      const code = String(failure.error_code || '').toLowerCase()
      if (code.includes('reach')) {
        push('Move the target closer or increase arm reach by adjusting segment lengths.')
        continue
      }
      if (code.includes('payload') || code.includes('weight')) {
        push('Reduce object payload, lower speed, or switch to a stronger gripper profile.')
        continue
      }
      if (code.includes('collision')) {
        push('Insert approach and retreat waypoints to avoid obstacles before gripping or placing.')
        continue
      }
      if (code.includes('grip')) {
        push('Add a grip close step before moving the object and a grip open step after placement.')
        continue
      }
      if (code.includes('order') || code.includes('precondition')) {
        push('Reorder steps so object selection, grip, movement, and release follow a valid sequence.')
        continue
      }
      if (failure.suggested_fix) {
        push(String(failure.suggested_fix))
        continue
      }
      push('Refine this step with smaller moves and explicit target zones for better reliability.')
    }

    for (const warning of preflightReport.warnings) {
      const text = String(warning).toLowerCase()
      if (text.includes('limit') || text.includes('near')) {
        push('Add a slower approach on near-limit joints to reduce torque spikes.')
      } else if (text.includes('confidence')) {
        push('Simplify the instruction into shorter, explicit pick/place commands for higher confidence.')
      } else {
        push('Run a short simulation replay and inspect the timeline markers before exporting.')
      }
    }

    if (generatedTask && items.length < 3) {
      push('Use named target zones in Move blocks instead of raw coordinates where possible.')
      push('Keep one object goal per sequence branch to make troubleshooting faster.')
    }

    return items.slice(0, 6)
  }, [generatedTask, preflightReport])

  async function handleFixAll() {
    if (!generatedTask || !preflightReport || preflightReport.errors.length === 0) return

    setIsLoading(true)
    try {
      const repaired = await repairTask(generatedTask, preflightReport.errors, armContext)
      const repairedTask = repaired.repaired_task || repaired.repairedTask || null
      if (!repairedTask) throw new Error('Repair endpoint returned no task')

      setGeneratedTask(repairedTask)

      const flow = buildFlowFromAITask(repairedTask)
      setNodes(flow.nodes)
      setEdges(flow.edges)
      setTaskName(String(repairedTask.task_name || repairedTask.taskName || 'AI Repaired Task'))

      setPreflightReport({
        is_safe: true,
        errors: [],
        warnings: ['Task was repaired by AI. Validate in simulation before export.'],
      })

      const score = Number(repairedTask.confidence_score ?? repairedTask.confidenceScore ?? 0.8)
      setConfidence({
        overall: Math.max(0, Math.min(1, score)),
        warningFlags: ['Auto-repair applied'],
      })
    } catch (error) {
      setPreflightReport((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          warnings: prev.warnings.concat('Repair failed: ' + String(error)),
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!preflightReport) {
    return <div className='preflight-empty'>No validation result yet</div>
  }

  return (
    <div className='preflight-panel'>
      {preflightReport.is_safe ? (
        <div className='preflight-success'>
          <div className='preflight-text'>All checks passed. Ready to simulate.</div>
        </div>
      ) : (
        <>
          <div className='preflight-errors'>
            {preflightReport.errors.map((error, idx) => (
              <div key={idx} className='preflight-error'>
                <div className='error-code'>{error.error_code}</div>
                <div className='error-message'>{error.message}</div>
              </div>
            ))}
          </div>
          <button className='preflight-fix-btn' onClick={handleFixAll}>
            <span>Fix All with AI</span>
          </button>
        </>
      )}

      <button
        className='preflight-suggest-btn'
        onClick={() => setShowSuggestions((prev) => !prev)}
        type='button'
        aria-expanded={showSuggestions}
      >
        <span>{showSuggestions ? 'Hide AI Suggestions' : 'Show AI Suggestions'}</span>
      </button>

      {showSuggestions && (
        <div className='preflight-suggestions'>
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, idx) => (
              <div key={idx} className='preflight-suggestion'>
                <span>{suggestion}</span>
              </div>
            ))
          ) : (
            <div className='preflight-suggestion preflight-suggestion--empty'>
              <span>No suggestions yet. Generate a task first to get guidance.</span>
            </div>
          )}
        </div>
      )}

      {preflightReport.warnings.length > 0 && (
        <div className='preflight-warnings'>
          {preflightReport.warnings.map((warn, idx) => (
            <div key={idx} className='preflight-warning'>
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}