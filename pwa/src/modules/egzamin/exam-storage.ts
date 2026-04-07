/**
 * Egzamin module - Progress tracking and localStorage persistence
 *
 * Migrated from js/exam-storage.js
 */

import type {
  ExamProgress,
  ExamStats,
  ExamQuestion,
  CategoryStat,
  LearnPosition,
  LeitnerState,
} from '../../shared/types/index';

export const EXAM_PROGRESS_KEY = 'openanchor_exam_progress';
export const LEARN_POSITION_KEY = 'openanchor_learn_position';
export const LEITNER_STATE_KEY = 'openanchor_leitner';

export function loadProgress(): ExamProgress {
  try {
    const stored = localStorage.getItem(EXAM_PROGRESS_KEY);
    if (stored) {
      return JSON.parse(stored) as ExamProgress;
    }
  } catch (e) {
    console.error('Failed to load exam progress:', e);
  }
  return { answered: {}, stats: { correct: 0, incorrect: 0, total: 0 } };
}

export function saveProgress(progress: ExamProgress): void {
  try {
    localStorage.setItem(EXAM_PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save exam progress:', e);
  }
}

export function loadLearnPosition(): LearnPosition | null {
  try {
    const stored = localStorage.getItem(LEARN_POSITION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as LearnPosition;
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load learn position:', e);
  }
  return null;
}

export function saveLearnPosition(questionId: string): void {
  try {
    localStorage.setItem(
      LEARN_POSITION_KEY,
      JSON.stringify({
        questionId,
        timestamp: Date.now(),
      }),
    );
  } catch (e) {
    console.error('Failed to save learn position:', e);
  }
}

export function loadLeitnerState(): LeitnerState {
  try {
    const stored = localStorage.getItem(LEITNER_STATE_KEY);
    if (stored) {
      return JSON.parse(stored) as LeitnerState;
    }
  } catch (e) {
    console.error('Failed to load Leitner state:', e);
  }
  return { boxes: {}, lastReview: {} };
}

export function saveLeitnerState(state: LeitnerState): void {
  try {
    localStorage.setItem(LEITNER_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save Leitner state:', e);
  }
}

function _resetExamDataInternal(): void {
  localStorage.removeItem(EXAM_PROGRESS_KEY);
  localStorage.removeItem(LEARN_POSITION_KEY);
  localStorage.removeItem(LEITNER_STATE_KEY);
}

export function resetExamData(message?: string): boolean {
  const confirmMsg = message || 'Na pewno chcesz zresetować dane egzaminu?';
  if (
    typeof window !== 'undefined' &&
    typeof window.confirm === 'function' &&
    !window.confirm(confirmMsg)
  ) {
    return false;
  }
  _resetExamDataInternal();
  return true;
}

export function forceResetExamData(): void {
  _resetExamDataInternal();
}

export function calculateStats(progress: ExamProgress): ExamStats {
  const answered = progress.answered || {};
  const total = Object.keys(answered).length;
  const correct = Object.values(answered).filter((a) => a.correct).length;
  const incorrect = total - correct;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    total,
    correct,
    incorrect,
    percentage,
  };
}

export function calculateCategoryStats(
  progress: ExamProgress,
  questions: ExamQuestion[],
): Record<string, CategoryStat> {
  const answered = progress.answered || {};
  const categoryStats: Record<string, CategoryStat> = {};

  questions.forEach((q) => {
    const answer = answered[q.id];
    if (answer) {
      if (!categoryStats[q.category]) {
        categoryStats[q.category] = { total: 0, correct: 0 };
      }
      categoryStats[q.category].total++;
      if (answer.correct) {
        categoryStats[q.category].correct++;
      }
    }
  });

  Object.keys(categoryStats).forEach((cat) => {
    const stats = categoryStats[cat];
    stats.percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  });

  return categoryStats;
}
