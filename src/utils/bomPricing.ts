import type { ArmSegment, GripperConfig, GripperType, BOMItem } from '../types/arm'

// ─── Fixed Costs (every arm pays these) ──────────────────────────────────────

const FIXED_BOM: BOMItem[] = [
  {
    id: 'electronics-controller',
    component: 'Arduino Mega 2560 + USB Cable',
    quantity: 1,
    unitPrice: 18,
    totalPrice: 18,
    source: 'aliexpress',
  },
  {
    id: 'electronics-driver',
    component: 'PCA9685 16-Channel Servo Driver',
    quantity: 1,
    unitPrice: 8,
    totalPrice: 8,
    source: 'aliexpress',
  },
  {
    id: 'electronics-power',
    component: '5V 10A Switching Power Supply',
    quantity: 1,
    unitPrice: 16,
    totalPrice: 16,
    source: 'amazon',
  },
  {
    id: 'wiring-kit',
    component: 'Servo Extension Cable Kit (20pcs)',
    quantity: 1,
    unitPrice: 9,
    totalPrice: 9,
    source: 'aliexpress',
  },
  {
    id: 'hardware-base',
    component: 'Aluminum Base Plate (200x200mm)',
    quantity: 1,
    unitPrice: 14,
    totalPrice: 14,
    source: 'aliexpress',
  },
  {
    id: 'hardware-screws',
    component: 'M3 Screw & Standoff Assortment Kit',
    quantity: 1,
    unitPrice: 7,
    totalPrice: 7,
    source: 'aliexpress',
  },
]

// ─── Per-Segment Costs ────────────────────────────────────────────────────────

const SERVO_PRICE = 13     // MG995 servo
const LINK_PRICE_PER_100MM = 7  // Aluminum extrusion per 100mm
const JOINT_HARDWARE_PRICE = 5  // Bearing + M4 hardware per joint

// ─── Gripper Costs ────────────────────────────────────────────────────────────

const GRIPPER_BOM: Record<GripperType, BOMItem[]> = {
  parallel_jaw: [
    { id: 'g-servo-1', component: 'MG90S Micro Servo ×2 (gripper actuation)', quantity: 2, unitPrice: 5, totalPrice: 10, source: 'aliexpress' },
    { id: 'g-fingers', component: 'Gripper Fingers (3D printed PLA)', quantity: 1, unitPrice: 6, totalPrice: 6, source: 'printed' },
    { id: 'g-frame', component: 'Gripper Frame + Hardware', quantity: 1, unitPrice: 9, totalPrice: 9, source: 'aliexpress' },
  ],
  suction_cup: [
    { id: 'g-pump', component: 'Mini Vacuum Pump 12V', quantity: 1, unitPrice: 14, totalPrice: 14, source: 'aliexpress' },
    { id: 'g-cup', component: 'Silicone Suction Cup 40mm', quantity: 2, unitPrice: 4, totalPrice: 8, source: 'aliexpress' },
    { id: 'g-valve', component: 'Solenoid Valve 12V', quantity: 1, unitPrice: 8, totalPrice: 8, source: 'aliexpress' },
  ],
  magnetic: [
    { id: 'g-magnet', component: 'Electromagnet 5kg Pull Force 12V', quantity: 1, unitPrice: 11, totalPrice: 11, source: 'aliexpress' },
    { id: 'g-relay', component: 'Relay Module 5V', quantity: 1, unitPrice: 4, totalPrice: 4, source: 'aliexpress' },
    { id: 'g-mount', component: 'Magnetic End-Effector Mount (printed)', quantity: 1, unitPrice: 5, totalPrice: 5, source: 'printed' },
  ],
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function calculateBOM(
  segments: ArmSegment[],
  gripper: GripperConfig,
): BOMItem[] {
  const items: BOMItem[] = [...FIXED_BOM]

  // Segment costs (skip base which is structural-only)
  const motorizedSegments = segments.filter((s) => s.joint !== 'fixed')

  motorizedSegments.forEach((seg) => {
    const linkUnits = Math.max(1, Math.ceil((seg.length * 1000) / 100))
    const linkTotal = linkUnits * LINK_PRICE_PER_100MM

    items.push({
      id: `${seg.id}-servo`,
      component: `${seg.name} — MG995 Servo`,
      quantity: 1,
      unitPrice: SERVO_PRICE,
      totalPrice: SERVO_PRICE,
      source: 'aliexpress',
    })
    items.push({
      id: `${seg.id}-link`,
      component: `${seg.name} — Aluminum Link (${linkUnits}×100mm)`,
      quantity: linkUnits,
      unitPrice: LINK_PRICE_PER_100MM,
      totalPrice: linkTotal,
      source: 'aliexpress',
    })
    items.push({
      id: `${seg.id}-joint`,
      component: `${seg.name} — Joint Bearing & Hardware`,
      quantity: 1,
      unitPrice: JOINT_HARDWARE_PRICE,
      totalPrice: JOINT_HARDWARE_PRICE,
      source: 'aliexpress',
    })
  })

  // Gripper
  items.push(...GRIPPER_BOM[gripper.type])

  return items
}

export function getTotalBOMCost(
  segments: ArmSegment[],
  gripper: GripperConfig,
): number {
  return calculateBOM(segments, gripper).reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  )
}

