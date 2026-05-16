from __future__ import annotations
from typing import List
import math
from server.models.mujoco_schemas import MuJoCoFrame, RapierFrameLite, DivergenceSummary, LifespanEstimate








def compute_divergence(mujoco_frames: List[MuJoCoFrame], rapier_frames: List[RapierFrameLite]) -> DivergenceSummary:
    n = min(len(mujoco_frames), len(rapier_frames))
    if n == 0:
        return DivergenceSummary(
            accuracy_score=0.0,
            max_position_error_m=0.0,
            mean_position_error_m=0.0,
            flagged_frames=[],
        )

    errors = []
    flagged = []
    threshold = 0.035

    for i in range(n):
        mx, my, mz = mujoco_frames[i].end_effector_xyz
        rx, ry, rz = rapier_frames[i].end_effector_xyz
        e = math.sqrt((mx - rx) ** 2 + (my - ry) ** 2 + (mz - rz) ** 2)
        errors.append(e)
        if e > threshold:
            flagged.append(i)

    mean_e = sum(errors) / len(errors)
    max_e = max(errors)
    # Higher is better, bounded [0,1]
    accuracy = max(0.0, min(1.0, 1.0 - (mean_e / 0.08)))

    return DivergenceSummary(
        accuracy_score=round(accuracy, 4),
        max_position_error_m=round(max_e, 5),
        mean_position_error_m=round(mean_e, 5),
        flagged_frames=flagged,
    )







def estimate_servo_lifespan(mujoco_frames: List[MuJoCoFrame]) -> List[LifespanEstimate]:
    # Simple physically-informed heuristic for hackathon demo.
    # Replace with calibrated curve from vendor data post-hackathon.
    if not mujoco_frames:
        return []

    by_joint = {}
    for f in mujoco_frames:
        for js in f.joint_states:
            by_joint.setdefault(js.index, []).append(abs(js.torque_nm))

    out = []
    for idx, torques in by_joint.items():
        peak = max(torques) if torques else 0.0
        avg = sum(torques) / max(1, len(torques))
        rated = 2.8
        load_ratio = min(2.0, avg / rated)
        # Inverse-square style degradation model
        hours = max(30.0, 1200.0 / ((load_ratio + 0.2) ** 2))

        if load_ratio > 0.9:
            rec = "Reduce speed by 20% or increase arm segment stiffness."
        elif load_ratio > 0.7:
            rec = "Moderate load. Consider torque headroom for long duty cycles."
        else:
            rec = "Healthy operating range."

        out.append(
            LifespanEstimate(
                joint_index=idx,
                predicted_hours=round(hours, 1),
                load_ratio=round(load_ratio, 3),
                recommendation=rec,
            )
        )
    return sorted(out, key=lambda x: x.joint_index)