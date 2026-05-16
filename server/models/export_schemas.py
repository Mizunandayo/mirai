# server/models/export_schemas.py
from __future__ import annotations
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


class SegmentExport(BaseModel):
    id: str
    name: str
    length: float = Field(..., ge=0.01, le=1.5)     #meters
    mass: float   = Field(..., ge=0.05, le=10.0)    #kg
    joint: Literal["fixed", "revolute", "prismatic"]
    joint_limit_min: float = -180.0
    joint_limit_max: float = 180.0
    material: str = "aluminum"


class GripperExport(BaseModel):
    type: Literal["parallel_jaw", "suction_cup", "magnetic"]
    name: str
    width: float = Field(..., ge=0.01, le=0.30)   #meters
    force: float = Field(..., ge=0.0,  le=200.0)  #Newtons


class ArmConfigExport(BaseModel):
    name: str = "Mirai Arm"
    segments: List[SegmentExport] = Field(..., min_length=1, max_length=10)
    gripper: GripperExport

    @field_validator("segments")
    @classmethod
    def at_least_one_revolute(cls, v: list) -> list:
        if not any(s.joint == "revolute" for s in v):
            raise ValueError("Arm must have at least one revolute segment")
        return v
    


class WaypointExport(BaseModel):
    time_ms: float
    waist_yaw_deg: float
    pitch_angles: List[float]     # one per revolute joint (degrees)
    gripper_open: bool
    gripper_force: float          # Newtons
    end_effector: List[float]     # [x, y, z] meters
    label: Optional[str] = None




class TaskExport(BaseModel):
    task_name: str = "Untitled Task"
    task_description: str = ""
    waypoints: List[WaypointExport] = Field(..., min_length=1, max_length=500)


class BundleRequest(BaseModel):
    arm: ArmConfigExport
    task: TaskExport
    live_url: Optional[str] = None    # Vercel URL embedded in QR Code



class BundleManifest(BaseModel):
    task_name: str
    arm_name: str
    generated_at: str
    files: List[str]
    sha256_hash: str
    mirai_version: str = "0.1.0"



