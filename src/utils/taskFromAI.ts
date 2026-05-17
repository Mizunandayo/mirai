import type { Node, Edge } from '@xyflow/react'
import type { TaskBlock } from '../types/task'

type AIStep = {
  type?: string
  targetId?: string | null
  x?: number
  y?: number
  z?: number
  speed?: number
  approach?: string
  action?: string
  force?: number
  durationMs?: number
}

function normalizeStepType(raw: unknown): string {
  const t = String(raw ?? '').toLowerCase().trim()
  if (t === 'move_to' || t === 'place' || t === 'stack' || t === 'align' || t === 'sort') return 'move'
  if (t === 'grasp' || t === 'release') return 'grip'
  return t
}

function normalizeStep(raw: any): AIStep {
  const type = normalizeStepType(raw?.type ?? raw?.kind ?? raw?.actionType)

  let gripAction: string | undefined = raw?.action
  if (!gripAction && type === 'grip') {
    const lowKind = String(raw?.kind ?? '').toLowerCase()
    if (lowKind === 'release') gripAction = 'open'
    if (lowKind === 'grasp') gripAction = 'close'
  }

  return {
    type,
    targetId: raw?.targetId ?? raw?.target_id ?? raw?.targetName ?? raw?.target_name ?? null,
    x: Number(raw?.x ?? raw?.position?.[0] ?? raw?.coords?.x ?? 0),
    y: Number(raw?.y ?? raw?.position?.[1] ?? raw?.coords?.y ?? 0),
    z: Number(raw?.z ?? raw?.position?.[2] ?? raw?.coords?.z ?? 0),
    speed: Number(raw?.speed ?? 0.5),
    approach: raw?.approach ?? 'above',
    action: gripAction,
    force: Number(raw?.force ?? 50),
    durationMs: Number(raw?.durationMs ?? raw?.duration_ms ?? raw?.duration ?? 500),
  }
}

function extractSteps(task: any): AIStep[] {
  const candidate =
    task?.steps ??
    task?.taskSteps ??
    task?.task_steps ??
    task?.blocks ??
    task?.plan ??
    task?.primitives ??
    []

  if (!Array.isArray(candidate)) return []
  return candidate.map((step) => normalizeStep(step)).filter((step) => Boolean(step.type))
}


function makeStartNode(): Node<TaskBlock> {
  return {
    id: 'start',
    type: 'start',
    position: { x: 220, y: 60 },
    data: { kind: 'start', label: 'Start' },
    deletable: false,
    selectable: true,
  }
}

const FIRST_STEP_Y = 180
const NODE_VERTICAL_GAP_PX = 24

function estimateNodeHeight(step: AIStep): number {
  if (step.type === 'move') return 190
  if (step.type === 'grip') return 112
  if (step.type === 'wait') return 98
  return 132
}

function buildStepLayout(steps: AIStep[]): Array<{ step: AIStep; y: number }> {
  let cursorY = FIRST_STEP_Y
  return steps.map((step) => {
    const positioned = { step, y: cursorY }
    cursorY += estimateNodeHeight(step) + NODE_VERTICAL_GAP_PX
    return positioned
  })
}





function mapStepToNode(step: AIStep, index: number, y: number): Node<TaskBlock> {
  const id = 'ai-step-' + String(index + 1)

  if (step.type === 'move') {
    return {
      id,
      type: 'move',
      position: { x: 220, y },
      data: {
        kind: 'move',
        label: 'Move',
        params: {
          targetId: step.targetId ?? null,
          x: step.x ?? 0,
          y: step.y ?? 0,
          z: step.z ?? 0,
          speed: step.speed ?? 0.5,
          approach: step.approach ?? 'above',
        },
      } as TaskBlock,
      deletable: true,
      selectable: true,
    }
  }

  if (step.type === 'grip') {
    return {
      id,
      type: 'grip',
      position: { x: 220, y },
      data: {
        kind: 'grip',
        label: 'Grip',
        params: {
          action: step.action ?? 'close',
          force: step.force ?? 50,
        },
      } as TaskBlock,
      deletable: true,
      selectable: true,
    }
  }

  if (step.type === 'wait') {
    return {
      id,
      type: 'wait',
      position: { x: 220, y },
      data: {
        kind: 'wait',
        label: 'Wait',
        params: { durationMs: step.durationMs ?? 500 },
      } as TaskBlock,
      deletable: true,
      selectable: true,
    }
  }

  return {
    id,
    type: 'move',
    position: { x: 220, y },
    data: {
      kind: 'move',
      label: 'Move',
      params: { targetId: null, x: 0, y: 0.2, z: 0.2, speed: 0.5, approach: 'above' },
    } as TaskBlock,
    deletable: true,
    selectable: true,
  }
}

function makeEndNode(y: number): Node<TaskBlock> {
  return {
    id: 'end',
    type: 'end',
    position: { x: 220, y },
    data: { kind: 'end', label: 'End' },
    deletable: true,
    selectable: true,
  }
}

function makeEdges(nodeIds: string[]): Edge[] {
  const edges: Edge[] = []
  for (let i = 0; i < nodeIds.length - 1; i += 1) {
    edges.push({
      id: 'e-' + nodeIds[i] + '-' + nodeIds[i + 1],
      source: nodeIds[i],
      target: nodeIds[i + 1],
      type: 'deletable',
      animated: false,
    })
  }
  return edges
}

export function buildFlowFromAITask(task: any): { nodes: Node<TaskBlock>[]; edges: Edge[] } {
  const start = makeStartNode()
  const normalizedSteps = extractSteps(task)
  const stepLayout = buildStepLayout(normalizedSteps)
  const stepNodes = stepLayout.map(({ step, y }, idx) => mapStepToNode(step, idx, y))
  const endY = stepLayout.length > 0
    ? stepLayout[stepLayout.length - 1].y + estimateNodeHeight(stepLayout[stepLayout.length - 1].step) + NODE_VERTICAL_GAP_PX
    : FIRST_STEP_Y
  const end = makeEndNode(endY)

  const nodes = [start, ...stepNodes, end]
  const edges = makeEdges(nodes.map((n) => n.id))

  return { nodes, edges }
}