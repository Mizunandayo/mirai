import type { ArmSegment, GripperConfig, GripperType, BOMItem, BOMSource } from '../types/arm'
import type { ServoTier } from '../store/atoms'
import bomCatalog from '../data/bomCatalog.json'

type CatalogComponent = {
  name: string
  unit: number
  source: BOMSource
}

type CatalogPart = CatalogComponent & {
  qty: number
}

type CatalogShape = {
  note: string
  components: Record<string, CatalogComponent>
  structure: {
    fixed_base: CatalogComponent
    revolute_link: CatalogComponent
  }
  gripperParts: Record<GripperType, CatalogPart[]>
}

const catalog = bomCatalog as CatalogShape

const SERVO_BOM_BY_TIER: Record<ServoTier, { name: string; unit: number; source: BOMSource }> = {
  mg995: {
    name: 'MG995 Servo (9.4kg·cm)',
    unit: 7.0,
    source: 'aliexpress',
  },
  mg996r: {
    name: catalog.components.servo_revolute.name,
    unit: catalog.components.servo_revolute.unit,
    source: catalog.components.servo_revolute.source,
  },
  ds3218: {
    name: 'DS3218 High Torque Servo (20kg·cm)',
    unit: 13.5,
    source: 'amazon',
  },
  industrial: {
    name: 'Industrial Servo Module (150kg·cm class)',
    unit: 68.0,
    source: 'amazon',
  },
}

function toBOMItem(
  id: string,
  component: string,
  quantity: number,
  unitPrice: number,
  source: BOMSource,
): BOMItem {
  return {
    id,
    component,
    quantity,
    unitPrice,
    totalPrice: roundMoney(unitPrice * quantity),
    source,
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function calculateBOM(
  segments: ArmSegment[],
  gripper: GripperConfig,
  servoTier: ServoTier = 'mg996r',
): BOMItem[] {
  const items: BOMItem[] = []
  const revoluteCount = segments.filter((segment) => segment.joint === 'revolute').length

  if (revoluteCount > 0) {
    const servo = SERVO_BOM_BY_TIER[servoTier]
    items.push(
      toBOMItem('servo-revolute', servo.name, revoluteCount, servo.unit, servo.source),
    )
  }

  for (const [index, part] of catalog.gripperParts[gripper.type].entries()) {
    items.push(
      toBOMItem(`gripper-${gripper.type}-${index}`, part.name, part.qty, part.unit, part.source),
    )
  }

  segments.forEach((segment) => {
    if (segment.joint === 'fixed') {
      items.push(
        toBOMItem(
          `${segment.id}-base`,
          `${catalog.structure.fixed_base.name} (${(segment.length * 100).toFixed(0)}cm)`,
          1,
          catalog.structure.fixed_base.unit,
          catalog.structure.fixed_base.source,
        ),
      )
      return
    }

    if (segment.joint === 'revolute') {
      items.push(
        toBOMItem(
          `${segment.id}-link`,
          `${catalog.structure.revolute_link.name} (${(segment.length * 100).toFixed(0)}cm)`,
          1,
          catalog.structure.revolute_link.unit,
          catalog.structure.revolute_link.source,
        ),
      )
    }
  })

  const fixedComponents = [
    ['pca9685', 'electronics-driver'],
    ['arduino_nano', 'electronics-controller'],
    ['power_5v', 'electronics-power'],
    ['bearings', 'hardware-bearings'],
    ['screws', 'hardware-screws'],
    ['jumper_wires', 'wiring-kit'],
    ['usb_cable', 'usb-cable'],
  ] as const

  for (const [catalogKey, itemId] of fixedComponents) {
    const component = catalog.components[catalogKey]
    items.push(toBOMItem(itemId, component.name, 1, component.unit, component.source))
  }

  return items
}

export function getTotalBOMCost(
  segments: ArmSegment[],
  gripper: GripperConfig,
  servoTier: ServoTier = 'mg996r',
): number {
  return roundMoney(calculateBOM(segments, gripper, servoTier).reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  ))
}

