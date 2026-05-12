import { useAtomValue } from 'jotai'
import { useMemo } from 'react'
import * as THREE from 'three'
import { armSegmentsAtom, selectedSegmentIdAtom } from '../store/atoms'

function ArcLine({
  minDeg,
  maxDeg,
  radius,
  yOffset,
}: {
  minDeg: number
  maxDeg: number
  radius: number
  yOffset: number
}) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    const steps = 48
    const minRad = (minDeg * Math.PI) / 180
    const maxRad = (maxDeg * Math.PI) / 180
    const range = maxRad - minRad

    for (let i = 0; i <= steps; i++) {
      const angle = minRad + (range * i) / steps
      points.push(
        new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius),
      )
    }

    // Close with radial lines back to center
    points.unshift(new THREE.Vector3(0, 0, 0))
    points.push(new THREE.Vector3(0, 0, 0))

    return new THREE.BufferGeometry().setFromPoints(points)
  }, [minDeg, maxDeg, radius])

  return (
    <group position={[0, yOffset, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <lineLoop geometry={geometry}>
        <lineBasicMaterial color="#b56748" transparent opacity={0.55} linewidth={2} />
      </lineLoop>
      {/* Fill arc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 48, (minDeg * Math.PI) / 180, ((maxDeg - minDeg) * Math.PI) / 180]} />
        <meshBasicMaterial
          color="#b56748"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export default function JointArcOverlay() {
  const segments = useAtomValue(armSegmentsAtom)
  const selectedId = useAtomValue(selectedSegmentIdAtom)

  if (!selectedId) return null

  let yOffset = 0
  let targetSeg = null
  let targetY = 0

  for (const seg of segments) {
    if (seg.id === selectedId) {
      targetSeg = seg
      targetY = yOffset
    }
    yOffset += seg.length
  }

  if (!targetSeg || targetSeg.joint === 'fixed') return null

  return (
    <ArcLine
      minDeg={targetSeg.jointLimitMin}
      maxDeg={targetSeg.jointLimitMax}
      radius={0.18}
      yOffset={targetY}
    />
  )
}