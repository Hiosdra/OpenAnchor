import React, { useState } from 'react';
import type { ExamResult } from '../types';
import { CATEGORIES, getCategoryColors } from '../constants';
import { Header } from './Header';
import { CategoryBadge } from './CategoryBadge';
import { QuestionImageCard } from './QuestionImageCard';

interface ResultsScreenProps {
  results: ExamResult[];
  timeTaken: number;
  onBack: () => void;
  onRetry: () => void;
}

export function ResultsScreen({ results, timeTaken, onBack, onRetry }: ResultsScreenProps) {
  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= 70;
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <Header title="Wyniki egzaminu" onBack={onBack} />
      <div className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className={`rounded-3xl p-8 text-center mb-6 ${
            passed
              ? 'bg-gradient-to-br from-green-500/20 to-green-700/10 border border-green-500/20'
              : 'bg-gradient-to-br from-red-500/20 to-red-700/10 border border-red-500/20'
          }`}>
            <div className={`text-5xl font-black mb-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {pct}%
            </div>
            <div className="text-lg font-bold mb-1">
              {passed ? 'Egzamin zdany!' : 'Nie zdano egzaminu'}
            </div>
            <div className="text-sm text-white/40">
              {correct} z {total} poprawnych odpowiedzi
            </div>
            <div className="text-xs text-white/30 mt-2">
              Czas: {minutes}:{seconds.toString().padStart(2, '0')} | Wymagane: 70%
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-6">
            <h3 className="text-sm font-semibold mb-3">Wyniki wg kategorii</h3>
            {Object.values(CATEGORIES).map(cat => {
              const catResults = results.filter(r => r.question.category === cat.id);
              if (catResults.length === 0) return null;
              const catCorrect = catResults.filter(r => r.correct).length;
              const catPct = Math.round((catCorrect / catResults.length) * 100);
              const colors = getCategoryColors(cat.color);
              return (
                <div key={cat.id} className="flex items-center gap-3 py-2">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.dot, flexShrink: 0 }}></span>
                  <span className="text-sm flex-1 truncate">{cat.name}</span>
                  <span className={`text-sm font-bold ${catPct >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                    {catCorrect}/{catResults.length} ({catPct}%)
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white/50 hover:bg-white/10 mb-4"
          >
            {showDetails ? 'Ukryj szczegóły' : 'Pokaż szczegóły pytań'}
          </button>

          {showDetails && (
            <div className="space-y-3 mb-6">
              {results.map((r) => (
                <div key={r.question.id} className={`rounded-2xl p-4 border ${
                  r.correct ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'
                }`}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      r.correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {r.correct ? 'OK' : 'ERR'}
                    </span>
                    <span className="text-xs text-white/30">#{r.question.id}</span>
                    <span className="flex-1"></span>
                    <CategoryBadge categoryId={r.question.category} />
                  </div>
                  {!r.correct && (
                    <>
                      <QuestionImageCard question={r.question} />
                      <div className="text-xs text-white/40 mt-2">
                        <span className="text-red-400">Twoja: {r.userAnswer || 'brak'}</span>
                        {' | '}
                        <span className="text-green-400">Poprawna: {r.question.correctAnswer}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={onRetry}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold hover:from-amber-500 hover:to-amber-400 transition-all"
            >
              Spróbuj ponownie
            </button>
            <button
              onClick={onBack}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white/50 hover:bg-white/10"
            >
              Powrót do menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
