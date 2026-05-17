// src/types/export.ts
// Shapes matching the /export/preview and /export/bundle backend responses.
// These are API contracts — keep in sync with server/models/export_schemas.py

// Request shapes

export interface WaypointExport {
  time_ms:       number
  waist_yaw_deg: number
  pitch_angles:  number[]      // one per revolute joint (degrees)
  gripper_open:  boolean
  gripper_force: number        // Newtons
  end_effector:  [number, number, number]
  label:         string
}

export interface ArmSegmentExport {
  id:              string
  name:            string
  length:          number
  mass:            number
  joint:           'fixed' | 'revolute' | 'prismatic'
  joint_limit_min: number
  joint_limit_max: number
  material:        string
}

export interface GripperExport {
  type:  'parallel_jaw' | 'suction_cup' | 'magnetic'
  name:  string
  width: number
  force: number
}

export interface ArmConfigExport {
  name:     string
  segments: ArmSegmentExport[]
  gripper:  GripperExport
  servo_tier?: 'mg995' | 'mg996r' | 'ds3218' | 'industrial'
}

export interface TaskExport {
  task_name:        string
  task_description: string
  waypoints:        WaypointExport[]
}

export interface BundleRequestPayload {
  arm:      ArmConfigExport
  task:     TaskExport
  live_url: string | null
}









// Response shapes 

export interface ExportBOMItem {
  component: string
  qty:       number
  unit_usd:  number
  total_usd: number
  source:    string
  note:      string
}

export interface ExportBOMData {
  arm_name:  string
  items:     ExportBOMItem[]
  total_usd: number
  note:      string
}

export interface ExportPreviewData {
  arduino:      string
  python:       string
  bom:          ExportBOMData
  urdf:         string
  generated_at: string
}

export type ExportPreviewTab = 'arduino' | 'python' | 'bom' | 'urdf'
