import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LEITNER_INTERVALS,
  initializeLeitnerQuestion,
  advanceQuestion,
  resetQuestion,
  isDueForReview,
  getDueQuestions,
  getLeitnerStats,
  getNextReviewDate,
  updateLeitnerState
} from '../src/modules/egzamin/leitner';

describe('Leitner System - Spaced Repetition', () => {
  describe('initializeLeitnerQuestion', () => {
    it('should initialize question in box 1', () => {
      const data = initializeLeitnerQuestion('q1');

      expect(data).toEqual({
        box: 1,
        lastReview: null,
        reviewCount: 0
      });
    });
  });

  describe('advanceQuestion', () => {
    it('should advance from box 1 to box 2', () => {
      const data = { box: 1, lastReview: null, reviewCount: 0 };
      const advanced = advanceQuestion(data);

      expect(advanced.box).toBe(2);
      expect(advanced.reviewCount).toBe(1);
      expect(advanced.lastReview).toBeTruthy();
    });

    it('should advance from box 4 to box 5', () => {
      const data = { box: 4, lastReview: Date.now(), reviewCount: 3 };
      const advanced = advanceQuestion(data);

      expect(advanced.box).toBe(5);
      expect(advanced.reviewCount).toBe(4);
    });

    it('should not advance beyond box 5', () => {
      const data = { box: 5, lastReview: Date.now(), reviewCount: 10 };
      const advanced = advanceQuestion(data);

      expect(advanced.box).toBe(5);
      expect(advanced.reviewCount).toBe(11);
    });

    it('should update lastReview timestamp', () => {
      const before = Date.now();
      const data = { box: 1, lastReview: null, reviewCount: 0 };
      const advanced = advanceQuestion(data);
      const after = Date.now();

      expect(advanced.lastReview).toBeGreaterThanOrEqual(before);
      expect(advanced.lastReview).toBeLessThanOrEqual(after);
    });

    it('should default box to 1 when missing', () => {
      const data = { lastReview: null, reviewCount: 0 };
      const advanced = advanceQuestion(data);
      expect(advanced.box).toBe(2);
    });

    it('should default reviewCount to 0 when missing', () => {
      const data = { box: 2, lastReview: Date.now() };
      const advanced = advanceQuestion(data);
      expect(advanced.reviewCount).toBe(1);
    });
  });

  describe('resetQuestion', () => {
    it('should reset to box 1', () => {
      const data = { box: 5, lastReview: Date.now(), reviewCount: 10 };
      const reset = resetQuestion(data);

      expect(reset.box).toBe(1);
      expect(reset.reviewCount).toBe(11);
    });

    it('should update lastReview timestamp', () => {
      const data = { box: 3, lastReview: 1000, reviewCount: 5 };
      const reset = resetQuestion(data);

      expect(reset.lastReview).toBeGreaterThan(1000);
    });

    it('should maintain reviewCount increment', () => {
      const data = { box: 4, lastReview: Date.now(), reviewCount: 7 };
      const reset = resetQuestion(data);

      expect(reset.reviewCount).toBe(8);
    });

    it('should default reviewCount to 0 when missing', () => {
      const data = { box: 3, lastReview: Date.now() };
      const reset = resetQuestion(data);
      expect(reset.reviewCount).toBe(1);
    });
  });

  describe('isDueForReview', () => {
    it('should return true for never-reviewed questions', () => {
      const data = { box: 1, lastReview: null, reviewCount: 0 };
      expect(isDueForReview(data)).toBe(true);
    });

    it('should return true when interval has passed (box 1)', () => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000 + 1000);
      const data = { box: 1, lastReview: oneDayAgo, reviewCount: 1 };

      expect(isDueForReview(data)).toBe(true);
    });

    it('should return false when interval has not passed', () => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const data = { box: 1, lastReview: oneHourAgo, reviewCount: 1 };

      expect(isDueForReview(data)).toBe(false);
    });

    it('should respect box 2 interval (2 days)', () => {
      const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000 + 1000);
      const data = { box: 2, lastReview: twoDaysAgo, reviewCount: 2 };

      expect(isDueForReview(data)).toBe(true);
    });

    it('should respect box 5 interval (16 days)', () => {
      const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
      const data = { box: 5, lastReview: fifteenDaysAgo, reviewCount: 5 };

      expect(isDueForReview(data)).toBe(false);
    });

    it('should handle null data', () => {
      expect(isDueForReview(null)).toBe(true);
    });

    it('should handle undefined lastReview', () => {
      const data = { box: 3, reviewCount: 0 };
      expect(isDueForReview(data)).toBe(true);
    });

    it('should default box to 1 when missing', () => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000 + 1000);
      const data = { lastReview: oneDayAgo, reviewCount: 1 };
      expect(isDueForReview(data)).toBe(true);
    });

    it('should default interval to 1 for invalid box number', () => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000 + 1000);
      const data = { box: 99, lastReview: oneDayAgo, reviewCount: 1 };
      expect(isDueForReview(data)).toBe(true);
    });
  });

  describe('getDueQuestions', () => {
    const allQuestions = [
      { id: 'q1', text: 'Question 1' },
      { id: 'q2', text: 'Question 2' },
      { id: 'q3', text: 'Question 3' },
      { id: 'q4', text: 'Question 4' }
    ];

    it('should return all questions when none have been reviewed', () => {
      const leitnerState = { boxes: {} };
      const due = getDueQuestions(leitnerState, allQuestions);

      expect(due.length).toBe(4);
    });

    it('should return only due questions', () => {
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      const leitnerState = {
        boxes: {
          q1: { box: 1, lastReview: threeDaysAgo, reviewCount: 1 }, // Due (box 1 needs 1 day)
          q2: { box: 1, lastReview: oneHourAgo, reviewCount: 1 }, // Not due
          q3: { box: 2, lastReview: oneHourAgo, reviewCount: 1 }  // Not due (needs 2 days for box 2)
        }
      };

      const due = getDueQuestions(leitnerState, allQuestions);

      expect(due.length).toBe(2);
      expect(due.map(q => q.id)).toContain('q1');
      expect(due.map(q => q.id)).toContain('q4'); // Never reviewed
    });

    it('should handle empty question list', () => {
      const leitnerState = { boxes: {} };
      const due = getDueQuestions(leitnerState, []);

      expect(due.length).toBe(0);
    });
  });

  describe('getLeitnerStats', () => {
    it('should count questions in each box', () => {
      const leitnerState = {
        boxes: {
          q1: { box: 1 },
          q2: { box: 1 },
          q3: { box: 2 },
          q4: { box: 3 },
          q5: { box: 5 },
          q6: { box: 5 }
        }
      };

      const stats = getLeitnerStats(leitnerState);

      expect(stats).toEqual({
        1: 2,
        2: 1,
        3: 1,
        4: 0,
        5: 2,
        total: 6
      });
    });

    it('should handle empty state', () => {
      const leitnerState = { boxes: {} };
      const stats = getLeitnerStats(leitnerState);

      expect(stats).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        total: 0
      });
    });

    it('should handle missing boxes property', () => {
      const leitnerState = {};
      const stats = getLeitnerStats(leitnerState);

      expect(stats.total).toBe(0);
    });

    it('should default box to 1 when data.box is missing', () => {
      const leitnerState = {
        boxes: {
          q1: { lastReview: Date.now(), reviewCount: 1 },
          q2: { box: 0, lastReview: Date.now(), reviewCount: 1 }
        }
      };
      const stats = getLeitnerStats(leitnerState);
      expect(stats[1]).toBe(2);
      expect(stats.total).toBe(2);
    });
  });

  describe('getNextReviewDate', () => {
    it('should return null for never-reviewed questions', () => {
      const data = { box: 1, lastReview: null, reviewCount: 0 };
      const nextDate = getNextReviewDate(data);

      expect(nextDate).toBeNull();
    });

    it('should calculate next review for box 1 (1 day)', () => {
      const now = Date.now();
      const data = { box: 1, lastReview: now, reviewCount: 1 };
      const nextDate = getNextReviewDate(data);

      const expectedTime = now + (1 * 24 * 60 * 60 * 1000);
      expect(nextDate.getTime()).toBe(expectedTime);
    });

    it('should calculate next review for box 5 (16 days)', () => {
      const now = Date.now();
      const data = { box: 5, lastReview: now, reviewCount: 5 };
      const nextDate = getNextReviewDate(data);

      const expectedTime = now + (16 * 24 * 60 * 60 * 1000);
      expect(nextDate.getTime()).toBe(expectedTime);
    });

    it('should handle null data', () => {
      const nextDate = getNextReviewDate(null);
      expect(nextDate).toBeNull();
    });

    it('should default box to 1 when missing', () => {
      const now = Date.now();
      const data = { lastReview: now, reviewCount: 1 };
      const nextDate = getNextReviewDate(data);
      const expectedTime = now + (1 * 24 * 60 * 60 * 1000);
      expect(nextDate.getTime()).toBe(expectedTime);
    });

    it('should default interval to 1 for invalid box number', () => {
      const now = Date.now();
      const data = { box: 99, lastReview: now, reviewCount: 1 };
      const nextDate = getNextReviewDate(data);
      const expectedTime = now + (1 * 24 * 60 * 60 * 1000);
      expect(nextDate.getTime()).toBe(expectedTime);
    });
  });

  describe('updateLeitnerState', () => {
    it('should advance question on correct answer', () => {
      const leitnerState = {
        boxes: {
          q1: { box: 1, lastReview: Date.now(), reviewCount: 0 }
        }
      };

      const updated = updateLeitnerState(leitnerState, 'q1', true);

      expect(updated.boxes.q1.box).toBe(2);
      expect(updated.boxes.q1.reviewCount).toBe(1);
    });

    it('should reset question on incorrect answer', () => {
      const leitnerState = {
        boxes: {
          q1: { box: 4, lastReview: Date.now(), reviewCount: 5 }
        }
      };

      const updated = updateLeitnerState(leitnerState, 'q1', false);

      expect(updated.boxes.q1.box).toBe(1);
      expect(updated.boxes.q1.reviewCount).toBe(6);
    });

    it('should initialize new question', () => {
      const leitnerState = { boxes: {} };

      const updated = updateLeitnerState(leitnerState, 'q1', true);

      expect(updated.boxes.q1.box).toBe(2); // Initialized to 1, then advanced
      expect(updated.boxes.q1.reviewCount).toBe(1);
    });

    it('should not mutate original state', () => {
      const leitnerState = {
        boxes: {
          q1: { box: 1, lastReview: Date.now(), reviewCount: 0 }
        }
      };

      const original = { ...leitnerState };
      updateLeitnerState(leitnerState, 'q1', true);

      expect(leitnerState.boxes.q1.box).toBe(original.boxes.q1.box);
    });

    it('should preserve other questions in state', () => {
      const leitnerState = {
        boxes: {
          q1: { box: 1, lastReview: Date.now(), reviewCount: 0 },
          q2: { box: 3, lastReview: Date.now(), reviewCount: 2 }
        }
      };

      const updated = updateLeitnerState(leitnerState, 'q1', true);

      expect(updated.boxes.q2.box).toBe(3);
      expect(updated.boxes.q2.reviewCount).toBe(2);
    });

    it('should handle missing boxes property in state', () => {
      const leitnerState = {};
      const updated = updateLeitnerState(leitnerState, 'q1', true);
      expect(updated.boxes.q1.box).toBe(2);
    });

    it('should initialize and reset new question on incorrect answer', () => {
      const leitnerState = { boxes: {} };
      const updated = updateLeitnerState(leitnerState, 'q1', false);
      expect(updated.boxes.q1.box).toBe(1);
      expect(updated.boxes.q1.reviewCount).toBe(1);
    });
  });

  describe('LEITNER_INTERVALS', () => {
    it('should have correct interval values', () => {
      expect(LEITNER_INTERVALS).toEqual({
        1: 1,
        2: 2,
        3: 4,
        4: 8,
        5: 16
      });
    });
  });
});
