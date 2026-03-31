import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  correct: number;
  incorrect: number;
  onNavigate?: (index: number) => void;
}

export function ProgressBar({ current, total, correct, incorrect, onNavigate }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onNavigate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedPct = x / rect.width;
    const targetIndex = Math.floor(clickedPct * total);
    const clampedIndex = Math.max(0, Math.min(total - 1, targetIndex));
    onNavigate(clampedIndex);
  };

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between text-sm text-white/40 mb-1.5 gap-2">
        <span className="whitespace-nowrap">Pytanie {current} / {total}</span>
        <div className="flex gap-2 sm:gap-3 whitespace-nowrap">
          <span className="text-green-400">{correct} OK</span>
          <span className="text-red-400">{incorrect} Err</span>
        </div>
      </div>
      <div
        className={`h-1 bg-white/5 rounded-full overflow-hidden ${onNavigate ? 'cursor-pointer hover:h-2 transition-all' : ''}`}
        onClick={handleClick}
      >
        <div
          className="progress-fill h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
