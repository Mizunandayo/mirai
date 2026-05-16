export type MuJoCoJointState = {
  index: number
  angle_deg: number
  torque_nm: number
}



export type MuJoCoFrame = {
  frame_index: number
  time_ms: number
  end_effector_xyz: [number, number, number]
  joint_states: MuJoCoJointState[]
  collision: boolean
}



export type DivergenceSummary = {
  accuracy_score: number
  max_position_error_m: number
  mean_position_error_m: number
  flagged_frames: number[]
}



export type LifespanEstimate = {
  joint_index: number
  predicted_hours: number
  load_ratio: number
  recommendation: string
}



export type MuJoCoRunResult = {
  status: "ok" | "error"
  message?: string
  total_frames: number
  divergence?: DivergenceSummary
  lifespan: LifespanEstimate[]
}