import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAtomValue } from 'jotai'
import { Quaternion, Mesh } from 'three'
import {
  RigidBody,
  CuboidCollider,
  CylinderCollider,
  type RigidBodyApi,
} from '@react-three/rapier'
import { sceneGraphAtom } from '../../store/taskAtoms'
import {
  currentSimFrameAtom,
  currentFrameAtom,
  collisionFlashMsAtom,
} from '../../store/simAtoms'

function CollisionHaloBox({
  w,
  h,
  d,
  active,
  flashMs,
}: {
  w: number
  h: number
  d: number
  active: boolean
  flashMs: number
}) {
  const ref = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.visible = active
    if (!active) return

    const pulse = 0.8 + Math.sin(clock.elapsedTime * 8) * 0.2
    ref.current.scale.set(pulse, pulse, pulse)
    const mat = ref.current.material as any
    mat.opacity = 0.28 + (Math.sin(clock.elapsedTime * 8) * 0.5 + 0.5) * 0.12
  })

  return (
    <mesh ref={ref} visible={false}>
      <boxGeometry args={[w * 1.04, h * 1.04, d * 1.04]} />
      <meshBasicMaterial color="#dc2626" transparent opacity={0.32} depthWrite={false} />
    </mesh>
  )
}

function CollisionHaloCylinder({
  r,
  h,
  active,
  flashMs,
}: {
  r: number
  h: number
  active: boolean
  flashMs: number
}) {
  const ref = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.visible = active
    if (!active) return

    const pulse = 0.8 + Math.sin(clock.elapsedTime * 8) * 0.2
    ref.current.scale.set(pulse, pulse, pulse)
    const mat = ref.current.material as any
    mat.opacity = 0.28 + (Math.sin(clock.elapsedTime * 8) * 0.5 + 0.5) * 0.12
  })

  return (
    <mesh ref={ref} visible={false}>
      <cylinderGeometry args={[r * 1.04, r * 1.04, h * 1.04, 18]} />
      <meshBasicMaterial color="#dc2626" transparent opacity={0.32} depthWrite={false} />
    </mesh>
  )
}

export default function SceneObjects() {
  const scene = useAtomValue(sceneGraphAtom)
  const currentFrame = useAtomValue(currentSimFrameAtom)
  const frameNumber = useAtomValue(currentFrameAtom)
  const flashMs = useAtomValue(collisionFlashMsAtom)

  const frameRef = useRef(currentFrame)
  frameRef.current = currentFrame

  const bodyRefs = useRef<Map<string, RigidBodyApi>>(new Map())
  const prevHeldIdRef = useRef<string | null>(null)
  const gripOffsetRef = useRef<[number, number, number]>([0, 0, 0])

  useEffect(() => {
    if (frameNumber !== 0) return

    prevHeldIdRef.current = null
    gripOffsetRef.current = [0, 0, 0]

    for (const obj of scene.objects) {
      const body = bodyRefs.current.get(obj.id)
      if (!body) continue

      const [x, y, z] = obj.position
      body.setTranslation({ x, y, z }, true)
      body.setRotation(new Quaternion(0, 0, 0, 1), true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, false)
      body.setAngvel({ x: 0, y: 0, z: 0 }, false)
    }
  }, [frameNumber, scene.objects])

  useFrame(() => {
    const frame = frameRef.current
    const currentHeld = frame?.heldObjectId ?? null

    if (frame?.approachTargetId && !currentHeld) {
      const approachBody = bodyRefs.current.get(frame.approachTargetId)
      if (approachBody) {
        const orig = scene.objects.find((o) => o.id === frame.approachTargetId)
        if (orig) {
          const [ox, oy, oz] = orig.position
          approachBody.setTranslation({ x: ox, y: oy, z: oz }, true)
          approachBody.setLinvel({ x: 0, y: 0, z: 0 }, false)
          approachBody.setAngvel({ x: 0, y: 0, z: 0 }, false)
        }
      }
    }

    if (currentHeld !== prevHeldIdRef.current) {
      if (currentHeld && frame?.heldObjectPos) {
        const body = bodyRefs.current.get(currentHeld)
        if (body) {
          const actual = body.translation()
          const [bx, by, bz] = frame.heldObjectPos
          gripOffsetRef.current = [actual.x - bx, actual.y - by, actual.z - bz]
        } else {
          gripOffsetRef.current = [0, 0, 0]
        }
      } else {
        gripOffsetRef.current = [0, 0, 0]
      }

      prevHeldIdRef.current = currentHeld
    }

    if (!currentHeld || !frame?.heldObjectPos) return
    const body = bodyRefs.current.get(currentHeld)
    if (!body) return

    const [bx, by, bz] = frame.heldObjectPos
    const [ox, oy, oz] = gripOffsetRef.current

    body.setTranslation({ x: bx + ox, y: by + oy, z: bz + oz }, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    body.setAngvel({ x: 0, y: 0, z: 0 }, false)
  })

  return (
    <>
      {scene.objects.map((obj) => {
        const [w, h, d] = obj.dimensions
        const [x, y, z] = obj.position
        const color = obj.color ?? '#c8b89a'
        const isCollisionTarget =
          currentFrame?.isCollision && currentFrame.collidingObjectId === obj.id

        if (obj.type === 'surface') {
          return (
            <RigidBody key={obj.id} type="fixed" position={[x, y, z]} colliders={false}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial color={isCollisionTarget ? '#dc2626' : color} roughness={0.75} metalness={0} />
              </mesh>
              <CollisionHaloBox w={w} h={h} d={d} active={Boolean(isCollisionTarget)} flashMs={flashMs} />
              <CuboidCollider args={[w / 2, h / 2, d / 2]} />
            </RigidBody>
          )
        }

        if (obj.type === 'box') {
          return (
            <RigidBody
              key={obj.id}
              ref={(api) => {
                if (api) bodyRefs.current.set(obj.id, api)
                else bodyRefs.current.delete(obj.id)
              }}
              type="dynamic"
              position={[x, y, z]}
              mass={0.15}
              linearDamping={0.8}
              angularDamping={0.9}
              colliders={false}
            >
              <mesh castShadow>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial color={isCollisionTarget ? '#dc2626' : color} roughness={0.6} metalness={0.05} />
              </mesh>
              <CollisionHaloBox w={w} h={h} d={d} active={Boolean(isCollisionTarget)} flashMs={flashMs} />
              <CuboidCollider args={[w / 2, h / 2, d / 2]} restitution={0.1} friction={0.7} />
            </RigidBody>
          )
        }

        if (obj.type === 'cylinder') {
          return (
            <RigidBody
              key={obj.id}
              ref={(api) => {
                if (api) bodyRefs.current.set(obj.id, api)
                else bodyRefs.current.delete(obj.id)
              }}
              type="dynamic"
              position={[x, y, z]}
              mass={0.1}
              linearDamping={0.8}
              angularDamping={0.9}
              colliders={false}
            >
              <mesh castShadow>
                <cylinderGeometry args={[w / 2, w / 2, h, 16]} />
                <meshStandardMaterial color={isCollisionTarget ? '#dc2626' : color} roughness={0.5} metalness={0.1} />
              </mesh>
              <CollisionHaloCylinder r={w / 2} h={h} active={Boolean(isCollisionTarget)} flashMs={flashMs} />
              <CylinderCollider args={[h / 2, w / 2]} restitution={0.05} friction={0.7} />
            </RigidBody>
          )
        }

        if (obj.type === 'zone') {
          return (
            <group key={obj.id} position={[x, y, z]}>
              <mesh>
                <boxGeometry args={[w, h, d]} />
                <meshBasicMaterial color="#4ade80" transparent opacity={0.06} depthWrite={false} />
              </mesh>
            </group>
          )
        }

        return null
      })}

      {scene.targetZones.map((zone) => (
        <mesh key={zone.id} position={zone.position} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[zone.radius * 0.7, zone.radius, 24]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.5} depthWrite={false} side={2} />
        </mesh>
      ))}
    </>
  )
}