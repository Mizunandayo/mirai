// src/components/ai-integration/ReActPanel.tsx

import { useEffect, useRef } from 'react';
import { ReActStep } from '../../types/ai';
import './react-panel.css';


interface ReActPanelProps {
  steps: ReActStep[];
}




export default function ReActPanel({ steps }: ReActPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const PhaseLabel = ({ phase }: { phase: ReActStep['phase'] }) => {
    if (phase === 'think') {
      return (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 5a3 3 0 0 1 6 0v2h1a2 2 0 0 1 2 2v6a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a2 2 0 0 1 2-2h1V5Z" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span>Thinking</span>
        </>
      );
    }

    if (phase === 'act') {
      return (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="m13 7 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Acting</span>
        </>
      );
    }

    return (
      <>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span>Observing</span>
      </>
    );
  };

  // Auto-scroll to latest step
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [steps]);

  return (
    <div className="react-panel" ref={containerRef}>
      {steps.length === 0 ? (
        <div className="react-empty">Waiting for agent thinking...</div>
      ) : (
        steps.map((step, idx) => (
          <div key={idx} className={`react-step react-step--${step.phase}`}>
            <div className="react-step-header">
              <PhaseLabel phase={step.phase} />
            </div>
            <div className="react-step-content">{step.content}</div>
          </div>
        ))
      )}
    </div>
  );
}