import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { EgzaminQuestion } from '../types';
import type { ExamProgress } from '../../../shared/types/index';
import { CATEGORIES, CATEGORY_IDS } from '../constants';
import { loadLearnPosition, saveLearnPosition } from '../exam-storage';
import { Header } from './Header';
import { ProgressBar } from './ProgressBar';
import { CategorySelector } from './CategorySelector';
import { QuestionImageCard } from './QuestionImageCard';
import { AnswerButtonsRow } from './AnswerButtonsRow';

interface LearnScreenProps {
  questions: EgzaminQuestion[];
  progress: ExamProgress;
  onUpdateProgress: (progress: ExamProgress) => void;
  onBack: () => void;
}

export function LearnScreen({ questions, progress, onUpdateProgress, onBack }: LearnScreenProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CATEGORY_IDS);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQuestions = useMemo(() => {
    let result = questions.filter(q => selectedCategories.includes(q.category));
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(q => String(q.id).toLowerCase().includes(query));
    }
    return result;
  }, [questions, selectedCategories, searchQuery]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const savedPos = loadLearnPosition();
    if (savedPos?.questionId) {
      const index = filteredQuestions.findIndex(q => q.id === savedPos.questionId);
      if (index >= 0) return index;
    }
    return 0;
  });

  const currentQuestion = filteredQuestions[currentIndex];

  useEffect(() => {
    if (currentQuestion) {
      saveLearnPosition(currentQuestion.id);
    }
  }, [currentIndex, currentQuestion]);

  const handleAnswer = useCallback((label: string) => {
    if (selectedAnswer || !currentQuestion) return;
    setSelectedAnswer(label);

    const isCorrect = label === currentQuestion.correctAnswer;
    const newProgress = { ...progress };
    newProgress.answered = { ...progress.answered };
    const previousAnswer = newProgress.answered[currentQuestion.id];
    newProgress.stats = { ...newProgress.stats };
    if (previousAnswer) {
      newProgress.stats.total--;
      if (previousAnswer.correct) newProgress.stats.correct--;
      else newProgress.stats.incorrect--;
    }
    newProgress.answered[currentQuestion.id] = {
      answer: label,
      correct: isCorrect,
      timestamp: Date.now()
    };
    newProgress.stats.total++;
    if (isCorrect) newProgress.stats.correct++;
    else newProgress.stats.incorrect++;
    onUpdateProgress(newProgress);
  }, [selectedAnswer, currentQuestion, progress, onUpdateProgress]);

  const handleNext = useCallback(() => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setCurrentIndex(0);
    }
    setSelectedAnswer(null);
  }, [currentIndex, filteredQuestions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setSelectedAnswer(null);
    }
  }, [currentIndex]);

  if (filteredQuestions.length === 0) {
    return (
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header title="Nauka" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-white/40 text-lg mb-2">Brak pytań</p>
            <p className="text-white/30 text-sm">Brak pytań w wybranych kategoriach</p>
            <button
              onClick={() => setShowCategoryFilter(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm"
            >
              Zmień kategorie
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <Header
        title="Nauka"
        onBack={onBack}
        rightContent={
          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Filtruj kategorie"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>
        }
      />

      <ProgressBar
        current={currentIndex + 1}
        total={filteredQuestions.length}
        correct={progress.stats.correct}
        incorrect={progress.stats.incorrect}
        onNavigate={(index) => {
          setCurrentIndex(index);
          setSelectedAnswer(null);
        }}
      />

      {/* Search input */}
      <div className="px-4 pb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); setSelectedAnswer(null); }}
          placeholder="Szukaj pytania..."
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {showCategoryFilter && (
        <div className="px-4 pb-2">
          <CategorySelector
            categories={CATEGORIES}
            selectedCategories={selectedCategories}
            onToggle={(id) => {
              const newCategories = selectedCategories.includes(id)
                ? selectedCategories.filter(c => c !== id)
                : [...selectedCategories, id];
              setSelectedCategories(newCategories);

              const savedPos = loadLearnPosition();
              if (savedPos?.questionId) {
                const newFiltered = questions.filter(q => newCategories.includes(q.category));
                const index = newFiltered.findIndex(q => q.id === savedPos.questionId);
                setCurrentIndex(index >= 0 ? index : 0);
              } else {
                setCurrentIndex(0);
              }
              setSelectedAnswer(null);
            }}
            onSelectAll={() => {
              setSelectedCategories(CATEGORY_IDS);

              const savedPos = loadLearnPosition();
              if (savedPos?.questionId) {
                const index = questions.findIndex(q => q.id === savedPos.questionId);
                setCurrentIndex(index >= 0 ? index : 0);
              } else {
                setCurrentIndex(0);
              }
            }}
            onDeselectAll={() => setSelectedCategories([])}
          />
        </div>
      )}

      {/* Question */}
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

          <div className="flex gap-3 mt-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-base font-semibold disabled:opacity-20 hover:bg-white/10 transition-all"
            >
              Poprzednie
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-base font-bold hover:from-amber-500 hover:to-amber-400 transition-all"
            >
              {selectedAnswer ? 'Nastepne' : 'Pomin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
