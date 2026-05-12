import { useRef } from 'react'
import { Group } from 'three'

export default function RobotArm() {
  const armRef = useRef<Group>(null)

  return (
    <group ref={armRef} position={[0, 0, 0]}>
      {/* Base */}
      <mesh position={[0, -0.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 32]} />
        <meshStandardMaterial color="#ff6b35" />
      </mesh>

      {/* Segment 1 */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshStandardMaterial color="#f7931e" />
      </mesh>

      {/* Segment 2 */}
      <mesh position={[0.4, 0.4, 0]} castShadow>
        <boxGeometry args={[0.1, 0.7, 0.1]} />
        <meshStandardMaterial color="#fdb913" />
      </mesh>

      {/* End Effector (Gripper base) */}
      <mesh position={[0.75, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial color="#00d4ff" />
      </mesh>
    </group>
  )
}
