import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RigidBodyApi, useRapier } from '@react-three/rapier'
import { Quaternion, Vector3 } from 'three'
import type { ArmSegment } from '../../types/arm'
import { forwardKinematics, clampPitchAngles } from '../../utils/forwardKinematics'




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
const V1 = new Vector3()
const V2 = new Vector3()
const Q = new Quaternion()




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
    // Cleanup previous joints first
    for (const j of createdJointsRef.current) {
      try {
        world.removeImpulseJoint(j, true)
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
        const jd = rapier.JointData.revolute(parentAnchor, childAnchor, axis)
        jd.limitsEnabled = true
        jd.limits = [
          (seg.jointLimitMin * Math.PI) / 180,
          (seg.jointLimitMax * Math.PI) / 180,
        ]

        const j = world.createImpulseJoint(jd, parent.raw(), child.raw(), true)
        createdJointsRef.current.push(j)
        jointsRef.current.push({
          segmentIndex: i,
          type: 'revolute',
          joint: j,
          pitchIndex: pitchIndexMap[i],
        })
      }

      if (seg.joint === 'prismatic') {
        const axis = { x: 0, y: 1, z: 0 }
        const jd = rapier.JointData.prismatic(parentAnchor, childAnchor, axis)
        jd.limitsEnabled = true
        jd.limits = [0, Math.max(0.03, seg.length * 0.35)]

        const j = world.createImpulseJoint(jd, parent.raw(), child.raw(), true)
        createdJointsRef.current.push(j)
        jointsRef.current.push({
          segmentIndex: i,
          type: 'prismatic',
          joint: j,
          pitchIndex: pitchIndexMap[i],
        })
      }
    }

    return () => {
      for (const j of createdJointsRef.current) {
        try {
          world.removeImpulseJoint(j, true)
        } catch {
          // noop
        }
      }
      createdJointsRef.current = []
      jointsRef.current = []
    }
  }, [enabled, segments, pitchIndexMap, rapier, world])



  
  useFrame(() => {
    if (!enabled) return
    if (segments.length === 0) return

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

      V1.set(start[0], start[1], start[2])
      V2.set(end[0], end[1], end[2])
      const dir = V2.clone().sub(V1).normalize()
      Q.setFromUnitVectors(WORLD_UP, dir)

      body.setNextKinematicTranslation({ x: cx, y: cy, z: cz })
      body.setNextKinematicRotation(Q)
    }

    // Keep joint motors aligned with current plan pose
    for (const meta of jointsRef.current) {
      const j = meta.joint as any
      if (!j) continue

      if (meta.type === 'revolute') {
        const angleDeg = safePitch[meta.pitchIndex] ?? 0
        const target = (angleDeg * Math.PI) / 180
        if (typeof j.configureMotorPosition === 'function') {
          j.configureMotorPosition(target, 80, 10)
        }
      }

      if (meta.type === 'prismatic') {
        if (typeof j.configureMotorPosition === 'function') {
          j.configureMotorPosition(0, 70, 9)
        }
      }
    }
  })








  return (
    <group>
      {segments.map((seg, i) => {
        const width = seg.joint === 'fixed' ? 0.10 : 0.062
        const halfHeight = Math.max(seg.length * 0.5 - 0.01, 0.01)

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
            <CuboidCollider args={[width * 0.5, halfHeight, width * 0.5]} />
            {debug && (
              <mesh>
                <boxGeometry args={[width, halfHeight * 2, width]} />
                <meshBasicMaterial color="#0d0d0d" wireframe transparent opacity={0.22} />
              </mesh>
            )}
          </RigidBody>
        )
      })}
    </group>
  )
}