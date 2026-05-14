// src/components/ai-integration/TextInput.tsx

import './text-input.css';



interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isLoading: boolean;
}



export default function TextInput({ value, onChange, onSubmit, isLoading }: TextInputProps) {
  const SendIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m13 7 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const SpinnerIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-btn-spinner">
      <path d="M21 12a9 9 0 1 1-3.6-7.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="text-input-panel">
      <textarea
        className="text-input-area"
        placeholder="Describe a task: 'pick up the blue box and place it on the shelf'"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      />

      <button
        className="text-submit-btn"
        onClick={() => onSubmit(value)}
        disabled={!value.trim() || isLoading}
      >
        {isLoading ? (
          <>
            <SpinnerIcon />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <SendIcon />
            <span>Generate Motion Plan</span>
          </>
        )}
      </button>
    </div>
  );
}