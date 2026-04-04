import React, { useState, useEffect } from 'react';
import type { EgzaminQuestion, ExamResult } from '../types';
import { Header } from './Header';
import { ProgressBar } from './ProgressBar';
import { QuestionImageCard } from './QuestionImageCard';
import { AnswerButtonsRow } from './AnswerButtonsRow';

interface ExamScreenProps {
  questions: EgzaminQuestion[];
  onFinish: (results: ExamResult[], timeTaken: number) => void;
  onBack: () => void;
}

const EXAM_TIME_MINUTES = 45;

export function ExamScreen({ questions, onFinish, onBack }: ExamScreenProps) {
  const EXAM_QUESTION_COUNT = Math.min(30, questions.length);

  const [examQuestions] = useState<EgzaminQuestion[]>(() => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, EXAM_QUESTION_COUNT);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME_MINUTES * 60);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinished]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (label: string) => {
    setAnswers(prev => ({ ...prev, [examQuestions[currentIndex].id]: label }));
  };

  const handleFinishExam = () => {
    const results: ExamResult[] = examQuestions.map(q => ({
      question: q,
      userAnswer: answers[q.id] || null,
      correct: answers[q.id] === q.correctAnswer,
    }));
    onFinish(results, EXAM_TIME_MINUTES * 60 - timeLeft);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isFinished) {
      handleFinishExam();
    }
  }, [isFinished]);

  if (isFinished) {
    return null;
  }

  const currentQuestion = examQuestions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const timeWarning = timeLeft < 300;

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <Header
        title="Egzamin"
        onBack={() => {
          if (confirm('Na pewno chcesz przerwać egzamin? Postęp zostanie utracony.')) {
            onBack();
          }
        }}
        rightContent={
          <div className={`px-3 py-1.5 rounded-xl text-sm font-mono font-bold ${
            timeWarning ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/60'
          }`}>
            {formatTime(timeLeft)}
          </div>
        }
      />

      <ProgressBar
        current={currentIndex + 1}
        total={examQuestions.length}
        correct={answeredCount}
        incorrect={0}
      />

      <div className="flex-1 px-4 pb-4" style={{paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'}}>
        <div className="max-w-2xl mx-auto space-y-3">
          <QuestionImageCard question={currentQuestion} />

          <AnswerButtonsRow
            answerCount={currentQuestion.answerCount}
            correctAnswer={currentQuestion.correctAnswer}
            selectedAnswer={answers[currentQuestion.id] || null}
            onSelectAnswer={handleAnswer}
            showCorrect={false}
          />

          {/* Question navigation dots */}
          <div className="grid gap-2 mt-3 justify-center" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(2.75rem, 1fr))'}}>
            {examQuestions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`min-w-[2.75rem] min-h-[2.75rem] rounded-lg text-xs font-bold transition-all ${
                  i === currentIndex
                    ? 'bg-amber-500 text-white'
                    : answers[q.id]
                      ? 'bg-white/15 text-white/60'
                      : 'bg-white/5 text-white/25'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-base font-semibold disabled:opacity-20 hover:bg-white/10 transition-all"
            >
              Poprzednie
            </button>
            {currentIndex < examQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(i => i + 1)}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-base font-bold hover:from-amber-500 hover:to-amber-400 transition-all"
              >
                Następne
              </button>
            ) : (
              <button
                onClick={() => {
                  const unanswered = examQuestions.length - answeredCount;
                  if (unanswered > 0) {
                    if (!confirm(`Masz ${unanswered} pytań bez odpowiedzi. Na pewno chcesz zakończyć?`)) return;
                  }
                  handleFinishExam();
                }}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-500 text-base font-bold hover:from-green-500 hover:to-green-400 transition-all"
              >
                Zakończ ({answeredCount}/{examQuestions.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
