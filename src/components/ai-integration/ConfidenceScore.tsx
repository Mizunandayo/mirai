// src/components/ai-integration/ConfidenceScore.tsx

import { useAtom } from 'jotai';
import { confidenceScoreAtom } from '../../store/aiAtoms';
import './confidence-score.css';


export default function ConfidenceScore() {
  const [confidenceScore] = useAtom(confidenceScoreAtom);

  const scorePercent = Math.round(confidenceScore.overall * 100);
  const scoreColor =
    scorePercent >= 85
      ? '#22c55e'
      : scorePercent >= 70
      ? '#f59e0b'
      : '#991b1b';







  return (
    <div className="confidence-badge">
      <div className="confidence-score" style={{ color: scoreColor }}>
        {scorePercent}%
      </div>
      <div className="confidence-label">Confident</div>

      {confidenceScore.warningFlags.length > 0 && (
        <div className="confidence-warnings">
          {confidenceScore.warningFlags.map((flag, idx) => (
            <div key={idx} className="warning-flag">
              {flag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}