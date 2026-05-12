import { useAtom } from 'jotai'
import { useCallback } from 'react'
import type { ArmSegment, JointType } from '../../types/arm'
import { armSegmentsAtom, selectedSegmentIdAtom } from '../../store/atoms'

const JOINT_LABELS: Record<JointType, string> = {
  revolute: 'Rotary',
  prismatic: 'Linear',
  fixed: 'Base',
}

function SegmentRow({
  segment,
  isSelected,
  isBase,
  onSelect,
  onChange,
  onDelete,
}: {
  segment: ArmSegment
  isSelected: boolean
  isBase: boolean
  onSelect: () => void
  onChange: (updated: Partial<ArmSegment>) => void
  onDelete: () => void
}) {
  return (
    <div
      className={`segment-row ${isSelected ? 'segment-row--selected' : ''}`}
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      {/* Row header */}
      <div className="segment-row-header">
        <div className="segment-indicator" />
        <span className="segment-name">{segment.name}</span>
        <span className="segment-joint-badge">{JOINT_LABELS[segment.joint]}</span>
        {!isBase && (
          <span className="segment-length-badge">
            {(segment.length * 1000).toFixed(0)}mm
          </span>
        )}
        {!isBase && (
          <button
            className="segment-delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            title="Remove segment"
            style={{ cursor: 'pointer' }}
            aria-label={`Remove ${segment.name}`}
          >
            ×
          </button>
        )}
      </div>

      {/* Expanded controls — only when selected */}
      {isSelected && (
        <div className="segment-controls" onClick={(e) => e.stopPropagation()}>
          {/* Length */}
          {!isBase && (
            <div className="control-row">
              <label className="control-label">Length</label>
              <input
                type="range"
                className="control-slider"
                min={0.05}
                max={0.8}
                step={0.01}
                value={segment.length}
                onChange={(e) => onChange({ length: parseFloat(e.target.value) })}
                style={{ cursor: 'pointer' }}
              />
              <span className="control-value">{(segment.length * 1000).toFixed(0)}mm</span>
            </div>
          )}

          {/* Mass */}
          <div className="control-row">
            <label className="control-label">Mass</label>
            <input
              type="range"
              className="control-slider"
              min={0.1}
              max={3.0}
              step={0.05}
              value={segment.mass}
              onChange={(e) => onChange({ mass: parseFloat(e.target.value) })}
              style={{ cursor: 'pointer' }}
            />
            <span className="control-value">{segment.mass.toFixed(2)} kg</span>
          </div>

          {/* Joint type */}
          {!isBase && (
            <div className="control-row">
              <label className="control-label">Joint</label>
              <select
                className="control-select"
                value={segment.joint}
                onChange={(e) => onChange({ joint: e.target.value as JointType })}
                style={{ cursor: 'pointer' }}
              >
                <option value="revolute">Revolute (rotates)</option>
                <option value="prismatic">Prismatic (slides)</option>
              </select>
            </div>
          )}

          {/* Joint limits — only for non-fixed joints */}
          {segment.joint !== 'fixed' && (
            <div className="control-row">
              <label className="control-label">Range</label>
              <div className="joint-limits">
                <input
                  type="number"
                  className="control-input-small"
                  value={segment.jointLimitMin}
                  min={-180}
                  max={0}
                  onChange={(e) => onChange({ jointLimitMin: parseInt(e.target.value) })}
                  title="Min angle (degrees)"
                  style={{ cursor: 'text' }}
                />
                <span className="joint-limits-sep">° to</span>
                <input
                  type="number"
                  className="control-input-small"
                  value={segment.jointLimitMax}
                  min={0}
                  max={180}
                  onChange={(e) => onChange({ jointLimitMax: parseInt(e.target.value) })}
                  title="Max angle (degrees)"
                  style={{ cursor: 'text' }}
                />
                <span className="joint-limits-sep">°</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SegmentList() {
  const [segments, setSegments] = useAtom(armSegmentsAtom)
  const [selectedId, setSelectedId] = useAtom(selectedSegmentIdAtom)

  const handleChange = useCallback(
    (id: string, updates: Partial<ArmSegment>) => {
      setSegments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      )
    },
    [setSegments],
  )

  const handleDelete = useCallback(
    (id: string) => {
      setSegments((prev) => prev.filter((s) => s.id !== id))
      setSelectedId((prev) => (prev === id ? null : prev))
    },
    [setSegments, setSelectedId],
  )

  const handleAdd = useCallback(() => {
    const id = `seg-${Date.now()}`
    const newSeg: ArmSegment = {
      id,
      name: `Segment ${segments.length}`,
      length: 0.25,
      mass: 0.5,
      joint: 'revolute',
      jointLimitMin: -90,
      jointLimitMax: 90,
      material: 'aluminum',
      color: '#cfd6de',
    }
    setSegments((prev) => [...prev, newSeg])
    setSelectedId(id)
  }, [segments.length, setSegments, setSelectedId])

  const motorizedCount = segments.filter((s) => s.joint !== 'fixed').length

  return (
    <div className="segment-list">
      <div className="panel-section-header">
        <span className="segment-count">{motorizedCount} joint{motorizedCount !== 1 ? 's' : ''}</span>
        <button
          className="btn-add-segment"
          onClick={handleAdd}
          disabled={segments.length >= 7}
          title={segments.length >= 7 ? 'Maximum 7 sections' : 'Add section'}
          style={{ cursor: segments.length >= 7 ? 'not-allowed' : 'pointer' }}
        >
          + Add
        </button>
      </div>

      <div className="segment-rows">
        {segments.map((seg) => (
          <SegmentRow
            key={seg.id}
            segment={seg}
            isSelected={seg.id === selectedId}
            isBase={seg.joint === 'fixed'}
            onSelect={() => setSelectedId(seg.id === selectedId ? null : seg.id)}
            onChange={(updates) => handleChange(seg.id, updates)}
            onDelete={() => handleDelete(seg.id)}
          />
        ))}
      </div>
    </div>
  )
}