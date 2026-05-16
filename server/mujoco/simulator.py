from __future__ import annotations
from typing import Iterator
import math
import mujoco
from .mjcf_builder import build_mjcf_from_arm
from server.models.mujoco_schemas import MuJoCoFrame, JointState




def _safe_float(v: float, default: float = 0.0) -> float:
    try:
        return float(v)
    except Exception:
        return default





def run_mujoco_frames(arm: dict, execution_plan: dict, target_fps: int = 60) -> Iterator[MuJoCoFrame]:
    mjcf = build_mjcf_from_arm(arm)
    model = mujoco.MjModel.from_xml_string(mjcf)
    data = mujoco.MjData(model)

    frames = execution_plan.get("frames", [])
    if not isinstance(frames, list):
        frames = []

    dt_ms = int(1000 / max(1, target_fps))

    for i, frame in enumerate(frames):
        pitch_angles = frame.get("pitchAngles", []) or frame.get("pitch_angles", [])
        if not isinstance(pitch_angles, list):
            pitch_angles = []

        for j, ang in enumerate(pitch_angles):
            if j < model.nq:
                data.qpos[j] = math.radians(_safe_float(ang))

        mujoco.mj_forward(model, data)

        ee = frame.get("endEffector", {}) if isinstance(frame, dict) else {}
        ee_xyz = [
            _safe_float(ee.get("x", 0.0)),
            _safe_float(ee.get("y", 0.0)),
            _safe_float(ee.get("z", 0.0)),
        ]

        joint_states = []
        for j in range(min(model.nv, len(pitch_angles))):
            torque = _safe_float(data.qfrc_inverse[j] if j < len(data.qfrc_inverse) else 0.0)
            joint_states.append(JointState(index=j, angle_deg=_safe_float(pitch_angles[j]), torque_nm=torque))

        yield MuJoCoFrame(
            frame_index=i,
            time_ms=i * dt_ms,
            end_effector_xyz=ee_xyz,
            joint_states=joint_states,
            collision=bool(frame.get("collision", False)),
        )