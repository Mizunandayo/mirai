import type {
  ArmSegment,
  ValidationResult,
  ValidationWarning,
  ValidationError,
} from '../types/arm'


const G = 9.81                    // m/s²
const SERVO_MAX_TORQUE_NM = 0.92  // MG995: 9.4 kg·cm ≈ 0.92 N·m
const TORQUE_WARN_RATIO = 0.75    // Warn at 75% of max torque
const MAX_PRACTICAL_REACH = 1.5   // meters — practical DIY limit
const REACH_WARN_RATIO = 0.85     // Warn at 85% of max reach




/** Sum of all segment lengths **/
export function calculateMaxReach(segments: ArmSegment[]): number {
  return segments.reduce((sum, s) => sum + s.length, 0)
}



/**
 * Torque at joint[i] with arm fully extended horizontally (worst case).
 * Uses lever rule: T = Σ(m_j × g × d_j) for all joints distal to i.
 */
export function calculateTorqueAtJoint(
    segments: ArmSegment[],
    jointIndex: number,
): number {
    let torque = 0
    let armLength = 0

    for (let i = jointIndex; i < segments.length; i++) {
        const seg = segments[i]
        // Distance from joint i to center of mass of segment i
        const distToCenter = armLength + seg.length / 2
        torque += seg.mass * G * distToCenter
        armLength += seg.length
    }

    return torque
}



export function validateArm(segments: ArmSegment[]): ValidationResult {
    const warnings: ValidationWarning[] = []
    const errors: ValidationError[] = []

    // Guard: need at least one segment
    if (segments.length === 0) {
        errors.push({
            type: 'no_segments',
            message: 'Add at least one segment to validate the arm.',
        })
        return { isValid: false, warnings, errors }
    }

    // Check reach
  const maxReach = calculateMaxReach(segments)
  if (maxReach > MAX_PRACTICAL_REACH) {
    errors.push({
      type: 'reach_exceeded',
      message: `Total reach ${(maxReach * 1000).toFixed(0)}mm exceeds DIY practical limit of ${MAX_PRACTICAL_REACH * 1000}mm. Shorten segments or upgrade to industrial servos.`,
    })
  } else if (maxReach > MAX_PRACTICAL_REACH * REACH_WARN_RATIO) {
    warnings.push({
      type: 'reach_near_limit',
      message: `Reach is ${(maxReach * 1000).toFixed(0)}mm — approaching ${MAX_PRACTICAL_REACH * 1000}mm limit. Verify servo torque at base.`,
      value: maxReach,
      limit: MAX_PRACTICAL_REACH,
    })
  }





// Check torque at each revolute joint
  segments.forEach((seg, i) => {
    if (seg.joint === 'fixed') return

    const torque = calculateTorqueAtJoint(segments, i)
    const ratio = torque / SERVO_MAX_TORQUE_NM

    if (ratio > 1.0) {
      errors.push({
        segmentId: seg.id,
        type: 'torque_exceeded',
        message: `${seg.name}: ${torque.toFixed(2)} N·m exceeds MG995 limit (${SERVO_MAX_TORQUE_NM} N·m). Upgrade to MG996R or DS3218 servo.`,
      })
    } else if (ratio > TORQUE_WARN_RATIO) {
      warnings.push({
        segmentId: seg.id,
        type: 'torque_near_limit',
        message: `${seg.name}: Torque at ${(ratio * 100).toFixed(0)}% of MG995 limit. Operating close to rated torque reduces servo lifespan.`,
        value: torque,
        limit: SERVO_MAX_TORQUE_NM,
      })
    }
  })



  // Check total mass
  const totalMass = segments.reduce((sum, s) => sum + s.mass, 0)
  if (totalMass > 4.0) {
    warnings.push({
      type: 'mass_high',
      message: `Total arm mass ${totalMass.toFixed(1)}kg is high. Consider carbon fiber or 3D-printed links to reduce weight.`,
      value: totalMass,
      limit: 4.0,
    })
  }

  return { isValid: errors.length === 0, warnings, errors }
}