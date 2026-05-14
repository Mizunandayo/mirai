// src/utils/armContextBuilder.ts

import { ArmSegment, GripperConfig } from '../types/arm';
import { AIPlanRequest } from '../types/ai';

const GRIPPER_TYPE_MAP: Record<GripperConfig['type'], AIPlanRequest['armContext']['gripper']['type']> = {
  parallel_jaw: 'parallel',
  suction_cup: 'suction',
  magnetic: 'magnetic',
};




export function buildArmContext(
  segments: ArmSegment[],
  gripper: GripperConfig,
  _scene: unknown
): AIPlanRequest['armContext'] {
  /**
   * Convert arm state to Gemini-friendly format.
   */
  
  const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
  const maxReach = totalLength * 1.1; // 10% margin
  
  return {
    segments: segments.map((seg) => ({
      name: seg.name,
      length: seg.length,
      mass: seg.mass,
    })),
    gripper: {
      type: GRIPPER_TYPE_MAP[gripper.type],
    },
    maxReach,
    payloadLimit: 2.0,
  };
}







export function getSceneObjectNames(_scene: unknown): string[] {
  /**
   * Extract list of named objects in scene.
   * Used as context for Gemini (e.g., "red_box", "shelf", "work_table").
   */
  return ['work_table', 'red_box', 'green_box', 'shelf', 'bin'];
}

export function buildAllowedVerbs(): string[] {
  /**
   * Day 5 scope: rigid object manipulation only.
   */
  return ['pick', 'place', 'stack', 'move', 'sort'];
}