import { useState, useRef } from 'react'
import { useAtom } from 'jotai'
import {
  aiTextInputAtom,
  aiLoadingAtom,
  reactStepsAtom,
  generatedTaskSpecAtom,
  preflightReportAtom,
  confidenceScoreAtom,
} from '../../store/aiAtoms'
import { armSegmentsAtom, armGripperAtom } from '../../store/atoms'
import { taskNodesAtom, taskEdgesAtom, taskNameAtom } from '../../store/taskAtoms'
import VoiceInput from './VoiceInput'
import TextInput from './TextInput'
import ReActPanel from './ReActPanel'
import PreFlightCheck from './PreFlightCheck'
import ConfidenceScore from './ConfidenceScore'
import { streamTaskPlan } from '../../utils/geminiClient'
import { buildArmContext, getSceneObjectNames, buildAllowedVerbs } from '../../utils/armContextBuilder'
import { buildFlowFromAITask } from '../../utils/taskFromAI'
import './ai-integration.css'

type TabId = 'voice' | 'text' | 'react' | 'results'









export default function AIPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('text')
  const [segments] = useAtom(armSegmentsAtom)
  const [gripper] = useAtom(armGripperAtom)
  const [userInput, setUserInput] = useAtom(aiTextInputAtom)
  const [isLoading, setIsLoading] = useAtom(aiLoadingAtom)
  const [reactSteps, setReactSteps] = useAtom(reactStepsAtom)
  const [, setGeneratedTask] = useAtom(generatedTaskSpecAtom)
  const [, setPreflight] = useAtom(preflightReportAtom)
  const [, setConfidence] = useAtom(confidenceScoreAtom)
  const [, setNodes] = useAtom(taskNodesAtom)
  const [, setEdges] = useAtom(taskEdgesAtom)
  const [, setTaskName] = useAtom(taskNameAtom)

  const abortRef = useRef<AbortController | null>(null)

  async function handlePlanSubmit(input: string) {
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setReactSteps([])
    setGeneratedTask(null)
    setPreflight(null)
    setActiveTab('react')

    try {
      abortRef.current = new AbortController()

      const armContext = buildArmContext(segments, gripper, {})
      const request = {
        userInput: input,
        armContext,
        sceneObjects: getSceneObjectNames({}),
        allowedVerbs: buildAllowedVerbs(),
      }

      for await (const chunk of streamTaskPlan(request)) {
        if (abortRef.current?.signal.aborted) break

        if (chunk.type === 'react_step') {
          const phase = chunk.phase
          const content = chunk.content
          if (!phase || !content) {
            continue
          }

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
          const task = chunk.task
          const preflight = chunk.preflight || { is_safe: false, errors: [], warnings: ['No preflight report'] }

          setGeneratedTask(task)
          setPreflight(preflight)

          const flow = buildFlowFromAITask(task)
          if (flow.nodes.length <= 2) {
            setReactSteps((prev) => ([
              ...prev,
              {
                phase: 'observe',
                content: 'AI returned an empty plan. Try a more explicit prompt with concrete pick/place steps.',
                timestamp: Date.now(),
              },
            ]))
            setActiveTab('react')
            continue
          }
          setNodes(flow.nodes)
          setEdges(flow.edges)

          const name = String(task.task_name || task.taskName || 'AI Generated Task')
          setTaskName(name)

          const baseConfidence = Number(task.confidence_score ?? task.confidenceScore ?? 0.75)
          setConfidence({
            overall: Math.max(0, Math.min(1, baseConfidence)),
            warningFlags: preflight.warnings || [],
          })

          setActiveTab('results')
        }

        if (chunk.type === 'error') {
          setReactSteps((prev) => ([
            ...prev,
            {
            phase: 'observe',
            content: String(chunk.error || 'Unknown planning error'),
            timestamp: Date.now(),
            },
          ]))
          setActiveTab('results')
        }
      }
    } catch (error) {
      setReactSteps((prev) => ([
        ...prev,
        {
        phase: 'observe',
        content: 'Streaming error: ' + String(error),
        timestamp: Date.now(),
        },
      ]))
      setActiveTab('results')
    } finally {
      setIsLoading(false)
    }
  }

  function handleAbort() {
    abortRef.current?.abort()
    setIsLoading(false)
  }

  function renderTab() {
    if (activeTab === 'voice') {
      return <VoiceInput onTranscriptReady={handlePlanSubmit} />
    }
    if (activeTab === 'text') {
      return (
        <TextInput
          value={userInput}
          onChange={setUserInput}
          onSubmit={handlePlanSubmit}
          isLoading={isLoading}
        />
      )
    }
    if (activeTab === 'react') {
      return <ReActPanel steps={reactSteps} />
    }
    return <PreFlightCheck armContext={buildArmContext(segments, gripper, {})} />
  }

  return (
    <div className='ai-panel'>
      <div className='ai-panel-header'>
        <h2 className='ai-panel-title'>AI Task Planner</h2>
        <p className='ai-panel-subtitle'>Voice or text to validated motion graph</p>
      </div>

      <div className='ai-panel-tabs'>
        {(['voice', 'text', 'react', 'results'] as TabId[]).map((tabId) => (
          <button
            key={tabId}
            className={'ai-tab ' + (activeTab === tabId ? 'ai-tab--active' : '')}
            onClick={() => setActiveTab(tabId)}
          >
            <span>{tabId === 'voice' ? 'Voice' : tabId === 'text' ? 'Text' : tabId === 'react' ? 'Think' : 'Results'}</span>
          </button>
        ))}
      </div>

      <div className='ai-panel-content'>
        {isLoading && (
          <div className='ai-loading-banner'>
            <div className='ai-spinner' />
            <span>Generating task plan</span>
            <button className='ai-abort-btn' onClick={handleAbort}>
              <span>Cancel</span>
            </button>
          </div>
        )}
        {renderTab()}
      </div>

      {activeTab === 'results' && <ConfidenceScore />}
    </div>
  )
}