import React from 'react';

interface ResetButtonProps {
  label: string;
  confirmMessage: string;
  onReset: () => void;
}

export function ResetButton({ label, confirmMessage, onReset }: ResetButtonProps) {
  const handleClick = () => {
    if (confirm(confirmMessage)) {
      onReset();
    }
  };

  return (
    <button className="reset-btn" onClick={handleClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
      {label}
    </button>
  );
}
