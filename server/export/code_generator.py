# server/export/code_generator.py
"""
Jinja2-based code generator.
Converts WaypointExport list + ArmConfigExport → .ino and .py source.
"""


from __future__ import annotations
from pathlib import Path
from datetime import datetime, timezone
from typing import Any
from jinja2 import Environment, FileSystemLoader, select_autoescape
from ..models.export_schemas import ArmConfigExport, TaskExport



TEMPLATE_DIR = Path(__file__).parent / "templates"


_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape([]),
    trim_blocks=True,
    lstrip_blocks=True,
)


# Arduino PWM pins (skip 0-8 which are often used for other purposes)
_ARDUINO_PINS   = [9, 10, 11, 12, 13, 5, 6]
_ARDUINO_GRIP   = 3
# PCA9685 channels
_PCA_CHANNELS   = [0, 1, 2, 3, 4, 5, 6]
_PCA_GRIP       = 7






def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _joint_to_servo_int(deg: float, seg_min: float, seg_max: float) -> int:
    """Map joint angle (±degrees) to servo position (0-180)."""
    norm = (deg - seg_min) / max(seg_max - seg_min, 1.0)
    return int(_clamp(norm * 180.0, 0.0, 180.0))





def _build_revolute_segments(arm: ArmConfigExport) -> list[dict]:
    """Extract only revolute segments with pin/channel assignments."""
    revolutes = []
    pin_idx = 0
    for seg in arm.segments:
        if seg.joint == "revolute":
            revolutes.append({
                "name":            seg.name,
                "length":          seg.length,
                "joint_limit_min": seg.joint_limit_min,
                "joint_limit_max": seg.joint_limit_max,
                "servo_pin":       _ARDUINO_PINS[pin_idx % len(_ARDUINO_PINS)],
                "pca_channel":     _PCA_CHANNELS[pin_idx % len(_PCA_CHANNELS)],
            })
            pin_idx += 1
    return revolutes




def _build_waypoint_list(
    task: TaskExport,
    revolute_segs: list[dict],
    sha256: str,
) -> list[dict]:
    waypoints = []
    prev_ms = 0.0

    for wp in task.waypoints:
        duration_ms = max(200, int(wp.time_ms - prev_ms))
        hold_ms     = 150

        # Servo angles for each revolute joint
        servo_angles = []
        for i, seg in enumerate(revolute_segs):
            raw = wp.pitch_angles[i] if i < len(wp.pitch_angles) else 0.0
            servo_angles.append(
                _joint_to_servo_int(raw, seg["joint_limit_min"], seg["joint_limit_max"])
            )

        # Gripper servo: 0 = open, 90 = closed
        gripper_servo = 0 if wp.gripper_open else 90

        waypoints.append({
            "pitch_angles":  [round(a, 2) for a in (wp.pitch_angles[:len(revolute_segs)] or [0.0])],
            "servo_angles":  servo_angles,
            "gripper_servo": gripper_servo,
            "gripper_open":  wp.gripper_open,
            "gripper_force": round(wp.gripper_force, 1),
            "duration_ms":   duration_ms,
            "hold_ms":       hold_ms,
            "label":         wp.label or "",
        })
        prev_ms = wp.time_ms

    return waypoints




def generate_arduino(
        arm: ArmConfigExport,
        task: TaskExport,
        sha256: str,
        generated_at: str,
) -> str:
    revolute_segs = _build_revolute_segments(arm)
    waypoints     = _build_waypoint_list(task, revolute_segs, sha256)

    ctx: dict[str, Any] = {
        "task_name":          task.task_name,
        "arm_name":           arm.name,
        "generated_at":       generated_at,
        "sha256":             sha256,
        "revolute_segments":  revolute_segs,
        "gripper_pin":        _ARDUINO_GRIP,
        "gripper_type":       arm.gripper.type,
        "gripper_open_default": True,
        "waypoints":          waypoints,
    }
    return _env.get_template("arduino.ino.j2").render(**ctx)






def generate_python(
    arm: ArmConfigExport,
    task: TaskExport,
    sha256: str,
    generated_at: str,
) -> str:
    revolute_segs = _build_revolute_segments(arm)
    waypoints     = _build_waypoint_list(task, revolute_segs, sha256)

    ctx: dict[str, Any] = {
        "task_name":         task.task_name,
        "arm_name":          arm.name,
        "generated_at":      generated_at,
        "sha256":            sha256,
        "revolute_segments": revolute_segs,
        "joint_channels":    [s["pca_channel"] for s in revolute_segs],
        "gripper_channel":   _PCA_GRIP,
        "gripper_type":      arm.gripper.type,
        "waypoints":         waypoints,
    }
    return _env.get_template("python_control.py.j2").render(**ctx)