import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  type RigidBodyApi,
  useRapier,
} from '@react-three/rapier'
import { Quaternion, Vector3 } from 'three'
import type { ArmSegment } from '../../types/arm'
import { clampPitchAngles, forwardKinematics } from '../../utils/forwardKinematics'

interface ArmPhysicsRigProps {
  segments: ArmSegment[]
  pitchAngles: number[]
  waistYawDeg: number
  enabled?: boolean
  debug?: boolean
}

type JointMeta = {
  segmentIndex: number
  type: 'revolute' | 'prismatic'
  joint: any
  pitchIndex: number
}

const WORLD_UP = new Vector3(0, 1, 0)
const START = new Vector3()
const END = new Vector3()
const ROTATION = new Quaternion()

const BASE_RADIUS = 0.1
const LINK_WIDTH = 0.062
const JOINT_RADIUS = 0.065
const JOINT_HALF_DEPTH = 0.029
const REVOLUTE_STIFFNESS = 80
const REVOLUTE_DAMPING = 10
const PRISMATIC_STIFFNESS = 70
const PRISMATIC_DAMPING = 9

function buildPitchIndexMap(segments: ArmSegment[]): number[] {
  let idx = 0
  return segments.map((seg) => {
    if (seg.joint === 'fixed') return -1
    const out = idx
    idx += 1
    return out
  })
}

export default function ArmPhysicsRig({
  segments,
  pitchAngles,
  waistYawDeg,
  enabled = true,
  debug = false,
}: ArmPhysicsRigProps) {
  const { world, rapier } = useRapier()
  const bodyRefs = useRef<Array<RigidBodyApi | null>>([])
  const jointsRef = useRef<JointMeta[]>([])
  const createdJointsRef = useRef<any[]>([])

  const pitchIndexMap = useMemo(() => buildPitchIndexMap(segments), [segments])

  useEffect(() => {
    for (const joint of createdJointsRef.current) {
      try {
        world.removeImpulseJoint(joint, true)
      } catch {
        // noop
      }
    }

    createdJointsRef.current = []
    jointsRef.current = []

    if (!enabled) return

    for (let i = 1; i < segments.length; i++) {
      const parent = bodyRefs.current[i - 1]
      const child = bodyRefs.current[i]
      const seg = segments[i]

      if (!parent || !child || seg.joint === 'fixed') continue

      const parentAnchor = { x: 0, y: segments[i - 1].length * 0.5, z: 0 }
      const childAnchor = { x: 0, y: -seg.length * 0.5, z: 0 }

      if (seg.joint === 'revolute') {
        const axis = { x: 0, y: 0, z: 1 }
        const jointData = rapier.JointData.revolute(parentAnchor, childAnchor, axis)

        jointData.limitsEnabled = true
        jointData.limits = [
          (seg.jointLimitMin * Math.PI) / 180,
          (seg.jointLimitMax * Math.PI) / 180,
        ]

        const joint = world.createImpulseJoint(jointData, parent.raw(), child.raw(), true)

        createdJointsRef.current.push(joint)
        jointsRef.current.push({
          segmentIndex: i,
          type: 'revolute',
          joint,
          pitchIndex: pitchIndexMap[i],
        })
      }

      if (seg.joint === 'prismatic') {
        const axis = { x: 0, y: 1, z: 0 }
        const jointData = rapier.JointData.prismatic(parentAnchor, childAnchor, axis)

        jointData.limitsEnabled = true
        jointData.limits = [0, Math.max(0.03, seg.length * 0.35)]

        const joint = world.createImpulseJoint(jointData, parent.raw(), child.raw(), true)

        createdJointsRef.current.push(joint)
        jointsRef.current.push({
          segmentIndex: i,
          type: 'prismatic',
          joint,
          pitchIndex: pitchIndexMap[i],
        })
      }
    }

    return () => {
      for (const joint of createdJointsRef.current) {
        try {
          world.removeImpulseJoint(joint, true)
        } catch {
          // noop
        }
      }

      createdJointsRef.current = []
      jointsRef.current = []
    }
  }, [enabled, segments, pitchIndexMap, rapier, world])

  useFrame(() => {
    if (!enabled || segments.length === 0) return

    const safePitch = clampPitchAngles(segments, pitchAngles)
    const fk = forwardKinematics(segments, safePitch, waistYawDeg)

    for (let i = 0; i < segments.length; i++) {
      const body = bodyRefs.current[i]
      if (!body) continue

      const start = fk.jointPositions[i]
      const end = fk.jointPositions[i + 1]
      if (!start || !end) continue

      const cx = (start[0] + end[0]) * 0.5
      const cy = (start[1] + end[1]) * 0.5
      const cz = (start[2] + end[2]) * 0.5

      START.set(start[0], start[1], start[2])
      END.set(end[0], end[1], end[2])
      const dir = END.clone().sub(START).normalize()

      ROTATION.setFromUnitVectors(WORLD_UP, dir)

      body.setNextKinematicTranslation({ x: cx, y: cy, z: cz })
      body.setNextKinematicRotation(ROTATION)
    }

    for (const meta of jointsRef.current) {
      const joint = meta.joint as any
      if (!joint) continue

      if (meta.type === 'revolute') {
        const angleDeg = safePitch[meta.pitchIndex] ?? 0
        const target = (angleDeg * Math.PI) / 180

        if (typeof joint.configureMotorPosition === 'function') {
          joint.configureMotorPosition(target, REVOLUTE_STIFFNESS, REVOLUTE_DAMPING)
        }
      }

      if (meta.type === 'prismatic') {
        if (typeof joint.configureMotorPosition === 'function') {
          joint.configureMotorPosition(0, PRISMATIC_STIFFNESS, PRISMATIC_DAMPING)
        }
      }
    }
  })

  return (
    <group>
      {segments.map((seg, i) => {
        const isBase = seg.joint === 'fixed'
        const width = isBase ? BASE_RADIUS * 2 : LINK_WIDTH
        const halfHeight = Math.max(seg.length * 0.5 - 0.01, 0.01)
        const hasJointHousing = !isBase

        return (
          <RigidBody
            key={`arm-rig-${seg.id}`}
            ref={(api) => {
              bodyRefs.current[i] = api
            }}
            type="kinematicPosition"
            colliders={false}
            friction={0.85}
            restitution={0.02}
            canSleep={false}
          >
            {isBase ? (
              <CylinderCollider args={[halfHeight, BASE_RADIUS]} />
            ) : (
              <>
                <CuboidCollider args={[width * 0.5, halfHeight, width * 0.5]} />
                {hasJointHousing && (
                  <CylinderCollider
                    args={[JOINT_HALF_DEPTH, JOINT_RADIUS]}
                    position={[0, -halfHeight + JOINT_HALF_DEPTH, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                  />
                )}
              </>
            )}

            {debug && (
              <mesh>
                {isBase ? (
                  <cylinderGeometry args={[BASE_RADIUS, BASE_RADIUS, halfHeight * 2, 20]} />
                ) : (
                  <boxGeometry args={[width, halfHeight * 2, width]} />
                )}
                <meshBasicMaterial
                  color="#0d0d0d"
                  wireframe
                  transparent
                  opacity={0.22}
                />
              </mesh>
            )}
          </RigidBody>
        )
      })}
    </group>
  )
}