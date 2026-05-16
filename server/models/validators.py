"""
Safety validators for Mirai task specs.

SafetyValidator now performs scene-aware AABB collision checks
using the parsed scene geometry from scene_objects context lines,
replacing the previous heuristic-only approach.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

from .schemas import TaskSpec, TaskStep, ArmContextDTO, ValidationError, PreFlightReport
from .arm_context import parse_scene_context, SceneObjectInfo


# ── AABB geometry helpers ─────────────────────────────────────────────────────

def _aabb_penetrates_point(
    px: float, py: float, pz: float,
    cx: float, cy: float, cz: float,
    hx: float, hy: float, hz: float,
    margin: float = 0.02,
) -> bool:
    """True when point (px,py,pz) is inside the AABB with safety margin."""
    return (
        abs(px - cx) < hx + margin and
        abs(py - cy) < hy + margin and
        abs(pz - cz) < hz + margin
    )


def _move_passes_through_aabb(
    x: float, y: float, z: float,
    obj: SceneObjectInfo,
    transit_height: float,
    margin: float = 0.02,
) -> bool:
    """
    True when a move step at (x, y, z) is likely to pass through obj's AABB.

    A move step is unsafe if:
    - Its Y is below transit_height (arm is at risk of hitting obstacles), AND
    - The (x, z) footprint overlaps the object's footprint (the arm will pass near it).
    """
    cx, cy, cz = obj.center
    hx, hy, hz = obj.size[0] / 2, obj.size[1] / 2, obj.size[2] / 2

    # Only flag if the move target is at a risky height (below safe transit)
    if y >= transit_height - 0.01:
        return False

    # Check horizontal footprint overlap — arm will pass over/near this object
    x_overlap = abs(x - cx) < hx + margin + 0.06   # extra link radius margin
    z_overlap = abs(z - cz) < hz + margin + 0.06

    if not (x_overlap and z_overlap):
        return False

    # Check Y: is the move target within the object's vertical range?
    # If y < obj top surface + clearance, arm links will sweep through it.
    obj_top = cy + hy
    if y < obj_top + 0.06:
        return True

    return False


# ── Precondition validators ───────────────────────────────────────────────────

class PreconditionValidator:

    @staticmethod
    def validate_gripper_sequence(steps: List[TaskStep]) -> List[Tuple[int, str]]:
        errors = []
        closed = False
        for i, step in enumerate(steps):
            if step.type == 'grip':
                if step.action == 'close' and closed:
                    errors.append((i, 'Cannot close gripper — already closed'))
                if step.action == 'open' and not closed:
                    errors.append((i, 'Cannot open gripper — already open'))
                closed = (step.action == 'close')
        return errors

    @staticmethod
    def validate_pick_sequence(steps: List[TaskStep]) -> List[Tuple[int, str]]:
        errors: List[Tuple[int, str]] = []
        has_close = False
        close_index = -1

        for i, step in enumerate(steps):
            if step.type == 'grip' and step.action == 'close':
                has_close = True
                close_index = i
                if i == 0 or steps[i - 1].type != 'move':
                    errors.append((i, 'Grip close must be preceded by a move step'))

        if has_close:
            has_carry = any(s.type == 'move' for s in steps[close_index + 1:])
            if not has_carry:
                errors.append((close_index, 'No carry move after grip close — pickup flow incomplete'))

        return errors

    @staticmethod
    def validate_pick_target_consistency(steps: List[TaskStep]) -> List[Tuple[int, str, str]]:
        first_close = next(
            (i for i, s in enumerate(steps) if s.type == 'grip' and s.action == 'close'),
            -1,
        )
        if first_close <= 0:
            return []

        expected: Optional[str] = None
        violations: List[Tuple[int, str, str]] = []

        for i in range(first_close):
            step = steps[i]
            if step.type != 'move':
                continue
            target = (step.target_name or '').strip()
            if not target:
                continue
            if expected is None:
                expected = target
                continue
            if target != expected:
                violations.append((i, target, expected))

        return violations


# ── Reach validator ───────────────────────────────────────────────────────────

class ReachValidator:

    @staticmethod
    def can_reach(x: float, y: float, z: float, max_reach: float) -> Tuple[bool, Optional[str]]:
        dist = math.sqrt(x**2 + y**2 + z**2)
        if dist > max_reach:
            return False, (
                f'Target ({x:.2f}, {y:.2f}, {z:.2f}) is {dist:.2f}m away, '
                f'but max reach is {max_reach:.2f}m'
            )
        if y < 0:
            return False, f'Target Y={y:.2f}m is below the work table (Y must be >= 0)'
        return True, None


# ── Payload validator ─────────────────────────────────────────────────────────

class PayloadValidator:

    @staticmethod
    def can_lift(mass_kg: float, payload_limit_kg: float) -> Tuple[bool, Optional[str]]:
        if mass_kg > payload_limit_kg:
            return False, f'Object mass {mass_kg}kg exceeds payload limit {payload_limit_kg}kg'
        return True, None


# ── Scene-aware collision validator ───────────────────────────────────────────

class SceneCollisionValidator:
    """
    Validates move step coordinates against the actual scene AABB geometry.
    Replaces the previous heuristic-only checks.
    """

    @staticmethod
    def check_move_step(
        x: float, y: float, z: float,
        step_index: int,
        scene_objects: List[SceneObjectInfo],
        transit_height: float,
    ) -> Optional[ValidationError]:
        """
        Detect when a move step target is at a height that risks arm-link collision.

        Rule: moves below transit_height that are laterally overlapping an obstacle
        are flagged as collision risks.
        """
        # Y below ground
        if y < -0.01:
            return ValidationError(
                step_index=step_index,
                step_type='move',
                error_code='collision_risk',
                message=f'Move target Y={y:.3f}m is below ground.',
                suggested_fix='Raise Y to at least 0.0',
            )

        # Scan scene obstacles
        for obj in scene_objects:
            if obj.type == 'zone':
                continue
            if _move_passes_through_aabb(x, y, z, obj, transit_height):
                return ValidationError(
                    step_index=step_index,
                    step_type='move',
                    error_code='collision_risk',
                    message=(
                        f'Move to ({x:.3f},{y:.3f},{z:.3f}) risks arm-link collision with '
                        f'"{obj.name}" ({obj.id}) — Y is below safe transit height {transit_height:.3f}m '
                        f'while passing over the object footprint.'
                    ),
                    suggested_fix=(
                        f'Transit at Y>={transit_height:.3f} (SAFE_TRANSIT_HEIGHT). '
                        f'Descend to grip/deposit only when directly above the target.'
                    ),
                )

        return None

    @staticmethod
    def check_transit_height_usage(
        steps: List[TaskStep],
        transit_height: float,
    ) -> List[ValidationError]:
        """
        Warn when a move step between two different (x,z) positions uses Y below transit height.
        Lateral travel below transit height risks arm sweeping through obstacles.
        """
        errors: List[ValidationError] = []
        prev_x: Optional[float] = None
        prev_z: Optional[float] = None

        for i, step in enumerate(steps):
            if step.type != 'move':
                prev_x = prev_z = None
                continue

            x, y, z = step.x or 0.0, step.y or 0.0, step.z or 0.0

            if prev_x is not None and prev_z is not None:
                dx = abs(x - prev_x)
                dz = abs(z - prev_z)
                is_lateral = (dx > 0.05 or dz > 0.05)

                if is_lateral and y < transit_height - 0.05:
                    errors.append(ValidationError(
                        step_index=i,
                        step_type='move',
                        error_code='collision_risk',
                        message=(
                            f'Lateral move (step {i + 1}) at Y={y:.3f}m is below '
                            f'safe transit height {transit_height:.3f}m — arm links may '
                            f'sweep through scene objects during this motion.'
                        ),
                        suggested_fix=(
                            f'Raise Y to {transit_height:.3f}m for lateral travel. '
                            f'Only descend vertically (X,Z unchanged) to reach targets.'
                        ),
                    ))

            prev_x, prev_z = x, z

        return errors


# ── Orchestrator ──────────────────────────────────────────────────────────────

class SafetyValidator:
    """Run all safety checks on a TaskSpec."""

    @staticmethod
    def validate_task_spec(
        task_spec: TaskSpec,
        arm_context: ArmContextDTO,
        scene_objects: Optional[List[str]] = None,
    ) -> PreFlightReport:
        errors: List[ValidationError] = []
        warnings: List[str] = []

        # Parse scene geometry if provided
        parsed_scene = parse_scene_context(scene_objects or [])
        transit_h = parsed_scene.transit_height

        # ── Gripper sequence ──────────────────────────────────────────────────
        for idx, msg in PreconditionValidator.validate_gripper_sequence(task_spec.steps):
            errors.append(ValidationError(
                step_index=idx, step_type='grip',
                error_code='precondition_unmet', message=msg,
            ))

        # ── Pick sequence ─────────────────────────────────────────────────────
        for idx, msg in PreconditionValidator.validate_pick_sequence(task_spec.steps):
            errors.append(ValidationError(
                step_index=idx, step_type='grip',
                error_code='precondition_unmet', message=msg,
                suggested_fix='Insert move-to-target, then grip close, then carry move',
            ))

        # ── Target consistency ────────────────────────────────────────────────
        for idx, bad, expected in PreconditionValidator.validate_pick_target_consistency(task_spec.steps):
            errors.append(ValidationError(
                step_index=idx, step_type='move',
                error_code='object_consistency',
                message=f"Move target '{bad}' conflicts with pickup target '{expected}' before grip-close",
                suggested_fix=f"Use pickup target '{expected}' for all pre-close move steps",
            ))

        # ── Per move-step checks ──────────────────────────────────────────────
        for idx, step in enumerate(task_spec.steps):
            if step.type != 'move':
                continue

            x, y, z = step.x or 0.0, step.y or 0.0, step.z or 0.0

            # Reach
            ok, msg = ReachValidator.can_reach(x, y, z, arm_context.max_reach)
            if not ok:
                errors.append(ValidationError(
                    step_index=idx, step_type='move',
                    error_code='reach_violation', message=msg,
                    suggested_fix=f'Move target closer to base (max reach: {arm_context.max_reach:.2f}m)',
                ))

            # Scene-aware AABB collision check
            if parsed_scene.objects:
                coll_err = SceneCollisionValidator.check_move_step(
                    x, y, z, idx, parsed_scene.objects, transit_h
                )
                if coll_err:
                    errors.append(coll_err)

        # ── Lateral transit height check ──────────────────────────────────────
        if parsed_scene.objects:
            transit_errs = SceneCollisionValidator.check_transit_height_usage(
                task_spec.steps, transit_h
            )
            errors.extend(transit_errs)

        # ── Payload (default mass estimate) ───────────────────────────────────
        for idx, step in enumerate(task_spec.steps):
            if step.type == 'grip' and step.action == 'close':
                ok, msg = PayloadValidator.can_lift(1.5, arm_context.payload_limit)
                if not ok:
                    errors.append(ValidationError(
                        step_index=idx, step_type='grip',
                        error_code='payload_violation', message=msg,
                    ))

        return PreFlightReport(
            is_safe=len(errors) == 0,
            errors=errors,
            warnings=warnings,
        )
