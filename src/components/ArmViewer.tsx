import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei'
import { Suspense, useRef, forwardRef, useImperativeHandle } from 'react'
import { useAtomValue } from 'jotai'
import RobotArm from './RobotArm'
import ReachEnvelope from './ReachEnvelope'
import JointArcOverlay from './JointArcOverlay'
import { showReachEnvelopeAtom, showJointArcsAtom, armSegmentsAtom } from '../store/atoms'

export type ArmViewerHandle = {
  resetCamera: () => void
  setCameraFocus: (level: 0 | 1 | 2) => void
}

/** Derive the 3 focus Y positions from the live segment list */
function useFocusTargets() {
  const segments = useAtomValue(armSegmentsAtom)
  const totalHeight = segments.reduce((sum, s) => sum + s.length, 0)
  return [
    0.04,                  // base  — just above the mounting plate
    totalHeight / 2,       // mid   — exact geometric centre of the arm
    totalHeight + 0.04,    // top   — just above the gripper tip
  ] as const
}






function SceneContent({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) {
  const showReach = useAtomValue(showReachEnvelopeAtom)
  const showArcs = useAtomValue(showJointArcsAtom)
  const focusTargets = useFocusTargets()
  const midY = focusTargets[1]

  return (
    <>
      <PerspectiveCamera makeDefault position={[1.8, 1.2, 2.35]} fov={38} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        maxDistance={5.8}
        minDistance={0.8}
        target={[0, midY, 0]}
      />
          


      {/* Lighting */}
      <ambientLight intensity={0.72} />
      <hemisphereLight args={['#ffffff', '#e6ddd0', 0.75]} />
      <directionalLight
        position={[3.8, 5.6, 4.2]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-3.4, 2.2, -2.5]} intensity={0.22} color="#8aa0b6" />
      <pointLight position={[2.6, 1.4, 2.8]} intensity={0.3} color="#c88b70" />


      {/* Ground grid */}
      <Grid
        args={[10, 10]}
        cellSize={0.2}
        cellThickness={0.35}
        cellColor="#d7d1c8"
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#beb4a8"
        fadeDistance={10}
        fadeStrength={1.2}
        followCamera={false}
        infiniteGrid
      />



      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.003, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#f6f1e9" metalness={0} roughness={1} />
      </mesh>

      {/* Robot Arm */}
      <RobotArm />

      {/* Overlays */}
      {showReach && <ReachEnvelope />}
      {showArcs && <JointArcOverlay />}

    </>
  )
}





const ArmViewer = forwardRef<ArmViewerHandle>((_, ref) => {
  const controlsRef = useRef<any>(null)
  const focusTargets = useFocusTargets()

  useImperativeHandle(ref, () => ({
    resetCamera() {
      controlsRef.current?.reset()
    },
    setCameraFocus(level: 0 | 1 | 2) {
      const ctrl = controlsRef.current
      if (!ctrl) return
      ctrl.target.set(0, focusTargets[level], 0)
      ctrl.update()
    },
  }), [focusTargets])

  return (
    <div className="arm-viewer">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <SceneContent controlsRef={controlsRef} />
        </Suspense>
      </Canvas>
    </div>
  )
})
ArmViewer.displayName = 'ArmViewer'
export default ArmViewer

