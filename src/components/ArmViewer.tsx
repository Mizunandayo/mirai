import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import RobotArm from './RobotArm'

export default function ArmViewer() {
  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera position={[0, 0, 3]} makeDefault />
        <OrbitControls 
          autoRotate 
          autoRotateSpeed={2}
          maxDistance={10}
          minDistance={1}
        />
        
        <Physics enabled={false}>
          <RobotArm />
        </Physics>

        <Grid args={[10, 10]} fadeDistance={10} fadeStrength={1} />
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
      </Canvas>
    </div>
  )
}
