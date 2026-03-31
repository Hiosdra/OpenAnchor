import React from 'react';
import type { EgzaminQuestion, LeitnerState } from '../types';
import { getDueQuestions, getBoxCounts } from '../helpers';
import { getLeitnerStats } from '../leitner';
import { Header } from './Header';

interface LeitnerOverviewScreenProps {
  questions: EgzaminQuestion[];
  leitnerState: LeitnerState;
  onStartSession: () => void;
  onBack: () => void;
  onReset: () => void;
}

const BOX_LABELS = ['Pudełko 1', 'Pudełko 2', 'Pudełko 3', 'Pudełko 4', 'Pudełko 5'];
const BOX_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
const BOX_INTERVALS = ['Co sesje', 'Co 2 sesje', 'Co 4 sesje', 'Co 8 sesji', 'Co 16 sesji'];

export function LeitnerOverviewScreen({ questions, leitnerState, onStartSession, onBack, onReset }: LeitnerOverviewScreenProps) {
  const boxCounts = getBoxCounts(leitnerState, questions);
  const dueQuestions = getDueQuestions(leitnerState, questions);
  const totalMastered = boxCounts[4];
  const pctMastered = questions.length > 0 ? Math.round((totalMastered / questions.length) * 100) : 0;
  const stats = getLeitnerStats(leitnerState);

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <Header title="Leitner" onBack={onBack} />

      <div className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Progress overview */}
          <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-blue-300">Postep Leitnera</span>
              <span className="text-lg font-bold text-blue-400">{pctMastered}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                style={{ width: `${pctMastered}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xl font-bold">{questions.length}</div>
                <div className="text-xs text-white/40">pytań</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-400">{dueQuestions.length}</div>
                <div className="text-xs text-white/40">do powtórki</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-400">{totalMastered}</div>
                <div className="text-xs text-white/40">opanowanych</div>
              </div>
            </div>
          </div>

          {/* Total reviewed info */}
          <div className="text-xs text-white/30 text-center mb-4">
            {stats.total} pytań w systemie
          </div>

          {/* Box breakdown */}
          <div className="space-y-2 mb-6">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">Pudełka</h3>
            {BOX_LABELS.map((label, i) => {
              const count = boxCounts[i];
              const pct = questions.length > 0 ? (count / questions.length) * 100 : 0;
              return (
                <div key={i} className="rounded-xl bg-white/5 border border-white/5 px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: BOX_COLORS[i] }}></span>
                      <span className="text-sm font-semibold">{label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: BOX_COLORS[i] }}>{count}</span>
                      <span className="text-xs text-white/30 ml-1">pytań</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: BOX_COLORS[i] }}
                    />
                  </div>
                  <div className="text-xs text-white/25">{BOX_INTERVALS[i]}</div>
                </div>
              );
            })}
          </div>

          {/* Start session button */}
          <div className="space-y-3">
            <button
              onClick={onStartSession}
              disabled={dueQuestions.length === 0}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-base hover:from-blue-500 hover:to-blue-400 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                {dueQuestions.length > 0
                  ? `Rozpocznij sesję (${dueQuestions.length} pytań)`
                  : 'Brak pytań do powtórki'}
              </div>
            </button>

            {stats.total > 0 && (
              <button
                onClick={() => {
                  if (confirm('Na pewno chcesz zresetować postęp Leitnera? Wszystkie pytania wrócą do Pudełka 1.')) {
                    onReset();
                  }
                }}
                className="w-full py-3 rounded-2xl text-white/30 text-sm hover:text-white/50 transition-colors"
              >
                Resetuj postęp Leitnera
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
