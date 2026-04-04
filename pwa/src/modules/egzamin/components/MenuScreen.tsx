import React, { useMemo } from 'react';
import type { EgzaminQuestion, LeitnerState } from '../types';
import type { ExamProgress } from '../../../shared/types/index';
import { CATEGORIES, getCategoryColors } from '../constants';
import { getDueQuestions, getBoxCounts } from '../helpers';
import { saveProgress } from '../exam-storage';
import { Header } from './Header';

interface MenuScreenProps {
  questions: EgzaminQuestion[];
  progress: ExamProgress;
  leitnerState: LeitnerState;
  onStartLearn: () => void;
  onStartExam: () => void;
  onStartLeitner: () => void;
  onChangePdf: () => void;
}

export function MenuScreen({ questions, progress, leitnerState, onStartLearn, onStartExam, onStartLeitner, onChangePdf }: MenuScreenProps) {
  const totalQ = questions.length;
  const answeredCount = Object.keys(progress.answered).length;
  const correctCount = progress.stats.correct;
  const pctLearned = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach(q => {
      if (!counts[q.category]) counts[q.category] = 0;
      counts[q.category]++;
    });
    return counts;
  }, [questions]);

  const dueCount = getDueQuestions(leitnerState, questions).length;
  const boxCounts = getBoxCounts(leitnerState, questions);
  const masteredCount = boxCounts[4];

  return (
    <>
      <Header title="Egzamin ŻJ / JSM" />
      <div className="relative z-10 max-w-lg md:max-w-2xl mx-auto px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              <path d="M8 7h8M8 11h6"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-1">Egzamin ZJ / JSM</h1>
          <p className="text-sm text-white/40">Baza pytań egzaminacyjnych &middot; {totalQ} pytań</p>
        </div>

        {/* Stats card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white/70">Postęp nauki</span>
            <span className="text-lg font-bold text-amber-400">{pctLearned}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{ width: `${pctLearned}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold">{totalQ}</div>
              <div className="text-xs text-white/40">pytań</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-400">{correctCount}</div>
              <div className="text-xs text-white/40">poprawnych</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-400">{answeredCount}</div>
              <div className="text-xs text-white/40">odpowiedziano</div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">Kategorie</h2>
          <div className="space-y-2">
            {Object.values(CATEGORIES).map(cat => {
              const count = categoryCounts[cat.id] || 0;
              const colors = getCategoryColors(cat.color);
              return (
                <div key={cat.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.dot }}></span>
                    <span className="text-base">{cat.name}</span>
                  </div>
                  <span className="text-sm text-white/40">{count} pytań</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={onStartLearn}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-base hover:from-amber-500 hover:to-amber-400 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              Nauka
            </div>
            <div className="text-xs opacity-70 mt-0.5">Przeglądaj pytania z odpowiedziami</div>
          </button>

          <button
            onClick={onStartExam}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-base hover:bg-white/10 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Egzamin
            </div>
            <div className="text-xs opacity-40 mt-0.5">30 pytań, 45 minut, 70% aby zdać</div>
          </button>

          <button
            onClick={onStartLeitner}
            className="w-full py-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-white font-bold text-base hover:bg-blue-500/15 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <rect x="2" y="6" width="20" height="14" rx="2"/>
                <path d="M2 10h20"/>
                <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>
              </svg>
              <span className="text-blue-300">Leitner</span>
            </div>
            <div className="text-xs text-blue-400/60 mt-0.5">
              Powtórki rozłożone w czasie &middot; {dueCount} do powtórki &middot; {masteredCount} opanowanych
            </div>
          </button>

          {answeredCount > 0 && (
            <button
              onClick={() => {
                if (confirm('Na pewno chcesz zresetować postęp nauki?')) {
                  saveProgress({ answered: {}, stats: { correct: 0, incorrect: 0, total: 0 } });
                  window.location.reload();
                }
              }}
              className="w-full py-3 rounded-2xl text-white/30 text-sm hover:text-white/50 transition-colors"
            >
              Resetuj postęp
            </button>
          )}

          <button
            onClick={() => {
              if (confirm('Na pewno chcesz zmienić plik PDF z bazą pytań?')) {
                onChangePdf();
              }
            }}
            className="w-full py-3 rounded-2xl text-white/30 text-sm hover:text-white/50 transition-colors"
          >
            Zmień bazę pytań (PDF)
          </button>
        </div>
      </div>
    </>
  );
}
