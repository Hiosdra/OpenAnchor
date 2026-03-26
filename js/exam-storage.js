/**
 * Egzamin module - Progress tracking and localStorage persistence
 */

export const EXAM_PROGRESS_KEY = 'openanchor_exam_progress';
export const LEARN_POSITION_KEY = 'openanchor_learn_position';
export const LEITNER_STATE_KEY = 'openanchor_leitner';

/**
 * Load exam progress from localStorage
 * @returns {Object} Progress object with answered questions
 */
export function loadProgress() {
  try {
    const stored = localStorage.getItem(EXAM_PROGRESS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load exam progress:', e);
  }
  return { answered: {}, stats: { correct: 0, incorrect: 0, total: 0 } };
}

/**
 * Save exam progress to localStorage
 * @param {Object} progress - Progress object
 */
export function saveProgress(progress) {
  try {
    localStorage.setItem(EXAM_PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save exam progress:', e);
  }
}

/**
 * Load learn mode position from localStorage
 * @returns {Object|null} Position object {questionId, timestamp} or null
 */
export function loadLearnPosition() {
  try {
    const stored = localStorage.getItem(LEARN_POSITION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load learn position:', e);
  }
  return null;
}

/**
 * Save learn mode position to localStorage
 * @param {string} questionId - Question ID
 */
export function saveLearnPosition(questionId) {
  try {
    localStorage.setItem(LEARN_POSITION_KEY, JSON.stringify({
      questionId,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Failed to save learn position:', e);
  }
}

/**
 * Load Leitner system state from localStorage
 * @returns {Object} Leitner state object
 */
export function loadLeitnerState() {
  try {
    const stored = localStorage.getItem(LEITNER_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load Leitner state:', e);
  }
  return { boxes: {}, lastReview: {} };
}

/**
 * Save Leitner system state to localStorage
 * @param {Object} state - Leitner state object
 */
export function saveLeitnerState(state) {
  try {
    localStorage.setItem(LEITNER_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save Leitner state:', e);
  }
}

/**
 * Reset all exam data (internal - no confirmation)
 */
function _resetExamDataInternal() {
  localStorage.removeItem(EXAM_PROGRESS_KEY);
  localStorage.removeItem(LEARN_POSITION_KEY);
  localStorage.removeItem(LEITNER_STATE_KEY);
}

/**
 * Reset all exam data with confirmation.
 * @param {string} [message='Na pewno chcesz zresetować dane egzaminu?'] - Confirmation message
 * @returns {boolean} true if reset was performed
 */
export function resetExamData(message) {
  const confirmMsg = message || 'Na pewno chcesz zresetować dane egzaminu?';
  if (typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm(confirmMsg)) {
    return false;
  }
  _resetExamDataInternal();
  return true;
}

/**
 * Reset all exam data without confirmation (for programmatic use).
 */
export function forceResetExamData() {
  _resetExamDataInternal();
}

/**
 * Calculate exam statistics
 * @param {Object} progress - Progress object with answered questions
 * @returns {Object} Statistics object
 */
export function calculateStats(progress) {
  const answered = progress.answered || {};
  const total = Object.keys(answered).length;
  const correct = Object.values(answered).filter(a => a.correct).length;
  const incorrect = total - correct;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    total,
    correct,
    incorrect,
    percentage
  };
}

/**
 * Calculate statistics by category
 * @param {Object} progress - Progress object
 * @param {Array} questions - All questions
 * @returns {Object} Category statistics
 */
export function calculateCategoryStats(progress, questions) {
  const answered = progress.answered || {};
  const categoryStats = {};

  questions.forEach(q => {
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

  // Calculate percentages
  Object.keys(categoryStats).forEach(cat => {
    const stats = categoryStats[cat];
    stats.percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  });

  return categoryStats;
}
