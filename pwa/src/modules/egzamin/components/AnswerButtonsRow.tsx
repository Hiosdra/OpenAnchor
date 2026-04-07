import React from 'react';
import { getAnswerLabels } from '../constants';

interface AnswerButtonsRowProps {
  answerCount: number;
  correctAnswer: string;
  selectedAnswer: string | null;
  onSelectAnswer: (label: string) => void;
  showCorrect: boolean;
}

type AnswerState = 'default' | 'correct' | 'incorrect' | 'selected';

function getState(
  label: string,
  selectedAnswer: string | null,
  correctAnswer: string,
  showCorrect: boolean,
): AnswerState {
  if (!selectedAnswer) return 'default';
  if (showCorrect && label === correctAnswer) return 'correct';
  if (!showCorrect && label === selectedAnswer) return 'selected';
  if (showCorrect && label === selectedAnswer && label !== correctAnswer) return 'incorrect';
  return 'default';
}

export function AnswerButtonsRow({
  answerCount,
  correctAnswer,
  selectedAnswer,
  onSelectAnswer,
  showCorrect,
}: AnswerButtonsRowProps) {
  const labels = getAnswerLabels(answerCount);

  return (
    <div className="flex gap-3">
      {labels.map((label) => {
        const state = getState(label, selectedAnswer, correctAnswer, showCorrect);

        let bgClass: string,
          borderClass: string,
          textClass: string,
          animClass = '';
        switch (state) {
          case 'correct':
            bgClass = 'bg-green-500/20';
            borderClass = 'border-green-500';
            textClass = 'text-green-400';
            animClass = 'correct-btn';
            break;
          case 'incorrect':
            bgClass = 'bg-red-500/20';
            borderClass = 'border-red-500';
            textClass = 'text-red-400';
            animClass = 'incorrect-btn';
            break;
          case 'selected':
            bgClass = 'bg-amber-500/20';
            borderClass = 'border-amber-500';
            textClass = 'text-amber-400';
            break;
          default:
            bgClass = 'bg-white/5';
            borderClass = 'border-white/15';
            textClass = 'text-white';
        }

        const icon =
          state === 'correct' ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="24"
              height="24"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : state === 'incorrect' ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="24"
              height="24"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <span className="text-lg font-bold">{label}</span>
          );

        return (
          <button
            key={label}
            onClick={() => !selectedAnswer && onSelectAnswer(label)}
            disabled={!!selectedAnswer}
            className={`answer-btn flex-1 h-14 sm:h-16 rounded-2xl border-2 flex items-center justify-center ${bgClass} ${borderClass} ${textClass} ${animClass} disabled:cursor-default`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
