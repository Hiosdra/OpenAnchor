import { describe, it, expect, beforeEach } from 'vitest';
import {
  EXAM_PROGRESS_KEY,
  LEARN_POSITION_KEY,
  LEITNER_STATE_KEY,
  loadProgress,
  saveProgress,
  loadLearnPosition,
  saveLearnPosition,
  loadLeitnerState,
  saveLeitnerState,
  resetExamData,
  calculateStats,
  calculateCategoryStats
} from '../src/modules/egzamin/exam-storage';

describe('Exam Storage - Progress Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadProgress / saveProgress', () => {
    it('should return empty progress when nothing is stored', () => {
      const progress = loadProgress();
      expect(progress).toEqual({ answered: {}, stats: { correct: 0, incorrect: 0, total: 0 } });
    });

    it('should save and load progress correctly', () => {
      const progress = {
        answered: {
          q1: { correct: true, userAnswer: 'A' },
          q2: { correct: false, userAnswer: 'B' }
        },
        stats: { total: 2, correct: 1 }
      };

      saveProgress(progress);
      const loaded = loadProgress();

      expect(loaded).toEqual(progress);
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorage.setItem(EXAM_PROGRESS_KEY, 'invalid json');
      const progress = loadProgress();
      expect(progress).toEqual({ answered: {}, stats: { correct: 0, incorrect: 0, total: 0 } });
    });
  });

  describe('loadLearnPosition / saveLearnPosition', () => {
    it('should return null when no position is stored', () => {
      const position = loadLearnPosition();
      expect(position).toBeNull();
    });

    it('should save and load position correctly as JSON object', () => {
      const questionId = 'q42';
      saveLearnPosition(questionId);
      const loaded = loadLearnPosition();

      expect(loaded).not.toBeNull();
      expect(loaded).toHaveProperty('questionId', questionId);
      expect(loaded).toHaveProperty('timestamp');
      expect(typeof loaded.timestamp).toBe('number');
    });

    it('should handle parse errors gracefully', () => {
      localStorage.setItem(LEARN_POSITION_KEY, 'invalid json');
      const position = loadLearnPosition();
      expect(position).toBeNull();
    });

    it('should store timestamp when saving position', () => {
      const before = Date.now();
      saveLearnPosition('q1');
      const loaded = loadLearnPosition();
      const after = Date.now();

      expect(loaded.timestamp).toBeGreaterThanOrEqual(before);
      expect(loaded.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('loadLeitnerState / saveLeitnerState', () => {
    it('should return empty state when nothing is stored', () => {
      const state = loadLeitnerState();
      expect(state).toEqual({ boxes: {}, lastReview: {} });
    });

    it('should save and load Leitner state correctly', () => {
      const state = {
        boxes: {
          q1: { box: 3, lastReview: 1234567890, reviewCount: 5 },
          q2: { box: 1, lastReview: 1234567891, reviewCount: 1 }
        },
        lastReview: {}
      };

      saveLeitnerState(state);
      const loaded = loadLeitnerState();

      expect(loaded).toEqual(state);
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorage.setItem(LEITNER_STATE_KEY, '{invalid}');
      const state = loadLeitnerState();
      expect(state).toEqual({ boxes: {}, lastReview: {} });
    });
  });

  describe('resetExamData', () => {
    it('should clear all exam-related data', () => {
      localStorage.setItem(EXAM_PROGRESS_KEY, '{"test": true}');
      localStorage.setItem(LEARN_POSITION_KEY, '10');
      localStorage.setItem(LEITNER_STATE_KEY, '{"boxes": {}}');

      resetExamData();

      expect(localStorage.getItem(EXAM_PROGRESS_KEY)).toBeNull();
      expect(localStorage.getItem(LEARN_POSITION_KEY)).toBeNull();
      expect(localStorage.getItem(LEITNER_STATE_KEY)).toBeNull();
    });

    it('should not affect other localStorage keys', () => {
      localStorage.setItem('other_key', 'value');
      resetExamData();
      expect(localStorage.getItem('other_key')).toBe('value');
    });
  });
});

describe('Exam Storage - Statistics', () => {
  describe('calculateStats', () => {
    it('should calculate statistics correctly', () => {
      const progress = {
        answered: {
          q1: { correct: true },
          q2: { correct: true },
          q3: { correct: false },
          q4: { correct: true }
        }
      };

      const stats = calculateStats(progress);

      expect(stats).toEqual({
        total: 4,
        correct: 3,
        incorrect: 1,
        percentage: 75
      });
    });

    it('should handle empty progress', () => {
      const progress = { answered: {} };
      const stats = calculateStats(progress);

      expect(stats).toEqual({
        total: 0,
        correct: 0,
        incorrect: 0,
        percentage: 0
      });
    });

    it('should handle all correct answers', () => {
      const progress = {
        answered: {
          q1: { correct: true },
          q2: { correct: true }
        }
      };

      const stats = calculateStats(progress);
      expect(stats.percentage).toBe(100);
    });

    it('should handle all incorrect answers', () => {
      const progress = {
        answered: {
          q1: { correct: false },
          q2: { correct: false }
        }
      };

      const stats = calculateStats(progress);
      expect(stats.percentage).toBe(0);
    });

    it('should round percentage to nearest integer', () => {
      const progress = {
        answered: {
          q1: { correct: true },
          q2: { correct: false },
          q3: { correct: false }
        }
      };

      const stats = calculateStats(progress);
      expect(stats.percentage).toBe(33); // 33.33... rounded to 33
    });
  });

  describe('calculateCategoryStats', () => {
    const questions = [
      { id: 'q1', category: 'Navigation' },
      { id: 'q2', category: 'Navigation' },
      { id: 'q3', category: 'Navigation' },
      { id: 'q4', category: 'Safety' },
      { id: 'q5', category: 'Safety' }
    ];

    it('should calculate stats by category', () => {
      const progress = {
        answered: {
          q1: { correct: true },
          q2: { correct: true },
          q3: { correct: false },
          q4: { correct: true },
          q5: { correct: false }
        }
      };

      const categoryStats = calculateCategoryStats(progress, questions);

      expect(categoryStats.Navigation).toEqual({
        total: 3,
        correct: 2,
        percentage: 67
      });

      expect(categoryStats.Safety).toEqual({
        total: 2,
        correct: 1,
        percentage: 50
      });
    });

    it('should handle unanswered questions', () => {
      const progress = {
        answered: {
          q1: { correct: true }
        }
      };

      const categoryStats = calculateCategoryStats(progress, questions);

      expect(categoryStats.Navigation).toEqual({
        total: 1,
        correct: 1,
        percentage: 100
      });

      expect(categoryStats.Safety).toBeUndefined();
    });

    it('should handle empty progress', () => {
      const progress = { answered: {} };
      const categoryStats = calculateCategoryStats(progress, questions);

      expect(Object.keys(categoryStats).length).toBe(0);
    });

    it('should handle perfect score in a category', () => {
      const progress = {
        answered: {
          q1: { correct: true },
          q2: { correct: true },
          q3: { correct: true }
        }
      };

      const categoryStats = calculateCategoryStats(progress, questions);
      expect(categoryStats.Navigation.percentage).toBe(100);
    });
  });
});
