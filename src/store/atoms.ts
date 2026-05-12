import { atom } from 'jotai'

// Arm Configuration
export const armSegmentsAtom = atom<any[]>([
  { id: 'base', name: 'Base', length: 0, mass: 2, joint: 'revolute' },
  { id: 'segment1', name: 'Segment 1', length: 0.8, mass: 1, joint: 'revolute' },
  { id: 'segment2', name: 'Segment 2', length: 0.7, mass: 0.8, joint: 'revolute' },
])

export const armGripperAtom = atom<any>({
  id: 'gripper',
  type: 'parallel_jaw',
  width: 0.1,
  force: 50,
})

// Task Programming
export const taskBlocksAtom = atom<any[]>([])
export const taskMetaAtom = atom({
  name: 'Untitled Task',
  version: '0.0.1',
  description: '',
})

// Simulation
export const simulationFramesAtom = atom<any[]>([])
export const simulationPlayheadAtom = atom(0)
export const simulationStatusAtom = atom<'idle' | 'running' | 'paused' | 'complete' | 'error'>('idle')

// Community
export const communityTasksAtom = atom<any[]>([])
export const selectedTaskAtom = atom<any | null>(null)

// Gemini
export const geminiLoadingAtom = atom(false)
export const geminiErrorAtom = atom<string | null>(null)
