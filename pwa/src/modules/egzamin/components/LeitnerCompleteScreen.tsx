import React from 'react';
import type { EgzaminQuestion, LeitnerState } from '../types';
import { getBoxCounts } from '../helpers';
import { Header } from './Header';

interface LeitnerCompleteScreenProps {
  correct: number;
  incorrect: number;
  leitnerState: LeitnerState;
  questions: EgzaminQuestion[];
  onBack: () => void;
}

const BOX_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
const BOX_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5'];

export function LeitnerCompleteScreen({ correct, incorrect, leitnerState, questions, onBack }: LeitnerCompleteScreenProps) {
  const total = correct + incorrect;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const boxCounts = getBoxCounts(leitnerState, questions);

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <Header title="Sesja zakonczona" onBack={onBack} />

      <div className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-3xl bg-blue-500/10 border border-blue-500/20 p-8 text-center mb-6">
            <div className="text-5xl font-black text-blue-400 mb-2">{pct}%</div>
            <div className="text-lg font-bold mb-1">Sesja zakonczona</div>
            <div className="text-sm text-white/40">
              {correct} poprawnych, {incorrect} błędnych z {total} pytań
            </div>
            <div className="text-xs text-white/30 mt-2">
              {correct + incorrect} pytań w sesji
            </div>
          </div>

          {/* Box distribution */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4">Rozkład pytań w pudełkach</h3>
            <div className="flex gap-2 items-end justify-center h-32 mb-3">
              {boxCounts.map((count, i) => {
                const maxCount = Math.max(...boxCounts, 1);
                const height = (count / maxCount) * 100;
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs font-bold" style={{ color: BOX_COLORS[i] }}>{count}</span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${Math.max(height, 4)}%`,
                        background: BOX_COLORS[i],
                        opacity: count > 0 ? 1 : 0.2,
                      }}
                    />
                    <span className="text-xs text-white/40">{BOX_LABELS[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold hover:from-blue-500 hover:to-blue-400 transition-all"
          >
            Powrót do przeglądu
          </button>
        </div>
      </div>
    </div>
  );
}
