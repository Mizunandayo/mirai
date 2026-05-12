import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { armSegmentsAtom } from '../../store/atoms'
import { validateArm, calculateMaxReach, calculateTorqueAtJoint } from '../../utils/armPhysics'

export default function ValidationPanel() {
  const segments = useAtomValue(armSegmentsAtom)
  const result = useMemo(() => validateArm(segments), [segments])
  const maxReach = useMemo(() => calculateMaxReach(segments), [segments])

  const totalMass = segments.reduce((s, seg) => s + seg.mass, 0)
  const activeJoints = segments.filter((s) => s.joint !== 'fixed').length
  const baseTorque = segments.length > 0 ? calculateTorqueAtJoint(segments, 0) : null
  const issueCount = result.errors.length + result.warnings.length

  return (
    <div className="validation-panel">
      <div className="panel-section-header">
        <span>Design check</span>
        <span
          className={`validation-badge ${
            result.isValid ? 'validation-badge--ok' : 'validation-badge--error'
          }`}
        >
          {result.isValid
            ? 'OK'
            : `${issueCount} issue${issueCount !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Metrics */}
      <div className="validation-metrics">
        <div className="metric">
          <span className="metric-label">Max reach</span>
          <div className="metric-value">
            {(maxReach * 1000).toFixed(0)}
            <span className="metric-unit">mm</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-label">Active joints</span>
          <div className="metric-value">
            {activeJoints}
            <span className="metric-unit">joints</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-label">Total mass</span>
          <div className="metric-value">
            {totalMass.toFixed(2)}
            <span className="metric-unit">kg</span>
          </div>
        </div>
        <div className="metric">
          <span className="metric-label">Base torque</span>
          <div className="metric-value">
            {baseTorque !== null ? (
              <>
                {baseTorque.toFixed(1)}
                <span className="metric-unit">N·m</span>
              </>
            ) : (
              <span className="metric-empty">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Blocking errors */}
      {result.errors.length > 0 && (
        <div className="validation-section">
          <div className="validation-section-title error">
            Blocking issues ({result.errors.length})
          </div>
          {result.errors.map((err, i) => (
            <div key={i} className="validation-item validation-item--error">
              <span className="validation-icon validation-icon--error">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6"/>
                  <line x1="8" y1="4.5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="8" cy="11" r="0.9" fill="currentColor"/>
                </svg>
              </span>
              <span className="validation-text">{err.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="validation-section">
          <div className="validation-section-title warning">
            Watch list ({result.warnings.length})
          </div>
          {result.warnings.map((warn, i) => (
            <div key={i} className="validation-item validation-item--warning">
              <span className="validation-icon validation-icon--warning">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M7.13 2.5L1.07 13a1 1 0 00.87 1.5h12.12a1 1 0 00.87-1.5L8.87 2.5a1 1 0 00-1.74 0z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="8" cy="11.5" r="0.8" fill="currentColor"/>
                </svg>
              </span>
              <span className="validation-text">{warn.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* All clear */}
      {result.errors.length === 0 && result.warnings.length === 0 && (
        <div className="validation-ok">
          <span className="validation-icon validation-icon--ok">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6"/>
              <polyline points="4.5,8.5 7,11 11.5,5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span>Configuration stays inside the baseline safety envelope.</span>
        </div>
      )}
    </div>
  )
}
