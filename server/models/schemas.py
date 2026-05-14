# server/models/schemas.py

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator



class ArmSegmentConfig(BaseModel):
    """Arm segment description for Gemini context."""
    model_config = ConfigDict(populate_by_name=True)

    name: str
    length: float
    mass: float
    joint_limits: Dict[str, float] = Field(
        default_factory=lambda: {"min": -180, "max": 180},
        validation_alias="jointLimits",
        serialization_alias="jointLimits",
    )


class GripperConfig(BaseModel):
    """Gripper specification."""
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["parallel", "suction", "magnetic"]
    force_range: Dict[str, float] = Field(
        default_factory=lambda: {"min": 0, "max": 100},
        validation_alias="forceRange",
        serialization_alias="forceRange",
    )


class ArmContextDTO(BaseModel):
    """Complete arm state serialized for Gemini prompt."""
    model_config = ConfigDict(populate_by_name=True)

    segments: List[ArmSegmentConfig]
    gripper: GripperConfig
    max_reach: float = Field(..., validation_alias="maxReach", serialization_alias="maxReach")
    payload_limit: float = Field(..., validation_alias="payloadLimit", serialization_alias="payloadLimit")
    joint_count: int = Field(default=0, validation_alias="jointCount", serialization_alias="jointCount")


class TaskStep(BaseModel):
    """Single step in a task."""
    model_config = ConfigDict(populate_by_name=True)

    step_id: int = Field(..., validation_alias="stepId", serialization_alias="stepId")
    type: Literal["move", "grip", "wait", "loop", "if"]
    
    # Move step fields
    target_name: Optional[str] = Field(default=None, validation_alias="targetName", serialization_alias="targetName")
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None
    speed: Optional[float] = 0.5
    approach: Optional[str] = "linear"
    
    # Grip step fields
    action: Optional[Literal["open", "close"]] = None
    force: Optional[float] = None
    
    # Wait step fields
    duration_ms: Optional[int] = Field(default=None, validation_alias="durationMs", serialization_alias="durationMs")
    
    # Validation
    @field_validator("speed")
    @classmethod
    def validate_speed(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0.1 <= v <= 2.0):
            raise ValueError("Speed must be 0.1–2.0")
        return v



class TaskSpecRequest(BaseModel):
    """Request from frontend to generate a task from natural language."""
    model_config = ConfigDict(populate_by_name=True)

    user_input: str = Field(
        ...,
        min_length=5,
        max_length=500,
        validation_alias="userInput",
        serialization_alias="userInput",
    )
    arm_context: ArmContextDTO = Field(..., validation_alias="armContext", serialization_alias="armContext")
    scene_objects: List[str] = Field(..., validation_alias="sceneObjects", serialization_alias="sceneObjects")
    allowed_verbs: List[str] = Field(..., validation_alias="allowedVerbs", serialization_alias="allowedVerbs")



class ReActStep(BaseModel):
    """Single streaming step in ReAct loop."""
    phase: Literal["think", "act", "observe"]
    content: str



class TaskSpec(BaseModel):
    """Complete task specification returned by Gemini."""
    model_config = ConfigDict(populate_by_name=True)

    task_name: str = Field(..., validation_alias="taskName", serialization_alias="taskName")
    task_description: str = Field(..., validation_alias="taskDescription", serialization_alias="taskDescription")
    steps: List[TaskStep]
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        validation_alias="confidenceScore",
        serialization_alias="confidenceScore",
    )
    warnings: List[str] = Field(default_factory=list)



class ValidationError(BaseModel):
    """Pre-flight validation failure."""
    step_index: int
    step_type: str
    error_code: Literal["reach_violation", "payload_violation", "collision_risk", "precondition_unmet"]
    message: str
    suggested_fix: Optional[str] = None



class PreFlightReport(BaseModel):
    """Result of safety validation."""
    is_safe: bool
    errors: List[ValidationError] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)




class RepairRequest(BaseModel):
    """Request to fix failing task."""
    model_config = ConfigDict(populate_by_name=True)

    task_spec: TaskSpec = Field(..., validation_alias="taskSpec", serialization_alias="taskSpec")
    failures: List[ValidationError]
    arm_context: ArmContextDTO = Field(..., validation_alias="armContext", serialization_alias="armContext")