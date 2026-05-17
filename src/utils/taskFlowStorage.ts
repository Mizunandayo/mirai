import type { Edge, Node } from '@xyflow/react'
import type { TaskBlock } from '../types/task'
import { INITIAL_START_NODE } from '../store/taskAtoms'

export const TASK_FLOW_STORAGE_KEY = 'mirai_task_flow_v1'

export type StoredTaskFlow = {
  nodes: Node<TaskBlock>[]
  edges: Edge[]
}

export function normalizeFlowPayload(
  flow: Partial<StoredTaskFlow> | null | undefined,
): StoredTaskFlow {
  const nodes = Array.isArray(flow?.nodes) ? flow.nodes : []
  const edges = Array.isArray(flow?.edges) ? flow.edges : []

  if (nodes.length === 0) {
    return { nodes: [INITIAL_START_NODE], edges: [] }
  }

  return { nodes, edges }
}

export function loadStoredTaskFlow(): StoredTaskFlow | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TASK_FLOW_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredTaskFlow>
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null
    return normalizeFlowPayload({
      nodes: parsed.nodes as Node<TaskBlock>[],
      edges: parsed.edges as Edge[],
    })
  } catch {
    return null
  }
}

export function persistTaskFlow(nodes: Node<TaskBlock>[], edges: Edge[]) {
  if (typeof window === 'undefined') return
  const payload: StoredTaskFlow = normalizeFlowPayload({ nodes, edges })
  window.localStorage.setItem(TASK_FLOW_STORAGE_KEY, JSON.stringify(payload))
}