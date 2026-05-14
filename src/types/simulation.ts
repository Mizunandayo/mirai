export type PlaybackStatus =
  | 'idle'
  | 'playing'
  | 'reverse_playing'
  | 'paused'
  | 'collision_paused'
  | 'complete'

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4

export interface SimFrame {
  frameIndex: number
  timeMs: number

  waistYawDeg: number
  pitchAngles: number[]

  gripperOpen: boolean
  gripperForce: number

  endEffectorPos: [number, number, number]

  isCollision: boolean
  collidingObjectId?: string

  heldObjectId?: string
  heldObjectPos?: [number, number, number]

  approachTargetId?: string
  gripEmpty?: boolean

  jointTorques: number[]
  jointVelocities: number[]
}

export interface ExecutionPlan {
  frames: SimFrame[]
  totalFrames: number
  durationMs: number
  fps: number
  taskName: string
  armConfigHash: string
}

export interface JointMetrics {
  index: number
  name: string
  angleDeg: number
  torqueNm: number
  velocityDegPerSec: number
  atLimit: boolean
  limitMin: number
  limitMax: number
}