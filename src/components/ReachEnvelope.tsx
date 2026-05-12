import { useAtomValue } from 'jotai'
import { useMemo } from 'react'
import { armSegmentsAtom } from '../store/atoms'
import { calculateMaxReach } from '../utils/armPhysics'




export default function ReachEnvelope() {
    const segments = useAtomValue(armSegmentsAtom)
    const maxReach = useMemo(() => calculateMaxReach(segments), [segments])

    if (maxReach <= 0) return null

    return (
        <group>
            {/* Outer reach spehere - wireframe*/}
            <mesh>
                <sphereGeometry args={[maxReach, 20, 16]} />
                <meshBasicMaterial
                   color="#99aaba"
                   wireframe
                   transparent
                   opacity={0.16}
                   />
            </mesh>

            {/* 80% reach sphere - inner reference */}
      <mesh>
        <sphereGeometry args={[maxReach * 0.8, 16, 12]} />
        <meshBasicMaterial
          color="#d7dee4"
          wireframe
          transparent
          opacity={0.1}
        />
      </mesh>


      {/* Equatorial rings for orientation reference */}
      <mesh rotation={[0, 0, 0]}>
         <torusGeometry args={[maxReach, 0.003, 4, 64]} />
         <meshBasicMaterial color="#8e9ead" transparent opacity={0.16}/>
         </mesh>
         <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[maxReach, 0.003, 4, 64]} />
          <meshBasicMaterial color="#8e9ead" transparent opacity={0.16}/>
      </mesh>
        </group>
    )
}