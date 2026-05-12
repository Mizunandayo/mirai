import { useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import { armSegmentsAtom, armGripperAtom } from '../../store/atoms'
import { calculateBOM, getTotalBOMCost } from '../../utils/bomPricing'

const SOURCE_LABELS = { aliexpress: 'AliExpress', amazon: 'Amazon', printed: '3D Print' }
const SOURCE_COLORS = { aliexpress: '#8d624d', amazon: '#7e694b', printed: '#5e7964' }

export default function BOMCounter() {
  const segments = useAtomValue(armSegmentsAtom)
  const gripper = useAtomValue(armGripperAtom)
  const [expanded, setExpanded] = useState(false)

  const bom = useMemo(() => calculateBOM(segments, gripper), [segments, gripper])
  const total = useMemo(() => getTotalBOMCost(segments, gripper), [segments, gripper])

  return (
    <div className={`bom-counter${expanded ? ' bom-counter--expanded' : ''}`}>
      <button
        className="bom-summary"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{ cursor: 'pointer' }}
      >
        <div className="bom-label">Estimated cost</div>
        <div className="bom-total">${total.toFixed(2)}</div>
        <div className="bom-expand-icon">{expanded ? '−' : '+'}</div>
      </button>

      {expanded && (
        <div className="bom-breakdown">
          <div className="bom-breakdown-header">Parts in this design</div>
          <div className="bom-items">
            {bom.map((item) => (
              <div key={item.id} className="bom-item">
                <span className="bom-item-name">{item.component}</span>
                <span
                  className="bom-item-source"
                  style={{ color: SOURCE_COLORS[item.source] }}
                >
                  {SOURCE_LABELS[item.source]}
                </span>
                <span className="bom-item-price">${item.totalPrice}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}