import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { ReActStep, ConfidenceScore, VoiceState, AIPreflightReport, ExecutionGateState } from '../types/ai'
import type { TaskSpec } from '../types/task'

const DEFAULT_CONFIDENCE_SCORE: ConfidenceScore = {
  overall: 0,
  warningFlags: [],
}

const DEFAULT_EXECUTION_GATE: ExecutionGateState = {
  phase: 'idle',
  message: 'No verification has run yet.',
  updatedAt: 0,
}

export type PreSimulationPhase = 'idle' | 'verifying' | 'ready' | 'blocked'

export type PreSimulationStatus = {
  phase: PreSimulationPhase
  message: string
}

export type GateDebugSnapshot = {
  compileOk: boolean
  collisionFrames: number
  missingTargetIds: string[]
  pickupRequired: boolean
  hasGripClose: boolean
  pickupSucceeded: boolean
  pickupObjectId: string | null
  blockedReasons: string[]
  attempt: number
}

export type AISuggestionSource = 'gemini' | 'deterministic' | 'hybrid' | null

const DEFAULT_PRE_SIMULATION_STATUS: PreSimulationStatus = {
  phase: 'idle',
  message: 'No verification has run yet.',
}

const DEFAULT_GATE_DEBUG: GateDebugSnapshot = {
  compileOk: false,
  collisionFrames: 0,
  missingTargetIds: [],
  pickupRequired: false,
  hasGripClose: false,
  pickupSucceeded: false,
  pickupObjectId: null,
  blockedReasons: [],
  attempt: 0,
}

export const reactStepsAtom = atomWithStorage<ReActStep[]>('mirai_ai_react_steps_v1', [])

export const confidenceScoreAtom = atomWithStorage<ConfidenceScore>(
  'mirai_ai_confidence_v1',
  DEFAULT_CONFIDENCE_SCORE,
)

export const generatedTaskSpecAtom = atomWithStorage<TaskSpec | null>('mirai_ai_generated_task_v1', null)

export const preflightReportAtom = atomWithStorage<AIPreflightReport | null>('mirai_ai_preflight_v1', null)

export const taskAIErrorAtom = atomWithStorage<string | null>('mirai_ai_error_v1', null)

export const showAIResultsAtom = atomWithStorage<boolean>('mirai_ai_results_open_v1', false)

export const showAISuggestionsAtom = atomWithStorage<boolean>('mirai_ai_suggestions_open_v1', false)

export const showThinkTraceAtom = atomWithStorage<boolean>('mirai_ai_think_trace_open_v1', false)

export const showGateDebugAtom = atomWithStorage<boolean>('mirai_ai_gate_debug_open_v1', false)

export const showPhysicsTabAtom = atomWithStorage<boolean>('mirai_ai_physics_tab_open_v1', false)

export const aiSuggestionsAtom = atomWithStorage<string[]>('mirai_ai_suggestions_list_v1', [])

export const aiSuggestionSourceAtom = atomWithStorage<AISuggestionSource>(
  'mirai_ai_suggestion_source_v1',
  null,
)

export const aiConfigFixNoteAtom = atomWithStorage<string | null>('mirai_ai_config_fix_note_v1', null)

export const aiPreSimulationStatusAtom = atomWithStorage<PreSimulationStatus>(
  'mirai_ai_pre_simulation_status_v1',
  DEFAULT_PRE_SIMULATION_STATUS,
)

export const aiGateDebugAtom = atomWithStorage<GateDebugSnapshot>('mirai_ai_gate_debug_v1', DEFAULT_GATE_DEBUG)

export const aiLoadingAtom = atom(false)
export const aiStreamingAtom = atom(false)

export const voiceStateAtom = atom<VoiceState>({
  isRecording: false,
  isTranscribing: false,
})

export const aiTextInputAtom = atom('')

export const streamAbortControllerAtom = atom<AbortController | null>(null)

export const executionGateAtom = atomWithStorage<ExecutionGateState>(
  'mirai_ai_execution_gate_v1',
  DEFAULT_EXECUTION_GATE,
)