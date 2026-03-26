/**
 * Leitner spaced repetition system
 * https://en.wikipedia.org/wiki/Leitner_system
 *
 * Shared/canonical implementation using date-based intervals.
 * Used by pwa/modules/egzamin/ and available for any future modules.
 *
 * Loaded as a plain <script> in the browser (window.Leitner namespace).
 * In Vitest, the conditional module.exports makes named imports work.
 */

// Box review intervals in days
var LEITNER_INTERVALS = {
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
function initializeLeitnerQuestion(questionId) {
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
function leitnerAdvanceQuestion(leitnerData) {
  var currentBox = leitnerData.box || 1;
  var nextBox = Math.min(currentBox + 1, 5);

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
function resetQuestion(leitnerData) {
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
function leitnerIsDueForReview(leitnerData) {
  if (!leitnerData || !leitnerData.lastReview) {
    return true; // Never reviewed
  }

  var box = leitnerData.box || 1;
  var intervalDays = LEITNER_INTERVALS[box] || 1;
  var intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  var timeSinceReview = Date.now() - leitnerData.lastReview;

  return timeSinceReview >= intervalMs;
}

/**
 * Get all questions due for review
 * @param {Object} leitnerState - Complete Leitner state
 * @param {Array} allQuestions - All available questions
 * @returns {Array} Questions due for review
 */
function leitnerGetDueQuestions(leitnerState, allQuestions) {
  var dueQuestions = [];

  allQuestions.forEach(function (question) {
    var leitnerData = leitnerState.boxes && leitnerState.boxes[question.id];

    if (!leitnerData) {
      dueQuestions.push(question);
    } else if (leitnerIsDueForReview(leitnerData)) {
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
function getLeitnerStats(leitnerState) {
  var stats = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    total: 0
  };

  var boxes = leitnerState.boxes || {};

  Object.values(boxes).forEach(function (data) {
    var box = data.box || 1;
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
function getNextReviewDate(leitnerData) {
  if (!leitnerData || !leitnerData.lastReview) {
    return null; // Review now
  }

  var box = leitnerData.box || 1;
  var intervalDays = LEITNER_INTERVALS[box] || 1;
  var intervalMs = intervalDays * 24 * 60 * 60 * 1000;

  return new Date(leitnerData.lastReview + intervalMs);
}

/**
 * Update Leitner state based on answer
 * @param {Object} leitnerState - Current Leitner state
 * @param {string} questionId - Question ID
 * @param {boolean} correct - Whether answer was correct
 * @returns {Object} Updated Leitner state
 */
function updateLeitnerState(leitnerState, questionId, correct) {
  var boxes = leitnerState.boxes || {};
  var currentData = boxes[questionId] || initializeLeitnerQuestion(questionId);

  var updatedData = correct
    ? leitnerAdvanceQuestion(currentData)
    : resetQuestion(currentData);

  return {
    ...leitnerState,
    boxes: {
      ...boxes,
      [questionId]: updatedData
    }
  };
}

// Browser global namespace
if (typeof window !== 'undefined') {
  window.Leitner = {
    LEITNER_INTERVALS: LEITNER_INTERVALS,
    initializeLeitnerQuestion: initializeLeitnerQuestion,
    advanceQuestion: leitnerAdvanceQuestion,
    resetQuestion: resetQuestion,
    isDueForReview: leitnerIsDueForReview,
    getDueQuestions: leitnerGetDueQuestions,
    getLeitnerStats: getLeitnerStats,
    getNextReviewDate: getNextReviewDate,
    updateLeitnerState: updateLeitnerState
  };
}

// Vitest / CommonJS compatibility — export under original names for tests
if (typeof module !== 'undefined') {
  module.exports = {
    LEITNER_INTERVALS: LEITNER_INTERVALS,
    initializeLeitnerQuestion: initializeLeitnerQuestion,
    advanceQuestion: leitnerAdvanceQuestion,
    resetQuestion: resetQuestion,
    isDueForReview: leitnerIsDueForReview,
    getDueQuestions: leitnerGetDueQuestions,
    getLeitnerStats: getLeitnerStats,
    getNextReviewDate: getNextReviewDate,
    updateLeitnerState: updateLeitnerState
  };
}
