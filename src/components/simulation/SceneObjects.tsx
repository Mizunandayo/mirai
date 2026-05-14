import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAtomValue } from 'jotai'
import { Quaternion, Mesh } from 'three'
import { RigidBody, CuboidCollider, CylinderCollider, type RigidBodyApi } from '@react-three/rapier'
import { sceneGraphAtom } from '../../store/taskAtoms'
import { currentSimFrameAtom, currentFrameAtom } from '../../store/simAtoms'














function CollisionHaloBox({ w, h, d }: { w: number; h: number; d: number }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const wave = 1 + Math.sin(clock.elapsedTime * 16) * 0.03
    ref.current.scale.set(wave, wave, wave)
    const mat = ref.current.material as any
    mat.opacity = 0.12 + (Math.sin(clock.elapsedTime * 16) * 0.5 + 0.5) * 0.22
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[w * 1.03, h * 1.03, d * 1.03]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.18} depthWrite={false} />
    </mesh>
  )
}





function CollisionHaloCylinder({ r, h }: { r: number; h: number }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const wave = 1 + Math.sin(clock.elapsedTime * 16) * 0.03
    ref.current.scale.set(wave, wave, wave)
    const mat = ref.current.material as any
    mat.opacity = 0.12 + (Math.sin(clock.elapsedTime * 16) * 0.5 + 0.5) * 0.22
  })
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[r * 1.03, r * 1.03, h * 1.03, 18]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.18} depthWrite={false} />
    </mesh>
  )
}

export default function SceneObjects() {
  const scene = useAtomValue(sceneGraphAtom)
  const currentFrame = useAtomValue(currentSimFrameAtom)
  const frameNumber = useAtomValue(currentFrameAtom)

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
        const isCollision = currentFrame?.isCollision && currentFrame.collidingObjectId === obj.id

        if (obj.type === 'surface') {
          return (
            <RigidBody key={obj.id} type="fixed" position={[x, y, z]} colliders={false}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial color={color} roughness={0.75} metalness={0} />
              </mesh>
              {isCollision && <CollisionHaloBox w={w} h={h} d={d} />}
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
                <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
              </mesh>
              {isCollision && <CollisionHaloBox w={w} h={h} d={d} />}
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
                <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
              </mesh>
              {isCollision && <CollisionHaloCylinder r={w / 2} h={h} />}
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