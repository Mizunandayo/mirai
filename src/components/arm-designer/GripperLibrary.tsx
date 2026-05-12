import { useAtom } from 'jotai'
import type { GripperType } from '../../types/arm'
import { armGripperAtom } from '../../store/atoms'

interface GripperSpec {
  type: GripperType
  name: string
  description: string
  useCase: string
  price: number
  mark: string
}

const GRIPPERS: GripperSpec[] = [
  {
    type: 'parallel_jaw',
    name: 'Parallel Jaw',
    description: 'Two opposing fingers with adjustable width and force.',
    useCase: 'Boxes, bottles, tools',
    price: 25,
    mark: 'PJ',
  },
  {
    type: 'suction_cup',
    name: 'Suction Cup',
    description: 'Vacuum-powered silicone cup. Best for flat smooth surfaces.',
    useCase: 'PCBs, flat objects, glass',
    price: 30,
    mark: 'VC',
  },
  {
    type: 'magnetic',
    name: 'Magnetic',
    description: 'Electromagnet — switch on/off via relay. Instant release.',
    useCase: 'Metal parts, fasteners',
    price: 20,
    mark: 'MG',
  },
]

export default function GripperLibrary() {
  const [gripper, setGripper] = useAtom(armGripperAtom)

  return (
    <div className="gripper-library">
      <div className="gripper-cards">
        {GRIPPERS.map((spec) => {
          const isSelected = gripper.type === spec.type
          return (
            <button
              key={spec.type}
              className={`gripper-card ${isSelected ? 'gripper-card--selected' : ''}`}
              onClick={() =>
                setGripper((prev) => ({
                  ...prev,
                  type: spec.type,
                  name: spec.name,
                }))
              }
              style={{ cursor: 'pointer' }}
              aria-pressed={isSelected}
            >
              <div className="gripper-mark">{spec.mark}</div>
              <div className="gripper-name">{spec.name}</div>
              <div className="gripper-price">${spec.price}</div>
              {isSelected && (
                <div className="gripper-details">
                  <p className="gripper-desc">{spec.description}</p>
                  <p className="gripper-use">Typical work: {spec.useCase}</p>

                  {/* Width control */}
                  <div className="control-row">
                    <label className="control-label">Width</label>
                    <input
                      type="range"
                      className="control-slider"
                      min={0.03}
                      max={0.15}
                      step={0.005}
                      value={gripper.width}
                      onChange={(e) =>
                        setGripper((prev) => ({
                          ...prev,
                          width: parseFloat(e.target.value),
                        }))
                      }
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer' }}
                    />
                    <span className="control-value">{(gripper.width * 1000).toFixed(0)}mm</span>
                  </div>

                  {/* Force control */}
                  <div className="control-row">
                    <label className="control-label">Force</label>
                    <input
                      type="range"
                      className="control-slider"
                      min={5}
                      max={150}
                      step={5}
                      value={gripper.force}
                      onChange={(e) =>
                        setGripper((prev) => ({
                          ...prev,
                          force: parseInt(e.target.value),
                        }))
                      }
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer' }}
                    />
                    <span className="control-value">{gripper.force}N</span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}