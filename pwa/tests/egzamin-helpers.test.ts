import { describe, it, expect } from 'vitest';
import {
  getBoxForQuestion,
  getBoxCounts,
  isDueForReview,
  getDueQuestions,
  advanceQuestion,
  getLeitnerStats,
} from '../src/modules/egzamin/helpers';
import type { LeitnerState, EgzaminQuestion } from '../src/modules/egzamin/types';

function makeQuestion(id: string): EgzaminQuestion {
  return {
    id,
    category: 'nawigacja',
    correctAnswer: 'A',
    answerCount: 3,
    pdfPage: 1,
    cropYStart: 0,
    cropYEnd: 100,
    pageHeight: 800,
  };
}

const emptyState: LeitnerState = { boxes: {}, lastReview: {} };

describe('egzamin/helpers', () => {
  // ------------------------------------------------------------------
  // getBoxForQuestion
  // ------------------------------------------------------------------
  describe('getBoxForQuestion', () => {
    it('returns 1 for unknown question', () => {
      expect(getBoxForQuestion(emptyState, 'q999')).toBe(1);
    });

    it('returns the stored box number', () => {
      const state: LeitnerState = { lastReview: {},
        boxes: { q1: { box: 3, lastReview: Date.now(), reviewCount: 2 } },
      };
      expect(getBoxForQuestion(state, 'q1')).toBe(3);
    });

    it('handles missing boxes object', () => {
      expect(getBoxForQuestion({ boxes: undefined as any, lastReview: {} }, 'q1')).toBe(1);
    });
  });

  // ------------------------------------------------------------------
  // getBoxCounts
  // ------------------------------------------------------------------
  describe('getBoxCounts', () => {
    it('returns [N,0,0,0,0] when all questions are new', () => {
      const questions = [makeQuestion('q1'), makeQuestion('q2'), makeQuestion('q3')];
      expect(getBoxCounts(emptyState, questions)).toEqual([3, 0, 0, 0, 0]);
    });

    it('distributes questions across boxes correctly', () => {
      const state: LeitnerState = { lastReview: {},
        boxes: {
          q1: { box: 1, lastReview: null, reviewCount: 0 },
          q2: { box: 3, lastReview: Date.now(), reviewCount: 1 },
          q3: { box: 5, lastReview: Date.now(), reviewCount: 4 },
        },
      };
      const questions = [makeQuestion('q1'), makeQuestion('q2'), makeQuestion('q3')];
      expect(getBoxCounts(state, questions)).toEqual([1, 0, 1, 0, 1]);
    });

    it('returns all zeros for empty questions', () => {
      expect(getBoxCounts(emptyState, [])).toEqual([0, 0, 0, 0, 0]);
    });
  });

  // ------------------------------------------------------------------
  // isDueForReview
  // ------------------------------------------------------------------
  describe('isDueForReview', () => {
    it('returns true for question not in state', () => {
      expect(isDueForReview(emptyState, 'q1')).toBe(true);
    });

    it('returns true for question reviewed long ago', () => {
      const state: LeitnerState = { lastReview: {},
        boxes: { q1: { box: 1, lastReview: Date.now() - 2 * 86400000, reviewCount: 1 } },
      };
      expect(isDueForReview(state, 'q1')).toBe(true);
    });

    it('returns false for recently reviewed question in box 5', () => {
      const state: LeitnerState = { lastReview: {},
        boxes: { q1: { box: 5, lastReview: Date.now(), reviewCount: 5 } },
      };
      expect(isDueForReview(state, 'q1')).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // getDueQuestions
  // ------------------------------------------------------------------
  describe('getDueQuestions', () => {
    it('returns all questions when state is empty', () => {
      const questions = [makeQuestion('q1'), makeQuestion('q2')];
      expect(getDueQuestions(emptyState, questions)).toHaveLength(2);
    });

    it('excludes recently-reviewed questions', () => {
      const state: LeitnerState = { lastReview: {},
        boxes: {
          q1: { box: 5, lastReview: Date.now(), reviewCount: 5 },
          q2: { box: 1, lastReview: Date.now() - 3 * 86400000, reviewCount: 1 },
        },
      };
      const questions = [makeQuestion('q1'), makeQuestion('q2')];
      const due = getDueQuestions(state, questions);
      expect(due).toHaveLength(1);
      expect(due[0].id).toBe('q2');
    });
  });

  // ------------------------------------------------------------------
  // advanceQuestion
  // ------------------------------------------------------------------
  describe('advanceQuestion', () => {
    it('advances box on correct answer', () => {
      const state: LeitnerState = { lastReview: {},
        boxes: { q1: { box: 2, lastReview: Date.now() - 86400000, reviewCount: 1 } },
      };
      const updated = advanceQuestion(state, 'q1', true);
      expect(updated.boxes!['q1'].box).toBe(3);
    });

    it('resets to box 1 on incorrect answer', () => {
      const state: LeitnerState = { lastReview: {},
        boxes: { q1: { box: 4, lastReview: Date.now() - 86400000, reviewCount: 3 } },
      };
      const updated = advanceQuestion(state, 'q1', false);
      expect(updated.boxes!['q1'].box).toBe(1);
    });

    it('initialises new question when advancing unknown id', () => {
      const updated = advanceQuestion(emptyState, 'new-q', true);
      expect(updated.boxes!['new-q'].box).toBe(2);
    });

    it('does not exceed box 5', () => {
      const state: LeitnerState = { lastReview: {},
        boxes: { q1: { box: 5, lastReview: Date.now() - 20 * 86400000, reviewCount: 5 } },
      };
      const updated = advanceQuestion(state, 'q1', true);
      expect(updated.boxes!['q1'].box).toBe(5);
    });
  });

  // ------------------------------------------------------------------
  // getLeitnerStats
  // ------------------------------------------------------------------
  describe('getLeitnerStats', () => {
    it('returns zeros for empty state', () => {
      const stats = getLeitnerStats(emptyState);
      expect(stats.total).toBe(0);
      expect(stats[1]).toBe(0);
    });

    it('counts questions per box', () => {
      const state: LeitnerState = { lastReview: {},
        boxes: {
          q1: { box: 1, lastReview: null, reviewCount: 0 },
          q2: { box: 1, lastReview: null, reviewCount: 0 },
          q3: { box: 3, lastReview: Date.now(), reviewCount: 2 },
        },
      };
      const stats = getLeitnerStats(state);
      expect(stats.total).toBe(3);
      expect(stats[1]).toBe(2);
      expect(stats[3]).toBe(1);
    });
  });
});
