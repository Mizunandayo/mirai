import { atom } from 'jotai'
import type { ExecutionPlan, PlaybackStatus, PlaybackSpeed } from '../types/simulation'

export const compiledPlanAtom = atom<ExecutionPlan | null>(null)
export const playbackStatusAtom = atom<PlaybackStatus>('idle')
export const currentFrameAtom = atom<number>(0)
export const playbackSpeedAtom = atom<PlaybackSpeed>(1)
export const loopAtom = atom<boolean>(false)
export const skipCollisionPauseAtom = atom<boolean>(false)
export const ptpSequencePlayingAtom = atom<boolean>(false)


// Collision polish controls
export const autoRewindOnCollisionAtom = atom<boolean>(false)
export const collisionRewindFramesAtom = atom<number>(12) // clamped in UI and playback engine
export const collisionFlashMsAtom = atom<number>(420)

export type SimObjectBaseline = {
  position: [number, number, number]
  rotation: [number, number, number, number]
  scale: [number, number, number]
}

export const simBaselineObjectStatesAtom = atom<Record<string, SimObjectBaseline>>({})

/**
 * Increment this counter to explicitly request a full scene reset.
 * SceneObjects watches it and snaps all Rapier bodies back to their
 * baseline positions regardless of the current frameNumber value.
 * Use this instead of relying on frameNumber→0 transitions, which
 * silently no-op when the frame was already 0.
 */
export const sceneResetTriggerAtom = atom<number>(0)


export const currentSimFrameAtom = atom((get) => {
  const plan = get(compiledPlanAtom)
  const frame = get(currentFrameAtom)
  if (!plan || plan.frames.length === 0) return null
  return plan.frames[Math.min(frame, plan.frames.length - 1)] ?? null
})



export const pathTrailPointsAtom = atom((get) => {
  const plan = get(compiledPlanAtom)
  const frame = get(currentFrameAtom)
  const status = get(playbackStatusAtom)
  if (!plan) return [] as [number, number, number][]
  // Keep the full trail visible once playback finishes — persists until user resets
  if (status === 'complete') return plan.frames.map((f) => f.endEffectorPos)
  // No trail when idle (before play or after manual reset)
  if (status === 'idle') return [] as [number, number, number][]
  // During active playback (playing / paused / collision_paused / reverse_playing)
  // show a growing trail from start up to the current frame
  return plan.frames.slice(0, frame + 1).map((f) => f.endEffectorPos)
})



export const playbackProgressAtom = atom((get) => {
  const plan = get(compiledPlanAtom)
  const frame = get(currentFrameAtom)
  if (!plan || plan.totalFrames === 0) return 0
  return frame / (plan.totalFrames - 1)
})