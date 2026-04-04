import React, { useState, useEffect, useRef } from 'react';
import type { EgzaminQuestion, LeitnerState } from '../types';
import { LEITNER_BOX_COUNT } from '../constants';
import { getBoxForQuestion, advanceQuestion } from '../helpers';
import { Header } from './Header';
import { ProgressBar } from './ProgressBar';
import { QuestionImageCard } from './QuestionImageCard';
import { AnswerButtonsRow } from './AnswerButtonsRow';

interface LeitnerSessionScreenProps {
  dueQuestions: EgzaminQuestion[];
  leitnerState: LeitnerState;
  onUpdateLeitner: (state: LeitnerState) => void;
  onComplete: (correct: number, incorrect: number, finalState: LeitnerState) => void;
  onBack: () => void;
}

const BOX_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export function LeitnerSessionScreen({ dueQuestions, leitnerState, onUpdateLeitner, onComplete, onBack }: LeitnerSessionScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionIncorrect, setSessionIncorrect] = useState(0);
  const [currentLeitnerState, setCurrentLeitnerState] = useState(leitnerState);

  const currentQuestion = dueQuestions[currentIndex];
  const isSessionComplete = !currentQuestion;

  const sessionCorrectRef = useRef(0);
  const sessionIncorrectRef = useRef(0);
  const leitnerStateRef = useRef(currentLeitnerState);
  sessionCorrectRef.current = sessionCorrect;
  sessionIncorrectRef.current = sessionIncorrect;
  leitnerStateRef.current = currentLeitnerState;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isSessionComplete) {
      onComplete(sessionCorrectRef.current, sessionIncorrectRef.current, leitnerStateRef.current);
    }
  }, [isSessionComplete]);

  if (isSessionComplete) {
    return null;
  }

  const currentBox = getBoxForQuestion(currentLeitnerState, currentQuestion.id);

  const handleAnswer = (label: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(label);

    const isCorrect = label === currentQuestion.correctAnswer;
    const newState = advanceQuestion(currentLeitnerState, currentQuestion.id, isCorrect);
    setCurrentLeitnerState(newState);
    onUpdateLeitner(newState);

    if (isCorrect) setSessionCorrect(c => c + 1);
    else setSessionIncorrect(c => c + 1);
  };

  const handleNext = () => {
    if (currentIndex < dueQuestions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
    } else {
      onComplete(sessionCorrectRef.current, sessionIncorrectRef.current, leitnerStateRef.current);
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <Header
        title="Sesja Leitner"
        onBack={() => {
          if (confirm('Na pewno chcesz przerwać sesję? Postęp zostanie zachowany.')) {
            onBack();
          }
        }}
        rightContent={
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: BOX_COLORS[currentBox - 1] }}></span>
            <span className="text-xs text-white/50">P{currentBox}</span>
          </div>
        }
      />

      <ProgressBar
        current={currentIndex + 1}
        total={dueQuestions.length}
        correct={sessionCorrect}
        incorrect={sessionIncorrect}
        onNavigate={(index) => {
          setCurrentIndex(index);
          setSelectedAnswer(null);
        }}
      />

      <div className="flex-1 px-4 pb-4" style={{paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'}}>
        <div className="max-w-2xl mx-auto space-y-3">
          <QuestionImageCard question={currentQuestion} />

          <AnswerButtonsRow
            answerCount={currentQuestion.answerCount}
            correctAnswer={currentQuestion.correctAnswer}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={handleAnswer}
            showCorrect={selectedAnswer != null}
          />

          {/* Box movement indicator */}
          {selectedAnswer && (
            <div className="mt-3 text-center">
              {selectedAnswer === currentQuestion.correctAnswer ? (
                <div className="text-sm text-green-400">
                  Pudełko {currentBox} &rarr; {Math.min(currentBox + 1, LEITNER_BOX_COUNT)}
                </div>
              ) : (
                <div className="text-sm text-red-400">
                  Pudełko {currentBox} &rarr; 1
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            {selectedAnswer ? (
              <button
                onClick={handleNext}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-base font-bold hover:from-blue-500 hover:to-blue-400 transition-all"
              >
                {currentIndex < dueQuestions.length - 1 ? 'Następne' : 'Zakończ sesję'}
              </button>
            ) : (
              <div className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-base text-center text-white/30">
                Wybierz odpowiedź
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
