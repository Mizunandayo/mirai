/**
 * Arm context builder — converts frontend arm/scene state into AI-ready formats.
 * Uses scenePlanner to include computed safe heights in scene descriptions,
 * giving Gemini the geometric information it needs for collision-free planning.
 */

import type { ArmSegment, GripperConfig } from '../types/arm'
import type { AIPlanRequest } from '../types/ai'
import type { SceneGraph } from '../types/task'
import { buildRichSceneContext } from './scenePlanner'

const GRIPPER_TYPE_MAP: Record<GripperConfig['type'], AIPlanRequest['armContext']['gripper']['type']> = {
  parallel_jaw: 'parallel',
  suction_cup: 'suction',
  magnetic: 'magnetic',
}

/** Build arm context DTO for the /ai/plan request. */
export function buildArmContext(
  segments: ArmSegment[],
  gripper: GripperConfig,
  _scene: unknown,
): AIPlanRequest['armContext'] {
  const totalLength = segments.reduce((sum, s) => sum + s.length, 0)
  const maxReach = totalLength * 1.1

  return {
    segments: segments.map(s => ({
      name: s.name,
      length: s.length,
      mass: s.mass,
      jointLimits: { min: s.jointLimitMin ?? -180, max: s.jointLimitMax ?? 180 },
    })),
    gripper: { type: GRIPPER_TYPE_MAP[gripper.type] },
    maxReach,
    payloadLimit: 2.0,
  }
}

/**
 * Build rich scene context strings for Gemini.
 *
 * Includes computed safe approach heights, grip heights, and transit height
 * so the backend can generate explicit collision-free waypoints in its prompt.
 * Replaces the previous plain text object list.
 */
export function getSceneObjectDescriptions(scene: SceneGraph): string[] {
  return buildRichSceneContext(scene)
}

// Keep legacy name as alias so existing call-sites don't break.
export { getSceneObjectDescriptions as getSceneObjectNames }

/** Allowed rigid-object verbs for v1 scope. */
export function buildAllowedVerbs(): string[] {
  return ['pick', 'place', 'stack', 'move', 'sort']
}
