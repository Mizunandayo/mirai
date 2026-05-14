import type { AIPlanRequest, StreamChunk } from '../types/ai'

const AI_BASE_URL = 'http://localhost:8000'




export async function* streamTaskPlan(request: AIPlanRequest): AsyncGenerator<StreamChunk> {
  const response = await fetch(AI_BASE_URL + '/ai/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
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
      failures: failures,
      arm_context: armContext,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error('Repair failed: ' + response.status + ' ' + text)
  }

  return response.json()
}