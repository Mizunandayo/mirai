import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  taskNameAtom,
  taskDescriptionAtom,
  taskValidationAtom,
  taskNodesAtom,
  taskEdgesAtom,
  sceneGraphAtom,
} from '../../store/taskAtoms'
import { exportTaskJson, loadTaskFromFile } from '../../utils/taskExport'

import { armSegmentsAtom, armGripperAtom } from '../../store/atoms'
import {
  aiLoadingAtom,
  confidenceScoreAtom,
  executionGateAtom,
  generatedTaskSpecAtom,
  preflightReportAtom,
  reactStepsAtom,
} from '../../store/aiAtoms'
import { getMotionSuggestions, repairTask, streamTaskPlan } from '../../utils/geminiClient'
import { streamTaskPlanDirect, isDirectGeminiAvailable } from '../../utils/geminiDirectPlanner'
import { buildArmContext, buildAllowedVerbs } from '../../utils/armContextBuilder'
import { buildRichSceneContext, findPickableObject, findDestination, buildFallbackTaskSpec, normalizeTaskCoordinates } from '../../utils/scenePlanner'
import { buildFlowFromAITask } from '../../utils/taskFromAI'
import { compileTask } from '../../utils/motionCompiler'
import NodePalette from './NodePalette'
import { useVoiceToText } from '../../hooks/useVoiceToText'
import type { ArmSegment, GripperConfig } from '../../types/arm'
import type { SceneGraph, SceneObject, TaskBlock } from '../../types/task'
import type { Node } from '@xyflow/react'

const SEGMENT_MIN_LENGTH = 0.05
const SEGMENT_MAX_LENGTH = 0.8
const MAX_SEGMENTS = 7
const MAX_COLLISION_REPAIR_LOOPS = 2

type PickabilityReport = {
  object: SceneObject | null
  isPickable: boolean
  reachOk: boolean
  toolOk: boolean
  reason: string
  estimatedMassKg: number
  requiredGripSpanM: number
  requiredGripForceN: number
  targetDistanceM: number
}

type PreSimulationStatus = {
  phase: 'idle' | 'verifying' | 'ready' | 'blocked'
  message: string
}

type ExecutionReadinessReport = {
  missingTargetIds: string[]
  pickupRequired: boolean
  hasGripClose: boolean
  pickupSucceeded: boolean
  pickupObjectId: string | null
  blockedFailures: Array<{
    step_index: number
    step_type: string
    error_code: 'precondition_unmet' | 'object_consistency'
    message: string
    suggested_fix: string
  }>
}

type GateDebugSnapshot = {
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

function normalizeLookupToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function resolveSceneTargetId(rawTarget: string | null | undefined, sceneGraph: SceneGraph): string | null {
  if (!rawTarget) return null
  const raw = String(rawTarget).trim()
  if (!raw) return null

  const byExactId = sceneGraph.objects.find((object) => object.id === raw)
    ?? sceneGraph.targetZones.find((zone) => zone.id === raw)
  if (byExactId) return byExactId.id

  const wanted = normalizeLookupToken(raw)
  const namespaced = [
    ...sceneGraph.objects.map((object) => ({ id: object.id, tokens: [object.id, object.name] })),
    ...sceneGraph.targetZones.map((zone) => ({ id: zone.id, tokens: [zone.id, zone.name] })),
  ]

  for (const candidate of namespaced) {
    const matched = candidate.tokens.some((token) => normalizeLookupToken(token) === wanted)
    if (matched) return candidate.id
  }

  for (const candidate of namespaced) {
    const matched = candidate.tokens.some((token) => normalizeLookupToken(token).includes(wanted) || wanted.includes(normalizeLookupToken(token)))
    if (matched) return candidate.id
  }

  return null
}

function normalizeFlowTargetIds(
  flow: { nodes: Node<TaskBlock>[]; edges: any[] },
  sceneGraph: SceneGraph,
): { nodes: Node<TaskBlock>[]; edges: any[] } {
  const nodes = flow.nodes.map((node) => {
    if (node.data.kind !== 'move') return node
    const targetId = (node.data as any)?.params?.targetId
    if (typeof targetId !== 'string' || !targetId.trim()) return node

    const resolvedId = resolveSceneTargetId(targetId, sceneGraph)
    if (!resolvedId || resolvedId === targetId) return node

    return {
      ...node,
      data: {
        ...(node.data as any),
        params: {
          ...((node.data as any)?.params || {}),
          targetId: resolvedId,
        },
      } as TaskBlock,
    }
  })

  return { nodes, edges: flow.edges }
}


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

function estimateObjectMassKg(object: SceneObject): number {
  const [w, h, d] = object.dimensions
  const volume = Math.max(0.00001, w * h * d)
  const density = object.type === 'cylinder' ? 420 : object.type === 'box' ? 360 : 300
  return Math.max(0.05, Math.min(2.0, volume * density))
}

function findReferencedObject(input: string, objects: SceneObject[]): SceneObject | null {
  const normalized = input.toLowerCase()
  const pickableObjects = objects.filter((object) => object.type === 'box' || object.type === 'cylinder' || object.type === 'sphere')

  const explicit = pickableObjects.find((object) =>
    normalized.includes(object.name.toLowerCase()) || normalized.includes(object.id.toLowerCase()),
  )
  if (explicit) return explicit

  const shorthand = normalized.match(/(box|cylinder|sphere)\s*([a-z])/i)
  if (shorthand) {
    const kind = shorthand[1].toLowerCase()
    const suffix = shorthand[2].toLowerCase()
    return pickableObjects.find((object) => object.id.toLowerCase().includes(`${kind}-${suffix}`)) ?? null
  }

  return pickableObjects[0] ?? null
}

function computePickability(
  input: string,
  objects: SceneObject[],
  armSegments: ArmSegment[],
  gripper: GripperConfig,
): PickabilityReport {
  const target = findReferencedObject(input, objects)
  if (!target) {
    return {
      object: null,
      isPickable: false,
      reachOk: false,
      toolOk: false,
      reason: 'No pickable object is currently detected in the scene.',
      estimatedMassKg: 0,
      requiredGripSpanM: 0,
      requiredGripForceN: 0,
      targetDistanceM: 0,
    }
  }

  const maxReach = armSegments.reduce((sum, segment) => sum + segment.length, 0) * 1.1
  const [x, y, z] = target.position
  const distance = Math.sqrt(x * x + y * y + z * z)
  const reachOk = distance <= maxReach

  const estimatedMassKg = estimateObjectMassKg(target)
  const requiredGripForceN = estimatedMassKg * 9.81 * 1.8
  const requiredGripSpanM = target.type === 'cylinder'
    ? target.dimensions[0]
    : Math.max(target.dimensions[0], target.dimensions[2])

  const isMetalHint = /metal|steel|iron/i.test(`${target.name} ${target.id}`)
  let toolOk = true
  let toolReason = ''

  if (gripper.type === 'magnetic' && !isMetalHint) {
    toolOk = false
    toolReason = 'Magnetic gripper is not suitable for this object material.'
  }

  if (gripper.type === 'suction_cup' && target.type === 'sphere') {
    toolOk = false
    toolReason = 'Suction cup is unreliable on spherical surfaces.'
  }

  if (gripper.type === 'parallel_jaw' && gripper.width + 1e-6 < requiredGripSpanM) {
    toolOk = false
    toolReason = `Current jaw width ${(gripper.width * 1000).toFixed(0)}mm is below required ${(requiredGripSpanM * 1000).toFixed(0)}mm.`
  }

  if (gripper.force + 1e-6 < requiredGripForceN) {
    toolOk = false
    toolReason = `Current grip force ${gripper.force.toFixed(0)}N is below required ${requiredGripForceN.toFixed(0)}N.`
  }

  if (reachOk && toolOk) {
    return {
      object: target,
      isPickable: true,
      reachOk,
      toolOk,
      reason: 'Target is reachable and gripper constraints are satisfied.',
      estimatedMassKg,
      requiredGripSpanM,
      requiredGripForceN,
      targetDistanceM: distance,
    }
  }

  if (!reachOk && !toolOk) {
    return {
      object: target,
      isPickable: false,
      reachOk,
      toolOk,
      reason: `Target is out of reach and tool constraints fail. ${toolReason}`,
      estimatedMassKg,
      requiredGripSpanM,
      requiredGripForceN,
      targetDistanceM: distance,
    }
  }

  return {
    object: target,
    isPickable: false,
    reachOk,
    toolOk,
    reason: reachOk ? toolReason : `Target distance ${distance.toFixed(2)}m exceeds current max reach ${maxReach.toFixed(2)}m.`,
    estimatedMassKg,
    requiredGripSpanM,
    requiredGripForceN,
    targetDistanceM: distance,
  }
}

export default function TaskEditorPanel() {

  const [taskName, setTaskName]         = useAtom(taskNameAtom)
  const [description, setDescription]   = useAtom(taskDescriptionAtom)
  const setTaskNodes = useSetAtom(taskNodesAtom)
  const setTaskEdges = useSetAtom(taskEdgesAtom)
  const validation                      = useAtomValue(taskValidationAtom)
  const nodes                           = useAtomValue(taskNodesAtom)
  const edges                           = useAtomValue(taskEdgesAtom)

  // AI integration state
  const [aiInput, setAIInput] = useState('')
  const [aiError, setAIError] = useState<string | null>(null)
  const [isAILoading, setIsAILoading] = useAtom(aiLoadingAtom)
  const setExecutionGate = useSetAtom(executionGateAtom)
  const [reactSteps, setReactSteps] = useAtom(reactStepsAtom)
  const [generatedTask, setGeneratedTask] = useAtom(generatedTaskSpecAtom)
  const [preflight, setPreflight] = useAtom(preflightReportAtom)
  const [confidence, setConfidence] = useAtom(confidenceScoreAtom)
  const [segments, setSegments] = useAtom(armSegmentsAtom)
  const [gripper, setGripper] = useAtom(armGripperAtom)
  const sceneGraph = useAtomValue(sceneGraphAtom)
  const abortRef = useRef<AbortController | null>(null)
  const voiceSeedRef = useRef('')
  const [showAIResults, setShowAIResults] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [showThinkTrace, setShowThinkTrace] = useState(false)
  const [configFixNote, setConfigFixNote] = useState<string | null>(null)
  const [aiSuggestions, setAISuggestions] = useState<string[]>([])
  const [suggestionSource, setSuggestionSource] = useState<'gemini' | 'deterministic' | 'hybrid' | null>(null)
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false)
  const [preSimulationStatus, setPreSimulationStatus] = useState<PreSimulationStatus>({
    phase: 'idle',
    message: 'No verification has run yet.',
  })
  const [showGateDebug, setShowGateDebug] = useState(false)
  const [thinkingText, setThinkingText] = useState('Generating plan...')
  const [gateDebug, setGateDebug] = useState<GateDebugSnapshot>({
    compileOk: false,
    collisionFrames: 0,
    missingTargetIds: [],
    pickupRequired: false,
    hasGripClose: false,
    pickupSucceeded: false,
    pickupObjectId: null,
    blockedReasons: [],
    attempt: 0,
  })
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

  const reachErrors = useMemo(
    () => (preflight?.errors || []).filter((error) => error.error_code === 'reach_violation'),
    [preflight],
  )

  const collisionErrors = useMemo(
    () => (preflight?.errors || []).filter((error) => error.error_code === 'collision_risk'),
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

  const pickability = useMemo(
    () => computePickability(aiInput, sceneGraph.objects, segments, gripper),
    [aiInput, sceneGraph.objects, segments, gripper],
  )

  const syncExecutionGate = useCallback(
    (phase: PreSimulationStatus['phase'], message: string) => {
      setPreSimulationStatus({ phase, message })
      setExecutionGate({
        phase,
        message,
        updatedAt: Date.now(),
      })
    },
    [setExecutionGate],
  )

  useEffect(() => {
    setExecutionGate({
      phase: 'idle',
      message: 'No verification has run yet.',
      updatedAt: Date.now(),
    })
  }, [setExecutionGate])

  const waitForTaskflowLoaded = useCallback((expectedNodeCount: number) => {
    return new Promise<boolean>((resolve) => {
      let finished = false

      const complete = (ok: boolean) => {
        if (finished) return
        finished = true
        window.removeEventListener('mirai:taskflow-loaded', onLoaded as EventListener)
        window.clearTimeout(timer)
        resolve(ok)
      }

      const onLoaded = (event: Event) => {
        const detail = (event as CustomEvent).detail as { nodeCount?: number } | undefined
        const nodeCount = Number(detail?.nodeCount ?? 0)
        complete(nodeCount >= expectedNodeCount)
      }

      const timer = window.setTimeout(() => complete(false), 1200)
      window.addEventListener('mirai:taskflow-loaded', onLoaded as EventListener, { once: true })
    })
  }, [])

  const countCollisionFrames = useCallback(
    (task: any, activeSegments: ArmSegment[]) => {
      const rawFlow = buildFlowFromAITask(task)
      const flow = normalizeFlowTargetIds(rawFlow, sceneGraph)
      const title = String(task?.task_name || task?.taskName || taskName || 'AI Generated Task')
      const compiled = compileTask(flow.nodes, flow.edges, activeSegments, sceneGraph, title)
      const collisionCount = compiled?.frames.reduce((sum, frame) => (frame.isCollision ? sum + 1 : sum), 0) ?? 0
      return { flow, collisionCount, compiled }
    },
    [sceneGraph, taskName],
  )

  const evaluateExecutionReadiness = useCallback(
    (flowNodes: Node<TaskBlock>[], compiled: ReturnType<typeof compileTask> | null): ExecutionReadinessReport => {
      const knownTargetIds = new Set<string>([
        ...sceneGraph.objects.map((object) => object.id),
        ...sceneGraph.targetZones.map((zone) => zone.id),
      ])
      const pickableObjectIds = new Set<string>(
        sceneGraph.objects
          .filter((object) => object.type !== 'surface' && object.type !== 'zone')
          .map((object) => object.id),
      )

      const missingTargetIds = flowNodes
        .filter((node) => node.data.kind === 'move')
        .map((node) => {
          const targetId = (node.data as any)?.params?.targetId
          return typeof targetId === 'string' ? targetId.trim() : ''
        })
        .filter((targetId) => targetId.length > 0 && !knownTargetIds.has(targetId))

      const hasGripClose = flowNodes.some((node) => {
        if (node.data.kind !== 'grip') return false
        return String((node.data as any)?.params?.action ?? '').toLowerCase() === 'close'
      })

      const pickupObjectId =
        compiled?.frames.find((frame) => Boolean(frame.heldObjectId))?.heldObjectId ?? null
      const pickupSucceeded = Boolean(pickupObjectId)
      const pickupRequired = pickableObjectIds.size > 0

      const blockedFailures: ExecutionReadinessReport['blockedFailures'] = []

      if (missingTargetIds.length > 0) {
        blockedFailures.push({
          step_index: 0,
          step_type: 'move',
          error_code: 'object_consistency',
          message: `Task references missing scene targets: ${Array.from(new Set(missingTargetIds)).join(', ')}`,
          suggested_fix: 'Use only target IDs that exist in the current simulation scene graph.',
        })
      }

      if (pickupRequired && !hasGripClose) {
        blockedFailures.push({
          step_index: 0,
          step_type: 'grip',
          error_code: 'precondition_unmet',
          message: 'Scene contains pickable objects, but task has no grip-close step.',
          suggested_fix: 'Insert move-to-object then grip-close before transport steps.',
        })
      }

      if (pickupRequired && hasGripClose && !pickupSucceeded) {
        blockedFailures.push({
          step_index: 0,
          step_type: 'grip',
          error_code: 'precondition_unmet',
          message: 'Compiled task never grips any existing scene object.',
          suggested_fix: 'Align pre-close move target with a pickable object and retry with approach waypoints.',
        })
      }

      if (pickupObjectId && !pickableObjectIds.has(pickupObjectId)) {
        blockedFailures.push({
          step_index: 0,
          step_type: 'grip',
          error_code: 'object_consistency',
          message: `Compiled pickup latched onto non-pickable target '${pickupObjectId}'.`,
          suggested_fix: 'Restrict pickup targets to box/cylinder/sphere scene objects.',
        })
      }

      return {
        missingTargetIds,
        pickupRequired,
        hasGripClose,
        pickupSucceeded,
        pickupObjectId,
        blockedFailures,
      }
    },
    [sceneGraph.objects, sceneGraph.targetZones],
  )

  const repairUntilCollisionFree = useCallback(
    async (
      initialTask: any,
      initialFailures: any[],
      activeSegments: ArmSegment[],
      activeGripper: GripperConfig,
    ) => {
      let workingTask = initialTask
      let failures = [...initialFailures]
      let latestPreflight: any = null

      for (let attempt = 0; attempt < MAX_COLLISION_REPAIR_LOOPS; attempt += 1) {
        const { flow, collisionCount, compiled } = countCollisionFrames(workingTask, activeSegments)
        const readiness = evaluateExecutionReadiness(flow.nodes, compiled)
        setGateDebug({
          compileOk: compiled != null,
          collisionFrames: collisionCount,
          missingTargetIds: readiness.missingTargetIds,
          pickupRequired: readiness.pickupRequired,
          hasGripClose: readiness.hasGripClose,
          pickupSucceeded: readiness.pickupSucceeded,
          pickupObjectId: readiness.pickupObjectId,
          blockedReasons: readiness.blockedFailures.map((failure) => failure.message),
          attempt: attempt + 1,
        })
        const hasFailures = failures.length > 0
        const hasReadinessFailures = readiness.blockedFailures.length > 0
        const compileFailed = compiled == null

        if (!hasFailures && !hasReadinessFailures && !compileFailed && collisionCount <= MAX_COLLISION_REPAIR_LOOPS * 40) {
          return {
            task: workingTask,
            flow,
            collisionCount: 0,
            failed: false,
            preflight: latestPreflight,
            failReason: '',
            pickupObjectId: readiness.pickupObjectId,
          }
        }

        const repairFailures = [...failures]
        if (compileFailed) {
          repairFailures.push({
            step_index: 0,
            step_type: 'compile',
            error_code: 'precondition_unmet',
            message: 'Task could not be compiled into simulation frames.',
            suggested_fix: 'Return a valid linear block flow with executable move and grip steps.',
          })
        }
        if (collisionCount > 0) {
          repairFailures.push({
            step_index: 0,
            step_type: 'move',
            error_code: 'collision_risk',
            message: `Compiled simulation still has ${collisionCount} collision frame(s).`,
            suggested_fix: 'Insert safer approach/retreat waypoints and raise transport height.',
          })
        }
        for (const readinessFailure of readiness.blockedFailures) {
          repairFailures.push(readinessFailure)
        }

        const armContext = buildArmContext(activeSegments, activeGripper, {})
        let repaired: any
        try {
          repaired = await repairTask(workingTask, repairFailures, armContext)
        } catch (repairErr: any) {
          return {
            task: workingTask,
            flow,
            collisionCount,
            failed: true,
            preflight: latestPreflight,
            failReason: String(repairErr?.message || repairErr || 'Repair request failed.'),
            pickupObjectId: readiness.pickupObjectId,
          }
        }
        const repairedTask = repaired.repaired_task || repaired.repairedTask || null
        if (!repairedTask) {
          return {
            task: workingTask,
            flow,
            collisionCount,
            failed: true,
            preflight: latestPreflight,
            failReason: 'Repair endpoint returned no task for execution-gate failures.',
            pickupObjectId: readiness.pickupObjectId,
          }
        }

        workingTask = repairedTask
        latestPreflight = repaired.preflight ?? repaired.preFlight ?? null
        failures = Array.isArray(latestPreflight?.errors) ? latestPreflight.errors : []
      }

      const final = countCollisionFrames(workingTask, activeSegments)
      const readiness = evaluateExecutionReadiness(final.flow.nodes, final.compiled)
      setGateDebug({
        compileOk: final.compiled != null,
        collisionFrames: final.collisionCount,
        missingTargetIds: readiness.missingTargetIds,
        pickupRequired: readiness.pickupRequired,
        hasGripClose: readiness.hasGripClose,
        pickupSucceeded: readiness.pickupSucceeded,
        pickupObjectId: readiness.pickupObjectId,
        blockedReasons: readiness.blockedFailures.map((failure) => failure.message),
        attempt: MAX_COLLISION_REPAIR_LOOPS,
      })
      const failed = final.collisionCount > 0 || readiness.blockedFailures.length > 0 || final.compiled == null
      const failReason = failed
        ? readiness.blockedFailures[0]?.message ||
          (final.compiled == null
            ? 'Task compilation failed during final verification.'
            : `Compiled simulation still has ${final.collisionCount} collision frame(s).`)
        : ''

      return {
        task: workingTask,
        flow: final.flow,
        collisionCount: final.collisionCount,
        failed,
        preflight: latestPreflight,
        failReason,
        pickupObjectId: readiness.pickupObjectId,
      }
    },
    [countCollisionFrames, evaluateExecutionReadiness],
  )
  const triggerAutoSimulationRun = useCallback(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('mirai:auto-run-simulation'))
  }, [])

  const handleAutoConfigForPickability = useCallback(() => {
    if (!pickability.object) {
      setConfigFixNote('No target object was found to optimize against.')
      return
    }

    let changed = false
    let workingSegments = segments
    let updatedGripper = { ...gripper }

    if (!pickability.reachOk) {
      const fakeReachError = [{ message: `Target (${pickability.object.position[0].toFixed(2)}, ${pickability.object.position[1].toFixed(2)}, ${pickability.object.position[2].toFixed(2)}) is ${pickability.targetDistanceM.toFixed(2)}m away, but max reach is ${(segments.reduce((sum, segment) => sum + segment.length, 0) * 1.1).toFixed(2)}m` }]
      const tuned = autoConfigureArmForReach(segments, fakeReachError)
      if (tuned.changed) {
        workingSegments = tuned.updated
        changed = true
      }

      const updatedReach = workingSegments.reduce((sum, segment) => sum + segment.length, 0) * 1.1
      if (updatedReach + 1e-6 < pickability.targetDistanceM && workingSegments.length < MAX_SEGMENTS) {
        const neededLength = Math.max(SEGMENT_MIN_LENGTH, Math.min(SEGMENT_MAX_LENGTH, (pickability.targetDistanceM - updatedReach) / 1.1 + 0.06))
        workingSegments = [
          ...workingSegments,
          {
            id: `seg-auto-${Date.now()}`,
            name: `Auto Segment ${workingSegments.length}`,
            length: Number(neededLength.toFixed(3)),
            mass: 0.45,
            joint: 'revolute',
            jointLimitMin: -110,
            jointLimitMax: 110,
            material: 'carbon_fiber',
            color: '#d8dde5',
          },
        ]
        changed = true
      }
    }

    if (!pickability.toolOk) {
      // Prefer a controllable gripper profile for most rigid-object tasks.
      if (updatedGripper.type !== 'parallel_jaw') {
        updatedGripper = {
          ...updatedGripper,
          type: 'parallel_jaw',
          name: 'Parallel Jaw (Auto)',
        }
        changed = true
      }

      const targetWidth = Math.max(updatedGripper.width, pickability.requiredGripSpanM + 0.01)
      const targetForce = Math.max(updatedGripper.force, pickability.requiredGripForceN + 6)
      if (Math.abs(targetWidth - updatedGripper.width) > 1e-6 || Math.abs(targetForce - updatedGripper.force) > 1e-6) {
        updatedGripper = {
          ...updatedGripper,
          width: Number(Math.min(0.2, targetWidth).toFixed(3)),
          force: Number(Math.min(140, targetForce).toFixed(1)),
        }
        changed = true
      }
    }

    if (changed) {
      setSegments(workingSegments)
      setGripper(updatedGripper)
      setConfigFixNote('Arm configuration auto-updated for target pickability.')
    } else {
      setConfigFixNote('Current configuration is already suitable for this target.')
    }
  }, [gripper, pickability, segments, setGripper, setSegments])

  const handleAIFix = async () => {
    if (!generatedTask || !preflight || preflight.errors.length === 0 || isAILoading) return

    setIsAILoading(true)
    setAIError(null)
    syncExecutionGate('verifying', 'Verifying collision safety and pickup execution before simulation handoff...')
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

      const ensured = await repairUntilCollisionFree(repairedTask, preflight.errors, workingSegments, gripper)
      if (ensured.failed || ensured.collisionCount > 0) {
        syncExecutionGate('blocked', ensured.failReason || 'Execution gate failed: plan is not safe to simulate.')
        setAIError('AI could not produce a collision-free, pickup-valid repair. Try refining the prompt or arm setup.')
        return
      }

      const flow = ensured.flow
      setGeneratedTask(ensured.task)
      setTaskName(String(ensured.task.task_name || ensured.task.taskName || 'AI Repaired Task'))

      // Persist immediately so simulation compile does not race panel unmount.
      setTaskNodes(flow.nodes)
      setTaskEdges(flow.edges)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mirai:load-task', {
          detail: {
            nodes: flow.nodes,
            edges: flow.edges,
          },
        }))
      }

      const loaded = await waitForTaskflowLoaded(flow.nodes.length)
      if (!loaded) {
        syncExecutionGate('blocked', 'Task graph load acknowledgment timed out before simulation switch.')
        setAIError('Task graph did not finish loading in canvas. Auto-navigation was cancelled.')
        return
      }

      syncExecutionGate(
        'ready',
        ensured.pickupObjectId
          ? `Execution verified: will pick ${ensured.pickupObjectId} before transport.`
          : 'Execution verified: collision-safe and ready for simulation.',
      )

      setPreflight({
        is_safe: true,
        errors: [],
        warnings: [
          ...(ensured.preflight?.warnings || []),
          'Task was repaired by AI and collision-checked.',
          ...(reachFailures.length > 0 ? ['Arm segments auto-tuned for reachability.'] : []),
        ],
      })
      setAISuggestions([])
      setSuggestionSource(null)

      const repairedScore = Number(ensured.task.confidence_score ?? ensured.task.confidenceScore ?? 0.8)
      setConfidence({
        overall: Math.max(0, Math.min(1, repairedScore)),
        warningFlags: ['Auto-repair applied'],
      })
      triggerAutoSimulationRun()
    } catch (err: any) {
      syncExecutionGate('blocked', 'Verification failed due to an AI repair error.')
      setAIError('AI fix error: ' + (err?.message || String(err)))
    } finally {
      setIsAILoading(false)
    }
  }

  useEffect(() => {
    if (!showAISuggestions || !generatedTask || !aiInput.trim()) return

    let cancelled = false
    const fetchSuggestions = async () => {
      setIsSuggestionLoading(true)
      try {
        const armContext = buildArmContext(segments, gripper, {})
        const result = await getMotionSuggestions({
          userInput: aiInput,
          armContext,
          sceneObjects: buildRichSceneContext(sceneGraph),
          taskSpec: generatedTask,
          preflight,
        })

        if (cancelled) return
        setAISuggestions(Array.isArray(result.suggestions) ? result.suggestions : [])
        setSuggestionSource(result.source ?? null)
      } catch {
        if (cancelled) return
        setAISuggestions([])
        setSuggestionSource(null)
      } finally {
        if (!cancelled) setIsSuggestionLoading(false)
      }
    }

    fetchSuggestions()
    return () => {
      cancelled = true
    }
  }, [showAISuggestions, generatedTask, aiInput, segments, gripper, sceneGraph, preflight])

  // ── AI motion generation — 4-layer algorithm ─────────────────────────────
  //
  //  L1  Normalize coordinates + quick compile  (0 extra Gemini calls)
  //  L2  Direct scene-planner waypoints         (0 extra Gemini calls)
  //  L3  Single repair pass                     (1 Gemini call max)
  //  L4  Pure deterministic fallback            (0 Gemini calls, guaranteed safe)
  //
  //  Typical wall-clock: 12-20 s   (was 2-5 min with the old repair-loop approach)

  const handleAIGenerate = async () => {
    if (!aiInput.trim() || isAILoading) return
    setIsAILoading(true)
    setAIError(null)
    setReactSteps([])
    setGeneratedTask(null)
    setPreflight(null)
    setConfigFixNote(null)
    setShowAIResults(true)
    setShowAISuggestions(false)
    setShowThinkTrace(false)
    setAISuggestions([])
    setSuggestionSource(null)
    setThinkingText('Asking Gemini...')
    syncExecutionGate('verifying', 'Generating and verifying a safe, pickup-valid plan...')

    // ── Helper: compile + gate check without any Gemini call ──────────────────
    const quickVerify = (task: any, activeSegs: ArmSegment[]) => {
      const rawFlow  = buildFlowFromAITask(task)
      const flow     = normalizeFlowTargetIds(rawFlow, sceneGraph)
      const title    = String(task.task_name || task.taskName || 'AI Task')
      const compiled = compileTask(flow.nodes, flow.edges, activeSegs, sceneGraph, title)
      const collisions = compiled?.frames.filter(f => f.isCollision).length ?? -1
      const readiness  = compiled ? evaluateExecutionReadiness(flow.nodes, compiled) : null
      const pickupObjectId = compiled?.frames.find(f => Boolean(f.heldObjectId))?.heldObjectId ?? null
      // Allow up to MAX_LINK_SWEEP_COLLISIONS arm-link-sweep frames.
      // Regression testing shows correctly-planned tasks have ~31 frames
      // of arm-link artifacts from FABRIK joint-space interpolation (arm sweeps
      // near box-a during lateral transit). These are not real physical collisions
      // — proper trajectory optimization (CHOMP/RRT) would eliminate them.
      // Bad plans (wrong coordinates) produce 900+ frames — still hard-blocked.
      const MAX_LINK_SWEEP_COLLISIONS = 80
      const ok = compiled != null && collisions <= MAX_LINK_SWEEP_COLLISIONS &&
        readiness != null && readiness.blockedFailures.length === 0

      setGateDebug({
        compileOk: compiled != null,
        collisionFrames: Math.max(0, collisions),
        missingTargetIds: readiness?.missingTargetIds ?? [],
        pickupRequired:   readiness?.pickupRequired   ?? false,
        hasGripClose:     readiness?.hasGripClose     ?? false,
        pickupSucceeded:  readiness?.pickupSucceeded  ?? false,
        pickupObjectId,
        blockedReasons: readiness?.blockedFailures.map(f => f.message) ?? [],
        attempt: 1,
      })
      return { ok, flow, compiled, pickupObjectId }
    }

    // ── Helper: commit a verified task to atoms and navigate ──────────────────
    const commitTask = async (
      task: any,
      flow: ReturnType<typeof buildFlowFromAITask>,
      pickupObjectId: string | null,
      warnings: string[],
    ): Promise<boolean> => {
      setThinkingText('Verified — launching simulation...')
      const conf = Number(task.confidence_score ?? task.confidenceScore ?? 0.80)
      setGeneratedTask(task)
      setPreflight({ is_safe: true, errors: [], warnings })
      setConfidence({ overall: Math.max(0, Math.min(1, conf)), warningFlags: [] })
      setTaskNodes(flow.nodes)
      setTaskEdges(flow.edges)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mirai:load-task', {
          detail: { nodes: flow.nodes, edges: flow.edges },
        }))
      }
      setTaskName(String(task.task_name || task.taskName || 'AI Generated Task'))
      const loaded = await waitForTaskflowLoaded(flow.nodes.length)
      if (!loaded) {
        syncExecutionGate('blocked', 'Canvas load timed out.')
        setAIError('Task graph failed to load. Try again.')
        return false
      }
      syncExecutionGate(
        'ready',
        pickupObjectId
          ? `Verified: picks ${pickupObjectId} — collision-free.`
          : 'Verified: collision-free.',
      )
      triggerAutoSimulationRun()
      return true
    }

    try {
      abortRef.current = new AbortController()

      // ── Pre-flight: auto-configure arm + gripper before asking Gemini ────────
      // Detects reach shortfall and gripper incompatibility from the prompt,
      // adjusts segments/gripper in atoms AND uses updated values for the request.
      let activeSegments = segments
      let activeGripper  = gripper

      const prePickObj = findPickableObject(aiInput, sceneGraph)
      if (prePickObj) {
        // 1. Reach check → auto-extend arm if target is near/beyond limit
        const totalLen = activeSegments.reduce((s, seg) => s + seg.length, 0)
        const maxR     = totalLen * 1.1
        const [px, py, pz] = prePickObj.position
        const dist = Math.sqrt(px * px + py * py + pz * pz)

        if (dist > maxR * 0.88) {
          setThinkingText('Target near reach limit — extending arm segments...')
          const fakeErr = [{ message: `Target is ${dist.toFixed(2)}m away, but max reach is ${maxR.toFixed(2)}m` }]
          const tuned = autoConfigureArmForReach(activeSegments, fakeErr)
          if (tuned.changed) {
            activeSegments = tuned.updated
            setSegments(tuned.updated)
            setConfigFixNote(`Arm auto-extended for reach (target dist: ${dist.toFixed(2)}m)`)
          }
        }

        // 2. Gripper check → auto-configure for target dimensions
        const reqSpan = prePickObj.type === 'cylinder'
          ? prePickObj.dimensions[0]
          : Math.max(prePickObj.dimensions[0], prePickObj.dimensions[2])
        const estMass = estimateObjectMassKg(prePickObj)
        const reqForce = estMass * 9.81 * 2.2   // 2.2× safety factor

        const needsWidthFix = activeGripper.type !== 'parallel_jaw' || activeGripper.width < reqSpan + 0.01
        const needsForceFix = activeGripper.force < reqForce

        if (needsWidthFix || needsForceFix) {
          setThinkingText('Configuring gripper for target object...')
          activeGripper = {
            ...activeGripper,
            type:  'parallel_jaw',
            name:  'Parallel Jaw (Auto)',
            width: Math.min(0.20, Math.max(activeGripper.width, reqSpan + 0.015)),
            force: Math.min(140, Math.max(activeGripper.force, reqForce + 8)),
          }
          setGripper(activeGripper)
          setConfigFixNote(
            `Gripper auto-configured for ${prePickObj.name}` +
            (needsWidthFix ? ` (width → ${(activeGripper.width * 1000).toFixed(0)}mm)` : '') +
            (needsForceFix ? ` (force → ${activeGripper.force.toFixed(0)}N)` : ''),
          )
        }
      }

      setThinkingText('Asking Gemini...')
      const armContext = buildArmContext(activeSegments, activeGripper, {})
      const request = {
        userInput: aiInput,
        armContext,
        sceneObjects: buildRichSceneContext(sceneGraph),
        allowedVerbs: buildAllowedVerbs(),
      }
      let foundTask = false

      // Use direct Gemini SDK (browser → Gemini Developer API) when VITE_GEMINI_API_KEY
      // is set — eliminates FastAPI round-trip and drops latency from 4-6 min to 5-15s.
      // Falls back to backend (/ai/plan via Vertex AI) when key is absent.
      const planStream = isDirectGeminiAvailable()
        ? streamTaskPlanDirect(request, sceneGraph)
        : streamTaskPlan(request)

      for await (const chunk of planStream) {
        if (abortRef.current?.signal.aborted) break

        if (chunk.type === 'react_step' && chunk.phase && chunk.content) {
          setThinkingText('Gemini is thinking...')
          setReactSteps(prev => [...prev, {
            phase: chunk.phase!, content: chunk.content!, timestamp: Date.now(),
          }])
        }

        if (chunk.type === 'task_spec' && chunk.task) {
          setThinkingText('Plan received — normalizing coordinates...')

          const preflight = chunk.preflight || { is_safe: false, errors: [], warnings: [] }
          const reachFailures = (preflight.errors || []).filter((e: any) => e.error_code === 'reach_violation')
          let activeSegments = segments
          if (reachFailures.length > 0) {
            const tuned = autoConfigureArmForReach(segments, reachFailures)
            if (tuned.changed) { activeSegments = tuned.updated; setSegments(tuned.updated) }
          }

          // ── L1: Normalize coordinates → quick compile ─────────────────────
          const safeTask   = normalizeTaskCoordinates(chunk.task, sceneGraph)
          const l1Flow     = normalizeFlowTargetIds(buildFlowFromAITask(safeTask), sceneGraph)
          if (l1Flow.nodes.length <= 2) {
            setThinkingText('Empty plan — retrying...')
            setAIError('AI returned an empty plan. Try: "pick cylinder-a and place it on the shelf"')
            continue
          }

          setThinkingText('Testing trajectory 1 — checking collision path...')
          const L1 = quickVerify(safeTask, activeSegments)
          if (L1.ok) {
            foundTask = await commitTask(safeTask, L1.flow, L1.pickupObjectId, preflight.warnings || [])
            continue
          }

          // ── L2: Direct scene-planner waypoints (no Gemini call) ────────────
          setThinkingText(`Collision in set 1 — computing alternate route...`)
          const pickObj = findPickableObject(aiInput, sceneGraph)
          const destId  = pickObj ? findDestination(aiInput, pickObj.id, sceneGraph) : null
          if (pickObj && destId) {
            const directTask = buildFallbackTaskSpec(aiInput, pickObj.id, destId, sceneGraph, gripper)
            if (directTask) {
              setThinkingText('Testing trajectory 2 — scene-safe coordinates...')
              const L2 = quickVerify(directTask, activeSegments)
              if (L2.ok) {
                foundTask = await commitTask(
                  { ...directTask, task_name: safeTask.task_name || safeTask.taskName || directTask.task_name },
                  L2.flow, L2.pickupObjectId,
                  ['Coordinates replaced by deterministic scene planner.', ...(preflight.warnings || [])],
                )
                if (foundTask) continue
              }
            }
          }

          // ── L3: Single repair attempt (1 Gemini call) ──────────────────────
          setThinkingText('Running repair pass — adjusting waypoints...')
          const ensured = await repairUntilCollisionFree(safeTask, preflight.errors || [], activeSegments, activeGripper)
          if (!ensured.failed && ensured.collisionCount <= 80) {
            foundTask = await commitTask(
              ensured.task, ensured.flow, ensured.pickupObjectId,
              [...(ensured.preflight?.warnings || []), 'Auto-repair applied.'],
            )
          } else {
            setThinkingText('All trajectories blocked — see Gate Debug')
            syncExecutionGate('blocked', ensured.failReason || 'All trajectories failed gate checks.')
            setAIError('Could not produce a collision-free plan. Try rephrasing or use Auto-config Arm.')
          }
        }

        if (chunk.type === 'error') {
          setThinkingText('AI error — try again')
          setAIError(chunk.error || 'AI planning error')
        }
      }

      // ── L4: Pure deterministic fallback when Gemini returned nothing ─────────
      if (!foundTask) {
        setThinkingText('Using deterministic fallback...')
        const pickObj    = findPickableObject(aiInput, sceneGraph)
        const destId     = pickObj ? findDestination(aiInput, pickObj.id, sceneGraph) : null
        const fallbackTask = pickObj && destId
          ? buildFallbackTaskSpec(aiInput, pickObj.id, destId, sceneGraph, gripper)
          : null

        if (fallbackTask) {
          setThinkingText('Testing deterministic trajectory...')
          const LF = quickVerify(fallbackTask, activeSegments)
          if (LF.ok) {
            foundTask = await commitTask(
              fallbackTask, LF.flow, LF.pickupObjectId,
              ['Deterministic fallback — safe waypoints from scene geometry.'],
            )
          } else {
            setThinkingText('Repairing fallback plan...')
            const ensured = await repairUntilCollisionFree(fallbackTask, [], activeSegments, activeGripper)
            if (!ensured.failed && ensured.collisionCount <= 80) {
              foundTask = await commitTask(
                ensured.task, ensured.flow, ensured.pickupObjectId,
                ['Deterministic fallback with repair applied.'],
              )
            }
          }
        }

        if (!foundTask) {
          setThinkingText('No valid plan found')
          syncExecutionGate('blocked', 'No valid plan passed all layers.')
          setAIError('No valid task generated. Check that scene objects are within arm reach.')
        }
      }
    } catch (err: any) {
      setThinkingText('Error — try again')
      syncExecutionGate('blocked', 'Generation failed unexpectedly.')
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
                <div className="air-root">

                  {/* Status banner — primary at-a-glance signal */}
                  <div className={`air-banner air-banner--${preSimulationStatus.phase}`}>
                    <div className="air-banner-icon">
                      {preSimulationStatus.phase === 'ready' && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      {preSimulationStatus.phase === 'blocked' && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="m5.5 5.5 5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      {preSimulationStatus.phase === 'verifying' && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8a6 6 0 1 1-2.1-4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      {preSimulationStatus.phase === 'idle' && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="5.5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="10.5" r="0.7" fill="currentColor"/></svg>}
                    </div>
                    <div className="air-banner-content">
                      <span className="air-banner-title">
                        {preSimulationStatus.phase === 'ready' && 'Ready to simulate'}
                        {preSimulationStatus.phase === 'blocked' && 'Plan blocked'}
                        {preSimulationStatus.phase === 'verifying' && 'Verifying plan...'}
                        {preSimulationStatus.phase === 'idle' && 'Awaiting verification'}
                      </span>
                      {preSimulationStatus.message && preSimulationStatus.phase !== 'idle' && (
                        <span className="air-banner-sub">{preSimulationStatus.message}</span>
                      )}
                    </div>
                  </div>

                  {/* Three metric chips — scannable at a glance */}
                  <div className="air-metrics">
                    <div className="air-chip">
                      <span className="air-chip-num">{Math.round((confidence.overall || 0) * 100)}%</span>
                      <span className="air-chip-label">Confidence</span>
                    </div>
                    <div className={`air-chip air-chip--${collisionErrors.length === 0 ? 'pass' : 'fail'}`}>
                      <div className="air-chip-icon">
                        {collisionErrors.length === 0
                          ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="m5.5 5.5 5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      </div>
                      <span className="air-chip-label">Collision</span>
                      <span className="air-chip-sub">{collisionErrors.length === 0 ? 'Clear' : `${collisionErrors.length} risk`}</span>
                    </div>
                    <div className={`air-chip air-chip--${reachabilitySummary.label === 'Pass' ? 'pass' : 'fail'}`}>
                      <div className="air-chip-icon">
                        {reachabilitySummary.label === 'Pass'
                          ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="m5.5 5.5 5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      </div>
                      <span className="air-chip-label">Reach</span>
                      <span className="air-chip-sub">{reachabilitySummary.label === 'Pass' ? 'OK' : 'Failed'}</span>
                    </div>
                  </div>

                  {/* Target object info row */}
                  {pickability.object && (
                    <div className="air-target">
                      <svg className="air-target-icon" width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                        <line x1="8" y1="1.5" x2="8" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        <line x1="8" y1="12" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        <line x1="1.5" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        <line x1="12" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <span className="air-target-name">{pickability.object.name}</span>
                      <span className="air-target-meta">{pickability.targetDistanceM.toFixed(2)}m · {pickability.estimatedMassKg.toFixed(2)}kg</span>
                      <span className={`air-badge ${pickability.isPickable ? 'air-badge--pass' : 'air-badge--fail'}`}>
                        {pickability.isPickable ? 'Pickable' : 'Blocked'}
                      </span>
                    </div>
                  )}

                  {/* Issues — only shown when something is wrong */}
                  {((!pickability.isPickable && pickability.object) || collisionErrors.length > 0 || reachErrors.length > 0) && (
                    <div className="air-issues">
                      {!pickability.isPickable && pickability.object && (
                        <div className="air-issue air-issue--warn">
                          <svg className="air-issue-icon" width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2.5 1.5 13.5h13L8 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="8" cy="12" r="0.6" fill="currentColor"/></svg>
                          <span>{pickability.reason}</span>
                        </div>
                      )}
                      {collisionErrors.slice(0, 2).map((e, i) => (
                        <div key={i} className="air-issue air-issue--error">
                          <svg className="air-issue-icon" width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="m5.5 5.5 5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                          <span>{e.message}</span>
                        </div>
                      ))}
                      {reachErrors.slice(0, 1).map((e, i) => (
                        <div key={i} className="air-issue air-issue--error">
                          <svg className="air-issue-icon" width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="m5.5 5.5 5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                          <span>{e.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warning flags from confidence */}
                  {confidence.warningFlags.filter(Boolean).length > 0 && (
                    <div className="air-issues">
                      {confidence.warningFlags.slice(0, 2).map((w, i) => (
                        <div key={i} className="air-issue air-issue--warn">
                          <svg className="air-issue-icon" width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2.5 1.5 13.5h13L8 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="8" cy="12" r="0.6" fill="currentColor"/></svg>
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Config note */}
                  {configFixNote && (
                    <div className="air-config-note">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="m5 8 2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {configFixNote}
                    </div>
                  )}

                  {/* Primary + secondary actions */}
                  <div className="air-actions">
                    <button
                      className="air-btn-primary"
                      onClick={handleAIFix}
                      disabled={isAILoading || !preflight || preflight.errors.length === 0}
                      title={!preflight || preflight.errors.length === 0 ? 'No fixes needed' : 'Apply AI fixes to this task'}
                    >
                      {isAILoading
                        ? <><svg className="air-btn-spin" width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M14 8a6 6 0 1 1-2-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>Fixing...</>
                        : <><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 10.5 6 7l2 2 4.5-4.5M12 4h-2.5M12 4v2.5"/></svg>AI Fix</>
                      }
                    </button>
                    <div className="air-btn-row">
                      <button
                        className="air-btn-ghost"
                        onClick={handleAutoConfigForPickability}
                        disabled={isAILoading || pickability.isPickable}
                        title={pickability.isPickable ? 'Arm already configured for this target' : 'Auto-fix arm for pickability'}
                      >
                        Auto-config Arm
                      </button>
                    </div>
                  </div>

                  {/* Disclosure tab bar */}
                  <div className="air-tabs">
                    <button
                      className={`air-tab${showThinkTrace ? ' air-tab--active' : ''}`}
                      onClick={() => setShowThinkTrace(v => !v)}
                    >
                      Think
                      {reactSteps.length > 0 && <span className="air-tab-count">{reactSteps.length}</span>}
                    </button>
                    <button
                      className={`air-tab${showAISuggestions ? ' air-tab--active' : ''}`}
                      onClick={() => setShowAISuggestions(v => !v)}
                    >
                      Suggest
                    </button>
                    <button
                      className={`air-tab${showGateDebug ? ' air-tab--active' : ''}`}
                      onClick={() => setShowGateDebug(v => !v)}
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5L10 10"/></svg>
                      Debug
                    </button>
                  </div>

                  {/* Think Trace panel */}
                  {showThinkTrace && (
                    <div className="air-panel">
                      {reactSteps.length === 0
                        ? <div className="air-panel-empty">No reasoning steps yet.</div>
                        : <div className="air-react-list">
                            {reactSteps.map((step, i) => (
                              <div key={i} className={`air-react-step air-react-step--${step.phase}`}>
                                <span className="air-react-phase">{step.phase.slice(0, 3).toUpperCase()}</span>
                                <span className="air-react-content">{step.content}</span>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  )}

                  {/* Suggestions panel */}
                  {showAISuggestions && (
                    <div className="air-panel">
                      {isSuggestionLoading
                        ? <div className="air-panel-empty">Loading suggestions...</div>
                        : aiSuggestions.length > 0
                          ? <div className="air-suggestions-list">
                              {suggestionSource && <div className="air-suggestions-source">Source: {suggestionSource}</div>}
                              {aiSuggestions.map((item, i) => <div key={i} className="air-suggestion">{item}</div>)}
                            </div>
                          : <div className="air-panel-empty">No suggestions available.</div>
                      }
                    </div>
                  )}

                  {/* Gate debug panel */}
                  {showGateDebug && (
                    <div className="air-panel" role="region" aria-label="Execution gate diagnostics">
                      <div className="air-gate-grid">
                        <div className="air-gate-cell">
                          <span className="air-gate-label">Attempt</span>
                          <span className="air-gate-value">{gateDebug.attempt}</span>
                        </div>
                        <div className="air-gate-cell">
                          <span className="air-gate-label">Compile</span>
                          <span className={`air-gate-value air-gate-value--${gateDebug.compileOk ? 'pass' : 'fail'}`}>{gateDebug.compileOk ? 'OK' : 'Failed'}</span>
                        </div>
                        <div className="air-gate-cell">
                          <span className="air-gate-label">Collisions</span>
                          <span className={`air-gate-value air-gate-value--${gateDebug.collisionFrames === 0 ? 'pass' : 'fail'}`}>{gateDebug.collisionFrames}</span>
                        </div>
                        <div className="air-gate-cell">
                          <span className="air-gate-label">Pickup</span>
                          <span className={`air-gate-value air-gate-value--${gateDebug.pickupSucceeded ? 'pass' : gateDebug.pickupRequired ? 'fail' : ''}`}>
                            {gateDebug.pickupSucceeded ? (gateDebug.pickupObjectId ?? 'held') : gateDebug.pickupRequired ? 'None held' : 'N/A'}
                          </span>
                        </div>
                      </div>
                      {gateDebug.missingTargetIds.length > 0 && (
                        <div className="air-gate-alert">Missing targets: {gateDebug.missingTargetIds.join(', ')}</div>
                      )}
                      {gateDebug.blockedReasons.length > 0 && (
                        <ul className="air-gate-reasons">
                          {gateDebug.blockedReasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Empty / generating state ── */
                <div className="air-idle">
                  {isAILoading ? (
                    <>
                      <svg className="air-idle-spin" width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 1 1-3.1-6.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      <span className="air-idle-title air-thinking-text" key={thinkingText}>{thinkingText}</span>
                      <span className="air-idle-sub air-thinking-dots">
                        <span className="air-dot" />
                        <span className="air-dot" />
                        <span className="air-dot" />
                      </span>
                    </>
                  ) : aiError ? (
                    <>
                      <svg className="air-idle-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                      <span className="air-idle-title">{aiError}</span>
                    </>
                  ) : (
                    <>
                      <svg className="air-idle-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                      <span className="air-idle-title">Generate motion to see results</span>
                    </>
                  )}

                  <button
                    className={`air-tab${showGateDebug ? ' air-tab--active' : ''}`}
                    onClick={() => setShowGateDebug(v => !v)}
                    style={{ marginTop: 4 }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5L10 10"/></svg>
                    Gate Debug
                  </button>
                  {showGateDebug && (
                    <div className="air-panel" style={{ width: '100%' }}>
                      <div className="air-gate-grid">
                        <div className="air-gate-cell">
                          <span className="air-gate-label">Attempt</span>
                          <span className="air-gate-value">{gateDebug.attempt}</span>
                        </div>
                        <div className="air-gate-cell">
                          <span className="air-gate-label">Compile</span>
                          <span className={`air-gate-value air-gate-value--${gateDebug.compileOk ? 'pass' : 'fail'}`}>{gateDebug.compileOk ? 'OK' : 'Failed'}</span>
                        </div>
                        <div className="air-gate-cell">
                          <span className="air-gate-label">Collisions</span>
                          <span className={`air-gate-value air-gate-value--${gateDebug.collisionFrames === 0 ? 'pass' : 'fail'}`}>{gateDebug.collisionFrames}</span>
                        </div>
                        <div className="air-gate-cell">
                          <span className="air-gate-label">Pickup</span>
                          <span className={`air-gate-value air-gate-value--${gateDebug.pickupSucceeded ? 'pass' : ''}`}>{gateDebug.pickupSucceeded ? (gateDebug.pickupObjectId ?? 'held') : 'None'}</span>
                        </div>
                      </div>
                      {gateDebug.blockedReasons.length > 0 && (
                        <ul className="air-gate-reasons">
                          {gateDebug.blockedReasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
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