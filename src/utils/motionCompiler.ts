import type { Node, Edge } from '@xyflow/react'
import type { TaskBlock, MoveBlock } from '../types/task'
import type { SceneGraph } from '../types/task'
import type { ArmSegment } from '../types/arm'
import type { SimFrame, ExecutionPlan } from '../types/simulation'
import {
  forwardKinematics,
  getHomeState,
  lerpAngles,
  easeInOut,
  lerp,
  clampPitchAngles,
} from './forwardKinematics'
import { solveIK } from './inverseKinematics'

// Constraints
const FPS = 60
const FRAME_DT_MS = 1000 / FPS
const BASE_MOVE_FRAMES = 90
const MIN_MOVE_FRAMES = 12
const GRIP_HOLD_FRAMES = 20
const POINT_COLLISION_MARGIN = 0.02
const LINK_COLLISION_RADIUS = 0.022
const LINK_COLLISION_SAMPLES = 16
const GRAB_RANGE = 0.18

// Target resolver
const JAW_CENTER_OFFSET = 0.05

function resolveTarget(block: MoveBlock, scene: SceneGraph): [number, number, number] {
  if (block.params.targetId) {
    const obj = scene.objects.find((o) => o.id === block.params.targetId)
    if (obj) {
      return [
        obj.position[0],
        obj.position[1] + JAW_CENTER_OFFSET,
        obj.position[2],
      ]
    }

    const zone = scene.targetZones.find((z) => z.id === block.params.targetId)
    if (zone) return zone.position as [number, number, number]
  }

  return [block.params.x, block.params.y, block.params.z]
}

// Graph traversal
function buildLinearSequence(
  nodes: Node<TaskBlock>[],
  edges: Edge[],
): Node<TaskBlock>[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const adj = new Map<string, string[]>()

  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    if (e.sourceHandle === 'else') {
      adj.get(e.source)!.push(e.target)
    } else {
      adj.get(e.source)!.unshift(e.target)
    }
  }

  const seq: Node<TaskBlock>[] = []
  const visited = new Set<string>()
  let currentId = nodes.find((n) => n.data.kind === 'start')?.id

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const node = nodeMap.get(currentId)
    if (!node) break
    seq.push(node)
    if (node.data.kind === 'end') break
    currentId = (adj.get(currentId) ?? [])[0]
  }

  return seq
}

// Collision checks
function pointToAABBDistanceSq(
  point: [number, number, number],
  center: [number, number, number],
  half: [number, number, number],
): number {
  const dx = Math.max(Math.abs(point[0] - center[0]) - half[0], 0)
  const dy = Math.max(Math.abs(point[1] - center[1]) - half[1], 0)
  const dz = Math.max(Math.abs(point[2] - center[2]) - half[2], 0)
  return dx * dx + dy * dy + dz * dz
}

function segmentToAABBDistanceSq(
  start: [number, number, number],
  end: [number, number, number],
  center: [number, number, number],
  half: [number, number, number],
): number {
  let best = Number.POSITIVE_INFINITY

  for (let i = 0; i <= LINK_COLLISION_SAMPLES; i++) {
    const t = i / LINK_COLLISION_SAMPLES
    const sample: [number, number, number] = [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
      start[2] + (end[2] - start[2]) * t,
    ]
    const d2 = pointToAABBDistanceSq(sample, center, half)
    if (d2 < best) best = d2
    if (best <= 0) break
  }

  return best
}

function checkAABBCollision(
  point: [number, number, number],
  scene: SceneGraph,
  ignoreId?: string,
): string | null {
  for (const obj of scene.objects) {
    if (obj.type === 'zone') continue
    if (obj.id === ignoreId) continue

    const [ox, oy, oz] = obj.position
    const half: [number, number, number] = [
      obj.dimensions[0] / 2 + POINT_COLLISION_MARGIN,
      obj.dimensions[1] / 2 + POINT_COLLISION_MARGIN,
      obj.dimensions[2] / 2 + POINT_COLLISION_MARGIN,
    ]

    if (pointToAABBDistanceSq(point, [ox, oy, oz], half) <= 0) {
      return obj.id
    }
  }

  return null
}

function checkArmLinkCollision(
  segments: ArmSegment[],
  jointPositions: [number, number, number][],
  scene: SceneGraph,
  ignoreId?: string,
): { objectId: string; linkIndex: number } | null {
  const linkRadiusSq = LINK_COLLISION_RADIUS * LINK_COLLISION_RADIUS

  for (let segIndex = 0; segIndex < segments.length; segIndex++) {
    const seg = segments[segIndex]
    if (seg.joint === 'fixed') continue

    const start = jointPositions[segIndex]
    const end = jointPositions[segIndex + 1]
    if (!start || !end) continue

    for (const obj of scene.objects) {
      if (obj.type === 'zone') continue
      if (obj.id === ignoreId) continue

      const [ox, oy, oz] = obj.position
      const half: [number, number, number] = [
        obj.dimensions[0] / 2 + POINT_COLLISION_MARGIN,
        obj.dimensions[1] / 2 + POINT_COLLISION_MARGIN,
        obj.dimensions[2] / 2 + POINT_COLLISION_MARGIN,
      ]

      const distSq = segmentToAABBDistanceSq(start, end, [ox, oy, oz], half)
      if (distSq <= linkRadiusSq) {
        return { objectId: obj.id, linkIndex: segIndex }
      }
    }
  }

  return null
}

// Metrics estimation
function estimateTorques(segments: ArmSegment[], pitchAngles: number[]): number[] {
  const revolve = segments.filter((s) => s.joint !== 'fixed')
  let cumPitch = 0

  return revolve.map((seg, i) => {
    cumPitch += pitchAngles[i] ?? 0
    return parseFloat(
      (seg.mass * 9.81 * seg.length * Math.abs(Math.sin((cumPitch * Math.PI) / 180))).toFixed(3),
    )
  })
}

function estimateVelocities(
  prev: number[] | null,
  curr: number[],
  dtS: number,
): number[] {
  if (!prev || dtS < 1e-9) return curr.map(() => 0)

  return curr.map((a, i) =>
    parseFloat((Math.abs(a - (prev[i] ?? a)) / dtS).toFixed(2)),
  )
}

// Arm config hash
export function armConfigHash(segments: ArmSegment[]): string {
  return segments
    .map((s) => `${s.id}:${s.length.toFixed(3)}:${s.mass.toFixed(2)}:${s.joint}`)
    .join('|')
}

// Main compiler
export function compileTask(
  nodes: Node<TaskBlock>[],
  edges: Edge[],
  segments: ArmSegment[],
  scene: SceneGraph,
  taskName: string,
): ExecutionPlan | null {
  const startNode = nodes.find((n) => n.data.kind === 'start')
  if (!startNode || nodes.length < 2) return null

  const sequence = buildLinearSequence(nodes, edges)
  if (sequence.length < 1) return null

  const home = getHomeState(segments)
  let currentPitch = [...home.pitchAngles]
  let currentYaw = 0
  let gripperOpen = true
  let gripperForce = 0
  let heldObjectId: string | null = null
  let heldObjectOffset: [number, number, number] | null = null
  let approachTargetId: string | null = null

  const frames: SimFrame[] = []
  let frameIndex = 0
  let timeMs = 0
  let prevPitch: number[] | null = null

  const pushFrame = (overrides?: Partial<SimFrame>) => {
    const safePitch = clampPitchAngles(segments, currentPitch)
    const fk = forwardKinematics(segments, safePitch, currentYaw)
    const torques = estimateTorques(segments, safePitch)
    const velocities = estimateVelocities(prevPitch, safePitch, FRAME_DT_MS / 1000)

    const ignoreId = heldObjectId ?? approachTargetId ?? undefined

    const linkHit = checkArmLinkCollision(segments, fk.jointPositions, scene, ignoreId)
    const eeHitId = linkHit ? null : checkAABBCollision(fk.endEffector, scene, ignoreId)

    const heldObjectPos: [number, number, number] | undefined =
      heldObjectId && heldObjectOffset
        ? [
            fk.endEffector[0] + heldObjectOffset[0],
            fk.endEffector[1] + heldObjectOffset[1],
            fk.endEffector[2] + heldObjectOffset[2],
          ]
        : undefined

    frames.push({
      frameIndex: frameIndex++,
      timeMs,
      waistYawDeg: currentYaw,
      pitchAngles: [...safePitch],
      gripperOpen,
      gripperForce,
      endEffectorPos: fk.endEffector,
      isCollision: Boolean(linkHit || eeHitId),
      collidingObjectId: linkHit?.objectId ?? eeHitId ?? undefined,
      collidingLinkIndex: linkHit?.linkIndex,
      heldObjectId: heldObjectId ?? undefined,
      heldObjectPos,
      approachTargetId: approachTargetId ?? undefined,
      jointTorques: torques,
      jointVelocities: velocities,
      ...overrides,
    })

    prevPitch = [...safePitch]
    timeMs += FRAME_DT_MS
  }

  for (const node of sequence) {
    const block = node.data

    if (block.kind === 'start' || block.kind === 'end') {
      for (let f = 0; f < 30; f++) pushFrame()
      continue
    }

    if (block.kind === 'move') {
      if (block.params.targetId) {
        const approachObj = scene.objects.find(
          (o) => o.id === block.params.targetId && o.type !== 'surface' && o.type !== 'zone',
        )
        approachTargetId = approachObj?.id ?? null
      } else {
        approachTargetId = null
      }

      const target = resolveTarget(block, scene)

      if (!approachTargetId) {
        let nearestId: string | null = null
        let nearestDist = GRAB_RANGE

        for (const obj of scene.objects) {
          if (obj.type === 'surface' || obj.type === 'zone') continue
          const dx = target[0] - obj.position[0]
          const dy = target[1] - obj.position[1]
          const dz = target[2] - obj.position[2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (dist < nearestDist) {
            nearestDist = dist
            nearestId = obj.id
          }
        }

        approachTargetId = nearestId
      }

      const ik = solveIK(segments, target)
      const targetPitch = ik.pitchAngles
      const targetYaw = ik.waistYawDeg

      const frameCount = Math.max(
        MIN_MOVE_FRAMES,
        Math.round(BASE_MOVE_FRAMES / Math.max(0.05, block.params.speed)),
      )

      const startPitch = [...currentPitch]
      const startYaw = currentYaw

      for (let f = 0; f < frameCount; f++) {
        const t = easeInOut(f / Math.max(frameCount - 1, 1))
        currentPitch = lerpAngles(startPitch, targetPitch, t)
        currentYaw = lerp(startYaw, targetYaw, t)
        pushFrame()
      }

      currentPitch = [...targetPitch]
      currentYaw = targetYaw
      approachTargetId = null
      continue
    }

    if (block.kind === 'grip') {
      gripperOpen = block.params.action === 'open'
      gripperForce = block.params.action === 'close' ? block.params.force : 0

      if (block.params.action === 'close') {
        const safePitch = clampPitchAngles(segments, currentPitch)
        const fk = forwardKinematics(segments, safePitch, currentYaw)
        const ee = fk.endEffector

        let bestId: string | null = null
        let bestDist = GRAB_RANGE
        let bestOffset: [number, number, number] = [0, 0, 0]

        for (const obj of scene.objects) {
          if (obj.type === 'surface' || obj.type === 'zone') continue
          const dx = obj.position[0] - ee[0]
          const dy = obj.position[1] - ee[1]
          const dz = obj.position[2] - ee[2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (dist < bestDist) {
            bestDist = dist
            bestId = obj.id
            bestOffset = [dx, dy, dz]
          }
        }

        heldObjectId = bestId
        heldObjectOffset = bestId ? bestOffset : null
      } else {
        heldObjectId = null
        heldObjectOffset = null
      }

      const emptyGrip = block.params.action === 'close' && heldObjectId === null
      for (let f = 0; f < GRIP_HOLD_FRAMES; f++) {
        pushFrame(emptyGrip ? { gripEmpty: true } : undefined)
      }
      continue
    }

    if (block.kind === 'wait') {
      const waitFrames = Math.max(1, Math.round(block.params.durationMs / FRAME_DT_MS))
      for (let f = 0; f < Math.min(waitFrames, 600); f++) pushFrame()
      continue
    }

    if (block.kind === 'loop') {
      const loopFrames = Math.min(block.params.count, 20) * 18
      for (let f = 0; f < loopFrames; f++) pushFrame()
      continue
    }
  }

  return {
    frames,
    totalFrames: frames.length,
    durationMs: timeMs,
    fps: FPS,
    taskName,
    armConfigHash: armConfigHash(segments),
  }
}