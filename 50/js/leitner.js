/**
 * Leitner spaced repetition system
 * https://en.wikipedia.org/wiki/Leitner_system
 */

// Box review intervals in days
export const LEITNER_INTERVALS = {
  1: 1,    // Box 1: Review daily
  2: 2,    // Box 2: Review every 2 days
  3: 4,    // Box 3: Review every 4 days
  4: 8,    // Box 4: Review every 8 days
  5: 16    // Box 5: Review every 16 days
};

/**
 * Initialize a question in the Leitner system
 * @param {string} questionId
 * @returns {Object} Initial Leitner data for question
 */
export function initializeLeitnerQuestion(questionId) {
  return {
    box: 1,
    lastReview: null,
    reviewCount: 0
  };
}

/**
 * Advance question to next box (correct answer)
 * @param {Object} leitnerData - Current Leitner data for question
 * @returns {Object} Updated Leitner data
 */
export function advanceQuestion(leitnerData) {
  const currentBox = leitnerData.box || 1;
  const nextBox = Math.min(currentBox + 1, 5);

  return {
    ...leitnerData,
    box: nextBox,
    lastReview: Date.now(),
    reviewCount: (leitnerData.reviewCount || 0) + 1
  };
}

/**
 * Move question back to box 1 (incorrect answer)
 * @param {Object} leitnerData - Current Leitner data for question
 * @returns {Object} Updated Leitner data
 */
export function resetQuestion(leitnerData) {
  return {
    ...leitnerData,
    box: 1,
    lastReview: Date.now(),
    reviewCount: (leitnerData.reviewCount || 0) + 1
  };
}

/**
 * Check if a question is due for review
 * @param {Object} leitnerData - Leitner data for question
 * @returns {boolean}
 */
export function isDueForReview(leitnerData) {
  if (!leitnerData || !leitnerData.lastReview) {
    return true; // Never reviewed
  }

  const box = leitnerData.box || 1;
  const intervalDays = LEITNER_INTERVALS[box] || 1;
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  const timeSinceReview = Date.now() - leitnerData.lastReview;

  return timeSinceReview >= intervalMs;
}

/**
 * Get all questions due for review
 * @param {Object} leitnerState - Complete Leitner state
 * @param {Array} allQuestions - All available questions
 * @returns {Array} Questions due for review
 */
export function getDueQuestions(leitnerState, allQuestions) {
  const dueQuestions = [];

  allQuestions.forEach(question => {
    const leitnerData = leitnerState.boxes?.[question.id];

    if (!leitnerData) {
      // Never reviewed - add to due list
      dueQuestions.push(question);
    } else if (isDueForReview(leitnerData)) {
      dueQuestions.push(question);
    }
  });

  return dueQuestions;
}

/**
 * Get statistics for Leitner boxes
 * @param {Object} leitnerState - Complete Leitner state
 * @returns {Object} Box statistics
 */
export function getLeitnerStats(leitnerState) {
  const stats = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    total: 0
  };

  const boxes = leitnerState.boxes || {};

  Object.values(boxes).forEach(data => {
    const box = data.box || 1;
    stats[box]++;
    stats.total++;
  });

  return stats;
}

/**
 * Calculate next review date for a question
 * @param {Object} leitnerData - Leitner data for question
 * @returns {Date|null} Next review date
 */
export function getNextReviewDate(leitnerData) {
  if (!leitnerData || !leitnerData.lastReview) {
    return null; // Review now
  }

  const box = leitnerData.box || 1;
  const intervalDays = LEITNER_INTERVALS[box] || 1;
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

  return new Date(leitnerData.lastReview + intervalMs);
}

/**
 * Update Leitner state based on answer
 * @param {Object} leitnerState - Current Leitner state
 * @param {string} questionId - Question ID
 * @param {boolean} correct - Whether answer was correct
 * @returns {Object} Updated Leitner state
 */
export function updateLeitnerState(leitnerState, questionId, correct) {
  const boxes = leitnerState.boxes || {};
  const currentData = boxes[questionId] || initializeLeitnerQuestion(questionId);

  const updatedData = correct
    ? advanceQuestion(currentData)
    : resetQuestion(currentData);

  return {
    ...leitnerState,
    boxes: {
      ...boxes,
      [questionId]: updatedData
    }
  };
}
