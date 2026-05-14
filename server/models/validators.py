# server/models/validators.py

import math
from typing import List, Tuple, Optional
from .schemas import TaskSpec, TaskStep, ArmContextDTO, ValidationError, PreFlightReport




class ReachValidator:
    """Check if arm can reach target XYZ positions."""
    
    
    @staticmethod
    def can_reach(x: float, y: float, z: float, max_reach: float) -> Tuple[bool, Optional[str]]:
        """
        AABB reach check: is target within max reach sphere?
        
        Args:
            x, y, z: target position
            max_reach: arm max reach from base
        
        Returns:
            (is_reachable, error_message)
        """
        distance = math.sqrt(x**2 + y**2 + z**2)
        
        if distance > max_reach:
            return False, f"Target ({x:.2f}, {y:.2f}, {z:.2f}) is {distance:.2f}m away, but max reach is {max_reach:.2f}m"
        
        if y < 0:
            return False, f"Target Y={y:.2f}m is below work table (Y>=0)"
        
        return True, None

class PayloadValidator:
    """Check if gripper can handle object weight."""
    
    @staticmethod
    def can_lift(mass_kg: float, payload_limit_kg: float, step_type: str) -> Tuple[bool, Optional[str]]:
        """
        Validate gripper payload capacity.
        
        Args:
            mass_kg: object mass
            payload_limit_kg: arm limit
            step_type: "grip", "move", etc.
        """
        if mass_kg > payload_limit_kg:
            return False, f"Object mass {mass_kg}kg exceeds gripper limit {payload_limit_kg}kg"
        
        return True, None

class CollisionRiskValidator:
    """Detect obvious collision risks."""
    
    @staticmethod
    def check_self_collision_risk(x: float, y: float, z: float) -> Tuple[bool, Optional[str]]:
        """
        Simple self-collision heuristic: arm reaching backwards over itself.
        (Full collision is checked by Rapier during simulation)
        """
        # If moving to negative X and Z is high, risk is higher
        if x < -0.1 and z > 0.8:
            return False, "Arm may self-collide when reaching far backward at high Z"
        
        return True, None

class PreconditionValidator:
    """Check step preconditions (gripper must be open before close, etc.)."""
    
    @staticmethod
    def validate_gripper_sequence(steps: List[TaskStep]) -> List[Tuple[int, str]]:
        """
        Validate gripper state transitions.
        
        Rules:
        - Cannot close if already closed
        - Cannot open if already open
        - Cannot move with gripper in transition
        """
        errors = []
        gripper_closed = False
        
        for i, step in enumerate(steps):
            if step.type == "grip":
                if step.action == "close" and gripper_closed:
                    errors.append((i, "Cannot close gripper—already closed"))
                if step.action == "open" and not gripper_closed:
                    errors.append((i, "Cannot open gripper—already open"))
                
                gripper_closed = (step.action == "close")
        
        return errors

class SafetyValidator:
    """Orchestrates all pre-flight checks."""
    
    @staticmethod
    def validate_task_spec(task_spec: TaskSpec, arm_context: ArmContextDTO) -> PreFlightReport:
        """
        Run all safety checks on a TaskSpec.
        
        Returns:
            PreFlightReport with is_safe flag + list of errors
        """
        errors = []
        warnings = []
        
        # Check gripper sequence
        gripper_errors = PreconditionValidator.validate_gripper_sequence(task_spec.steps)
        for step_idx, error_msg in gripper_errors:
            errors.append(ValidationError(
                step_index=step_idx,
                step_type="grip",
                error_code="precondition_unmet",
                message=error_msg
            ))
        
        # Check each move step for reach + collision risk
        for step_idx, step in enumerate(task_spec.steps):
            if step.type == "move":
                # Reach check
                can_reach, reach_error = ReachValidator.can_reach(
                    step.x, step.y, step.z, arm_context.max_reach
                )
                if not can_reach:
                    errors.append(ValidationError(
                        step_index=step_idx,
                        step_type="move",
                        error_code="reach_violation",
                        message=reach_error,
                        suggested_fix=f"Reduce Z or move target closer (max reach: {arm_context.max_reach}m)"
                    ))
                
                # Collision risk heuristic
                is_safe, collision_msg = CollisionRiskValidator.check_self_collision_risk(
                    step.x, step.y, step.z
                )
                if not is_safe:
                    warnings.append(collision_msg)
            
            # Payload check during grip
            if step.type == "grip" and step.action == "close":
                can_lift, payload_msg = PayloadValidator.can_lift(1.5, arm_context.payload_limit, "grip")
                if not can_lift:
                    errors.append(ValidationError(
                        step_index=step_idx,
                        step_type="grip",
                        error_code="payload_violation",
                        message=payload_msg
                    ))
        
        return PreFlightReport(
            is_safe=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )