import type { AIPlanRequest, AISuggestRequest, AISuggestResponse, StreamChunk } from '../types/ai'

const AI_BASE_URL = 'http://localhost:8000'




export async function* streamTaskPlan(request: AIPlanRequest): AsyncGenerator<StreamChunk> {
  const payload = {
    user_input: request.userInput,
    arm_context: request.armContext,
    scene_objects: request.sceneObjects,
    allowed_verbs: request.allowedVerbs,
  }

  const response = await fetch(AI_BASE_URL + '/ai/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error('Stream failed: ' + response.status + ' ' + text)
  }

  if (!response.body) {
    throw new Error('No response body from AI stream')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const next = await reader.read()
      if (next.done) {
        if (buffer.trim().length > 0) {
          const lines = buffer.split('\n')
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') {
              yield { type: 'done' }
              return
            }
            try {
              yield JSON.parse(payload) as StreamChunk
            } catch {
              continue
            }
          }
        }
        break
      }

      buffer += decoder.decode(next.value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() ?? ''

      for (const block of chunks) {
        const lines = block.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            yield { type: 'done' }
            return
          }
          try {
            yield JSON.parse(payload) as StreamChunk
          } catch {
            continue
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}




export async function repairTask(taskSpec: any, failures: any[], armContext: any) {
  const response = await fetch(AI_BASE_URL + '/ai/repair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_spec: taskSpec,
      failures,
      arm_context: armContext,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error('Repair failed: ' + response.status + ' ' + text)
  }

  return response.json()
}

export async function getMotionSuggestions(request: AISuggestRequest): Promise<AISuggestResponse> {
  const payload = {
    user_input: request.userInput,
    arm_context: request.armContext,
    scene_objects: request.sceneObjects,
    task_spec: request.taskSpec,
    preflight: request.preflight,
  }

  const response = await fetch(AI_BASE_URL + '/ai/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error('Suggest failed: ' + response.status + ' ' + text)
  }

  return response.json() as Promise<AISuggestResponse>
}


















// Code preview for side-by-side pane

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? 'http://localhost:8000'

export type CodePreviewResult = {
  arduino: string
  python: string
}

export async function fetchCodePreview(
  arm: Record<string, unknown>,
  task: Record<string, unknown>,
): Promise<CodePreviewResult> {
  const res = await fetch(API_BASE_URL + '/export/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arm, task }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Code preview failed ${res.status}: ${text}`)
  }

  return res.json() as Promise<CodePreviewResult>
}






