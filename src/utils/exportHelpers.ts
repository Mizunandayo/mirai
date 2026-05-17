// src/utils/exportHelpers.ts
// Pure utilities for the Export tab.
// Converts existing project types → API request payload.

import type { ArmSegment, GripperConfig }     from '../types/arm'
import type { ServoTier }                      from '../store/atoms'
import type { ExecutionPlan, SimFrame }        from '../types/simulation'
import type {
  BundleRequestPayload,
  WaypointExport,
} from '../types/export'







/* ── Waypoint label detection ─────────────────────────────────────────────── */

function detectLabel(frame: SimFrame, prev: SimFrame): string {
  if (frame.gripperOpen !== prev.gripperOpen) {
    return frame.gripperOpen ? 'release object' : 'grip object'
  }
  if (frame.heldObjectId && !prev.heldObjectId) {
    return `pick up ${frame.heldObjectId}`
  }
  if (!frame.heldObjectId && prev.heldObjectId) {
    return 'deposit object'
  }
  return ''
}









/* ── Waypoint sampler ─────────────────────────────────────────────────────── */
//
// Targets ~15 semantic waypoints from the compiled simulation frames.
// We sample at even intervals, always including frame 0 and the last frame,
// then detect grip/release events so the generated code captures every
// meaningful motion transition.

export function sampleWaypoints(
  plan:     ExecutionPlan,
  segments: ArmSegment[],
): WaypointExport[] {
  const { frames, totalFrames } = plan
  if (frames.length === 0) return []

  const TARGET_WAYPOINTS = 15
  const step = Math.max(1, Math.floor(totalFrames / TARGET_WAYPOINTS))

  const indices = new Set<number>([0])
  for (let i = step; i < totalFrames; i += step) indices.add(i)
  indices.add(totalFrames - 1)

  // Also capture every grip-state change for correct hardware behaviour
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].gripperOpen !== frames[i - 1].gripperOpen) {
      indices.add(i)
    }
  }

  const revolute = segments.filter(s => s.joint === 'revolute')
  const sorted   = Array.from(indices).sort((a, b) => a - b)

  return sorted.map((idx, pos) => {
    const f    = frames[Math.min(idx, frames.length - 1)]
    const prev = frames[Math.max(0, pos === 0 ? 0 : sorted[pos - 1])]

    return {
      time_ms:       Math.round(f.timeMs),
      waist_yaw_deg: parseFloat(f.waistYawDeg.toFixed(1)),
      pitch_angles:  f.pitchAngles
        .slice(0, revolute.length)
        .map(a => parseFloat(a.toFixed(1))),
      gripper_open:  f.gripperOpen,
      gripper_force: Math.round(f.gripperForce),
      end_effector:  f.endEffectorPos.map(v => parseFloat(v.toFixed(3))) as [number, number, number],
      label:         detectLabel(f, prev),
    }
  })
}








/* ── Request payload builder ──────────────────────────────────────────────── */
//
// Converts the project's internal Jotai atom values into the shape
// expected by FastAPI (matches server/models/export_schemas.py).

export function buildExportPayload(
  armName:  string,
  taskName: string,
  taskDesc: string,
  segments: ArmSegment[],
  gripper:  GripperConfig,
  servoTier: ServoTier,
  plan:     ExecutionPlan,
  liveUrl:  string,
): BundleRequestPayload {
  return {
    arm: {
      name: armName || 'Mirai Arm',
      servo_tier: servoTier,
      segments: segments.map(s => ({
        id:              s.id,
        name:            s.name,
        length:          s.length,
        mass:            s.mass,
        joint:           s.joint,
        joint_limit_min: s.jointLimitMin,
        joint_limit_max: s.jointLimitMax,
        material:        s.material,
      })),
      gripper: {
        type:  gripper.type,
        name:  gripper.name,
        width: gripper.width,
        force: gripper.force,
      },
    },
    task: {
      task_name:        taskName || 'Untitled Task',
      task_description: taskDesc || '',
      waypoints:        sampleWaypoints(plan, segments),
    },
    live_url: liveUrl || null,
  }
}
