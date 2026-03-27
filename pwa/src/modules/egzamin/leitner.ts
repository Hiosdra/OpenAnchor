/**
 * Leitner spaced repetition system
 * https://en.wikipedia.org/wiki/Leitner_system
 *
 * Migrated from js/leitner.js
 */

import type { LeitnerQuestionData, LeitnerState, LeitnerIntervals, ExamQuestion } from '../../shared/types/index';

export const LEITNER_INTERVALS: LeitnerIntervals = {
  1: 1,    // Box 1: Review daily
  2: 2,    // Box 2: Review every 2 days
  3: 4,    // Box 3: Review every 4 days
  4: 8,    // Box 4: Review every 8 days
  5: 16    // Box 5: Review every 16 days
};

export function initializeLeitnerQuestion(_questionId: string): LeitnerQuestionData {
  return {
    box: 1,
    lastReview: null,
    reviewCount: 0
  };
}

export function advanceQuestion(leitnerData: LeitnerQuestionData): LeitnerQuestionData {
  const currentBox = leitnerData.box || 1;
  const nextBox = Math.min(currentBox + 1, 5);

  return {
    ...leitnerData,
    box: nextBox,
    lastReview: Date.now(),
    reviewCount: (leitnerData.reviewCount || 0) + 1
  };
}

export function resetQuestion(leitnerData: LeitnerQuestionData): LeitnerQuestionData {
  return {
    ...leitnerData,
    box: 1,
    lastReview: Date.now(),
    reviewCount: (leitnerData.reviewCount || 0) + 1
  };
}

export function isDueForReview(leitnerData: LeitnerQuestionData | null | undefined): boolean {
  if (!leitnerData || !leitnerData.lastReview) {
    return true;
  }

  const box = leitnerData.box || 1;
  const intervalDays = LEITNER_INTERVALS[box as keyof LeitnerIntervals] || 1;
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  const timeSinceReview = Date.now() - leitnerData.lastReview;

  return timeSinceReview >= intervalMs;
}

export function getDueQuestions(leitnerState: LeitnerState, allQuestions: ExamQuestion[]): ExamQuestion[] {
  const dueQuestions: ExamQuestion[] = [];

  allQuestions.forEach(function (question) {
    const leitnerData = leitnerState.boxes && leitnerState.boxes[question.id];

    if (!leitnerData) {
      dueQuestions.push(question);
    } else if (isDueForReview(leitnerData)) {
      dueQuestions.push(question);
    }
  });

  return dueQuestions;
}

export function getLeitnerStats(leitnerState: LeitnerState): Record<string, number> {
  const stats: Record<string, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    total: 0
  };

  const boxes = leitnerState.boxes || {};

  Object.values(boxes).forEach(function (data) {
    const box = data.box || 1;
    stats[box]++;
    stats.total++;
  });

  return stats;
}

export function getNextReviewDate(leitnerData: LeitnerQuestionData | null | undefined): Date | null {
  if (!leitnerData || !leitnerData.lastReview) {
    return null;
  }

  const box = leitnerData.box || 1;
  const intervalDays = LEITNER_INTERVALS[box as keyof LeitnerIntervals] || 1;
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

  return new Date(leitnerData.lastReview + intervalMs);
}

export function updateLeitnerState(leitnerState: LeitnerState, questionId: string, correct: boolean): LeitnerState {
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
