import { useAtom, useAtomValue } from 'jotai'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { armSegmentsAtom, armGripperAtom, selectedSegmentIdAtom } from '../store/atoms'

/** Joint sphere between segments */
function JointSphere({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.045, 16, 16]} />
      <meshStandardMaterial color="#6c6258" metalness={0.38} roughness={0.54} />
    </mesh>
  )
}

/** Parallel jaw gripper end-effector */
function ParallelJawGripper({ yOffset, width }: { yOffset: number; width: number }) {
  const hw = width / 2
  return (
    <group position={[0, yOffset + 0.06, 0]}>
      {/* Palm */}
      <mesh>
        <boxGeometry args={[0.12, 0.06, 0.06]} />
        <meshStandardMaterial color="#7b7066" metalness={0.32} roughness={0.48} />
      </mesh>
      {/* Left finger */}
      <mesh position={[-hw - 0.01, 0.06, 0]}>
        <boxGeometry args={[0.02, 0.08, 0.025]} />
        <meshStandardMaterial color="#b56748" emissive="#e7c4b5" emissiveIntensity={0.08} />
      </mesh>
      {/* Right finger */}
      <mesh position={[hw + 0.01, 0.06, 0]}>
        <boxGeometry args={[0.02, 0.08, 0.025]} />
        <meshStandardMaterial color="#b56748" emissive="#e7c4b5" emissiveIntensity={0.08} />
      </mesh>
    </group>
  )
}

/** Suction cup end-effector */
function SuctionGripper({ yOffset }: { yOffset: number }) {
  return (
    <group position={[0, yOffset + 0.06, 0]}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, 0.08, 16]} />
        <meshStandardMaterial color="#7d756d" metalness={0.24} roughness={0.52} />
      </mesh>
      <mesh position={[0, -0.04, 0]}>
        <sphereGeometry args={[0.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d9e3ec" transparent opacity={0.75} />
      </mesh>
    </group>
  )
}

/** Magnetic end-effector */
function MagneticGripper({ yOffset }: { yOffset: number }) {
  return (
    <group position={[0, yOffset + 0.04, 0]}>
      <mesh>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
        <meshStandardMaterial color="#6c6760" emissive="#d7d0c7" emissiveIntensity={0.06} metalness={0.36} roughness={0.42} />
      </mesh>
    </group>
  )
}

export default function RobotArm() {
  const groupRef = useRef<Group>(null)
  const segments = useAtomValue(armSegmentsAtom)
  const gripper = useAtomValue(armGripperAtom)
  const [selectedId, setSelectedId] = useAtom(selectedSegmentIdAtom)

  // Compute cumulative Y positions for each segment
  const segmentPositions = useMemo(() => {
    const positions: number[] = []
    let y = 0
    segments.forEach((seg) => {
      positions.push(y)
      y += seg.length
    })
    return positions
  }, [segments])

  const totalHeight = segments.reduce((sum, s) => sum + s.length, 0)

  return (
    <group ref={groupRef}>
      {/* Ground mount plate */}
      <mesh position={[0, -0.025, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.24, 0.05, 32]} />
        <meshStandardMaterial color="#cbbba9" metalness={0.4} roughness={0.46} />
      </mesh>

      {/* Segments */}
      {segments.map((seg, i) => {
        const yBase = segmentPositions[i]
        const yCenter = yBase + seg.length / 2
        const isSelected = seg.id === selectedId
        const isBase = seg.joint === 'fixed'

        return (
          <group key={seg.id}>
            {/* Joint indicator (skip base) */}
            {i > 0 && (
              <JointSphere position={[0, yBase, 0]} />
            )}

            {/* Arm link mesh */}
            <mesh
              position={[0, yCenter, 0]}
              castShadow
              onClick={(e: { stopPropagation: () => void }) => {
                e.stopPropagation()
                setSelectedId(isSelected ? null : seg.id)
              }}
            >
              {isBase ? (
                <cylinderGeometry args={[0.14, 0.16, seg.length, 24]} />
              ) : (
                <boxGeometry args={[0.07, seg.length - 0.01, 0.07]} />
              )}
              <meshStandardMaterial
                color={isSelected ? '#b56748' : seg.color}
                emissive={isSelected ? '#e6c1af' : '#000000'}
                emissiveIntensity={isSelected ? 0.14 : 0}
                metalness={0.28}
                roughness={0.38}
              />
            </mesh>

            {/* Segment label indicator (small stripe at top of segment) */}
            {!isBase && (
              <mesh position={[0, yBase + seg.length - 0.015, 0]}>
                <boxGeometry args={[0.075, 0.01, 0.075]} />
                <meshStandardMaterial
                  color={isSelected ? '#b56748' : '#8a98a8'}
                  emissive={isSelected ? '#e6c1af' : '#d8e1ea'}
                  emissiveIntensity={0.08}
                />
              </mesh>
            )}
          </group>
        )
      })}

      {/* Gripper */}
      {gripper.type === 'parallel_jaw' && (
        <ParallelJawGripper yOffset={totalHeight} width={gripper.width} />
      )}
      {gripper.type === 'suction_cup' && (
        <SuctionGripper yOffset={totalHeight} />
      )}
      {gripper.type === 'magnetic' && (
        <MagneticGripper yOffset={totalHeight} />
      )}
    </group>
  )
}