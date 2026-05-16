from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Literal




class JointState(BaseModel):
    index: int
    angle_deg: float
    torque_nm: float




class MuJoCoFrame(BaseModel):
    frame_index: int
    time_ms: int
    end_effector_xyz: List[float] = Field(min_length=3, max_length=3)
    joint_states: List[JointState]
    collision: bool = False




class RapierFrameLite(BaseModel):
    frame_index: int
    time_ms: int
    end_effector_xyz: List[float] = Field(min_length=3, max_length=3)
    joint_angles_deg: List[float]




class LifespanEstimate(BaseModel):
    joint_index: int
    predicted_hours: float
    load_ratio: float
    recommendation: str




class DivergenceSummary(BaseModel):
    accuracy_score: float
    max_position_error_m: float
    mean_position_error_m: float
    flagged_frames: List[int]





class MuJoCoRunRequest(BaseModel):
    run_id: str
    arm: dict
    execution_plan: dict
    rapier_frames: List[RapierFrameLite] = []
    target_fps: int = 60
    strict: bool = True




class MuJoCoRunResult(BaseModel):
    status: Literal["ok", "error"]
    message: Optional[str] = None
    total_frames: int = 0
    divergence: Optional[DivergenceSummary] = None
    lifespan: List[LifespanEstimate] = []