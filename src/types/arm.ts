// Joint & Material
export type JointType = 'revolute' | 'prismatic' | 'fixed'
export type MaterialType = 'aluminum' | 'steel' | 'plastic' | 'carbon_fiber'
export type GripperType = 'parallel_jaw' | 'suction_cup' | 'magnetic'


// Arm Segment
export interface ArmSegment {
  id: string
  name: string
  length: number          // meters — valid range: 0 (base) to 1.0
  mass: number            // kg — valid range: 0.1 to 5.0
  joint: JointType
  jointLimitMin: number   // degrees — typically -180 to 0
  jointLimitMax: number   // degrees — typically 0 to 180
  material: MaterialType
  color: string           // hex, e.g. "#475569"
}




// Gripper
export interface GripperConfig {
    id: string
    type: GripperType
    name: string
    width: number            // meters - jaw opening width
    force: number            // Newtons - gripping force
}



// BOM
export type BOMSource = 'aliexpress' | 'amazon' | 'printed'

export interface BOMItem {
    id: string
    component: string
    quantity: number
    unitPrice: number
    totalPrice: number
    source: BOMSource
}



// Validation
export type ValidationWarningType =
     | 'torque_near_limit'
     | 'reach_near_limit'
     | 'mass_high'
     | 'joint_range_small'


export type ValidationErrorType =
     | 'torque_exceeded'
     | 'reach_exceeded'
     | 'no_segments'


export interface ValidationWarning {
    segmentId?: string
    type: ValidationWarningType
    message: string
    value: number
    limit: number
}


export interface ValidationError {
    segmentId?: string
    type: ValidationErrorType
    message: string
}


export interface ValidationResult {
    isValid: boolean
    warnings: ValidationWarning[]
    errors: ValidationError[]
}





// Arm Config (Save/load)
export interface ArmConfig {
    version: '1.0'
    name: string
    createdAt: string    // ISO 8601
    segments: ArmSegment[]
    gripper: GripperConfig
}





