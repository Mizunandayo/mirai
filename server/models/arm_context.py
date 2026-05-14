from typing import Any, Dict, List, Tuple

from .schemas import ArmContextDTO, ArmSegmentConfig, GripperConfig


class ArmContextBuilder:
    """Builds Gemini-ready arm context from frontend arm config."""

    @staticmethod
    def _read_segment_value(seg: Any, key: str, fallback: Any) -> Any:
        """Read segment values from either dict payloads or pydantic model instances."""
        if isinstance(seg, dict):
            return seg.get(key, fallback)
        return getattr(seg, key, fallback)

    @staticmethod
    def build_from_frontend_state(arm_segments: List[Any], gripper_type: str) -> ArmContextDTO:
        """
        Convert frontend arm state into ArmContextDTO.

        Args:
            arm_segments: list of segment dicts or pydantic models
            gripper_type: "parallel" | "suction" | "magnetic"
        """
        segments: List[ArmSegmentConfig] = []
        for i, seg in enumerate(arm_segments):
            joint_limits = ArmContextBuilder._read_segment_value(seg, "jointLimits", None)
            if joint_limits is None:
                joint_limits = ArmContextBuilder._read_segment_value(
                    seg,
                    "joint_limits",
                    {"min": -180, "max": 180},
                )

            segments.append(
                ArmSegmentConfig(
                    name=ArmContextBuilder._read_segment_value(seg, "name", f"Segment{i}"),
                    length=float(ArmContextBuilder._read_segment_value(seg, "length", 0.3)),
                    mass=float(ArmContextBuilder._read_segment_value(seg, "mass", 1.0)),
                    joint_limits=joint_limits,
                )
            )

        gripper_configs: Dict[str, Dict[str, Any]] = {
            "parallel": {"type": "parallel", "force_range": {"min": 0, "max": 100}},
            "suction": {"type": "suction", "force_range": {"min": 0, "max": 80}},
            "magnetic": {"type": "magnetic", "force_range": {"min": 0, "max": 120}},
        }

        selected_gripper = gripper_configs.get(gripper_type, gripper_configs["parallel"])
        gripper = GripperConfig(**selected_gripper)

        total_length = sum(seg.length for seg in segments)
        max_reach = total_length * 1.1

        return ArmContextDTO(
            segments=segments,
            gripper=gripper,
            max_reach=max_reach,
            payload_limit=2.0,
            joint_count=len(segments),
        )


class GeminiPromptAssembler:
    """Assembles structured prompts with grounded arm and scene context for Gemini."""

    @staticmethod
    def build_planning_prompt(
        user_input: str,
        arm_context: ArmContextDTO,
        scene_objects: List[str],
    ) -> Tuple[str, str]:
        """Return system and user prompts for task planning."""
        system_prompt = """You are an expert robot motion planner. Convert natural-language requests into safe, executable task JSON only.

Rules:
- Respond with valid JSON only. No markdown, no code fences.
- Allowed step types: move, grip, wait, loop, if.
- Use safe, physically plausible actions for a tabletop robot arm.
- Keep coordinates realistic for the declared reach and scene.

Output schema:
{
  \"taskName\": \"string\",
  \"taskDescription\": \"string\",
  \"steps\": [
    {
      \"stepId\": 1,
      \"type\": \"move\",
      \"targetName\": \"string\",
      \"x\": 0.0,
      \"y\": 0.0,
      \"z\": 0.0,
      \"speed\": 0.5,
      \"approach\": \"linear\"
    },
    {
      \"stepId\": 2,
      \"type\": \"grip\",
      \"action\": \"close\",
      \"force\": 50
    }
  ],
  \"confidenceScore\": 0.0,
  \"warnings\": []
}
"""

        arm_json = arm_context.model_dump(by_alias=True)
        user_prompt = (
            "User task request:\n"
            f"{user_input}\n\n"
            "Arm context:\n"
            f"{arm_json}\n\n"
            "Scene objects:\n"
            f"{scene_objects}\n\n"
            "Generate a complete TaskSpec JSON that satisfies the schema and safety rules."
        )

        return system_prompt, user_prompt
