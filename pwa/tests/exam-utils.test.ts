import { describe, it, expect } from 'vitest';
import {
  getAnswerState,
  formatExamTime,
  calculateExamResults,
  calculatePassStatus,
  formatTimeTaken,
  countByCategory,
  clickPositionToIndex,
  safePercentage,
} from '../src/modules/egzamin/exam-utils';
import type { AnswerState, QuestionStub } from '../src/modules/egzamin/exam-utils';

// ---------------------------------------------------------------------------
// getAnswerState
// ---------------------------------------------------------------------------
describe('getAnswerState', () => {
  it('returns "default" when nothing is selected', () => {
    expect(getAnswerState('A', null, 'B', false)).toBe('default');
    expect(getAnswerState('A', null, 'A', true)).toBe('default');
  });

  it('returns "selected" for the chosen answer before reveal', () => {
    expect(getAnswerState('B', 'B', 'A', false)).toBe('selected');
  });

  it('returns "correct" for the correct label when revealed', () => {
    expect(getAnswerState('A', 'A', 'A', true)).toBe('correct');
    // correct label is highlighted even when user picked wrong answer
    expect(getAnswerState('A', 'B', 'A', true)).toBe('correct');
  });

  it('returns "incorrect" for the wrong pick when revealed', () => {
    expect(getAnswerState('B', 'B', 'A', true)).toBe('incorrect');
  });

  it('returns "default" for labels that are neither selected nor correct after reveal', () => {
    expect(getAnswerState('C', 'B', 'A', true)).toBe('default');
  });

  it('returns "default" for non-selected, non-correct label before reveal', () => {
    expect(getAnswerState('C', 'B', 'A', false)).toBe('default');
  });
});

// ---------------------------------------------------------------------------
// formatExamTime
// ---------------------------------------------------------------------------
describe('formatExamTime', () => {
  it('formats zero seconds', () => {
    expect(formatExamTime(0)).toBe('0:00');
  });

  it('formats seconds < 60', () => {
    expect(formatExamTime(59)).toBe('0:59');
  });

  it('formats exactly one minute', () => {
    expect(formatExamTime(60)).toBe('1:00');
  });

  it('formats large values', () => {
    // 3661 s = 61 min 1 s
    expect(formatExamTime(3661)).toBe('61:01');
  });

  it('pads single-digit seconds', () => {
    expect(formatExamTime(65)).toBe('1:05');
  });
});

// ---------------------------------------------------------------------------
// calculateExamResults
// ---------------------------------------------------------------------------
describe('calculateExamResults', () => {
  const questions: QuestionStub[] = [
    { id: '1', correctAnswer: 'A' },
    { id: '2', correctAnswer: 'B' },
    { id: '3', correctAnswer: 'C' },
  ];

  it('marks all correct', () => {
    const answers: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C' };
    const results = calculateExamResults(questions, answers);
    expect(results.every((r) => r.correct)).toBe(true);
  });

  it('marks all incorrect', () => {
    const answers: Record<string, string> = { '1': 'B', '2': 'C', '3': 'A' };
    const results = calculateExamResults(questions, answers);
    expect(results.every((r) => !r.correct)).toBe(true);
  });

  it('handles mixed answers', () => {
    const answers: Record<string, string> = { '1': 'A', '2': 'C', '3': 'C' };
    const results = calculateExamResults(questions, answers);
    expect(results[0].correct).toBe(true);
    expect(results[1].correct).toBe(false);
    expect(results[2].correct).toBe(true);
  });

  it('handles empty answers (unanswered questions)', () => {
    const results = calculateExamResults(questions, {});
    results.forEach((r) => {
      expect(r.userAnswer).toBeNull();
      expect(r.correct).toBe(false);
    });
  });

  it('handles empty question list', () => {
    expect(calculateExamResults([], {})).toEqual([]);
  });

  it('preserves question id mapping', () => {
    const answers: Record<string, string> = { '2': 'B' };
    const results = calculateExamResults(questions, answers);
    expect(results[1].questionId).toBe('2');
    expect(results[1].userAnswer).toBe('B');
    expect(results[1].correct).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculatePassStatus
// ---------------------------------------------------------------------------
describe('calculatePassStatus', () => {
  it('0 correct out of 10 → 0 %, fail', () => {
    const { pct, passed } = calculatePassStatus(0, 10);
    expect(pct).toBe(0);
    expect(passed).toBe(false);
  });

  it('69 % → fail (just below threshold)', () => {
    // 69/100 = 69 %
    const { pct, passed } = calculatePassStatus(69, 100);
    expect(pct).toBe(69);
    expect(passed).toBe(false);
  });

  it('70 % → pass (exactly at threshold)', () => {
    const { pct, passed } = calculatePassStatus(70, 100);
    expect(pct).toBe(70);
    expect(passed).toBe(true);
  });

  it('100 % → pass', () => {
    const { pct, passed } = calculatePassStatus(30, 30);
    expect(pct).toBe(100);
    expect(passed).toBe(true);
  });

  it('handles zero total gracefully', () => {
    const { pct, passed } = calculatePassStatus(0, 0);
    expect(pct).toBe(0);
    expect(passed).toBe(false);
  });

  it('rounds correctly (e.g. 7/10 = 70 %)', () => {
    const { pct, passed } = calculatePassStatus(7, 10);
    expect(pct).toBe(70);
    expect(passed).toBe(true);
  });

  it('rounds 2/3 to 67 % (fail)', () => {
    const { pct, passed } = calculatePassStatus(2, 3);
    expect(pct).toBe(67);
    expect(passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatTimeTaken
// ---------------------------------------------------------------------------
describe('formatTimeTaken', () => {
  it('splits zero seconds', () => {
    expect(formatTimeTaken(0)).toEqual({ minutes: 0, seconds: 0 });
  });

  it('splits 90 seconds into 1 min 30 s', () => {
    expect(formatTimeTaken(90)).toEqual({ minutes: 1, seconds: 30 });
  });

  it('handles exact minutes', () => {
    expect(formatTimeTaken(300)).toEqual({ minutes: 5, seconds: 0 });
  });

  it('handles large values', () => {
    expect(formatTimeTaken(3661)).toEqual({ minutes: 61, seconds: 1 });
  });
});

// ---------------------------------------------------------------------------
// countByCategory
// ---------------------------------------------------------------------------
describe('countByCategory', () => {
  it('counts a single category', () => {
    const qs = [{ category: 'nav' }, { category: 'nav' }];
    expect(countByCategory(qs)).toEqual({ nav: 2 });
  });

  it('counts multiple categories', () => {
    const qs = [
      { category: 'nav' },
      { category: 'safety' },
      { category: 'nav' },
      { category: 'rules' },
    ];
    expect(countByCategory(qs)).toEqual({ nav: 2, safety: 1, rules: 1 });
  });

  it('returns empty object for empty input', () => {
    expect(countByCategory([])).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// clickPositionToIndex
// ---------------------------------------------------------------------------
describe('clickPositionToIndex', () => {
  it('returns 0 for click at the very start', () => {
    expect(clickPositionToIndex(0, 300, 10)).toBe(0);
  });

  it('returns middle index for click at 50 %', () => {
    // 150 / 300 = 0.5 → floor(0.5 * 10) = 5
    expect(clickPositionToIndex(150, 300, 10)).toBe(5);
  });

  it('returns last index for click at the end', () => {
    // 300 / 300 = 1.0 → floor(1.0 * 10) = 10 → clamped to 9
    expect(clickPositionToIndex(300, 300, 10)).toBe(9);
  });

  it('clamps negative click positions to 0', () => {
    expect(clickPositionToIndex(-10, 300, 10)).toBe(0);
  });

  it('clamps over-width clicks to last index', () => {
    expect(clickPositionToIndex(500, 300, 10)).toBe(9);
  });

  it('handles single item', () => {
    expect(clickPositionToIndex(150, 300, 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// safePercentage
// ---------------------------------------------------------------------------
describe('safePercentage', () => {
  it('returns 0 when total is 0', () => {
    expect(safePercentage(5, 0)).toBe(0);
  });

  it('returns 0 when part is 0', () => {
    expect(safePercentage(0, 10)).toBe(0);
  });

  it('returns 100 when part equals total', () => {
    expect(safePercentage(10, 10)).toBe(100);
  });

  it('rounds correctly', () => {
    // 1/3 ≈ 33.33 → 33
    expect(safePercentage(1, 3)).toBe(33);
    // 2/3 ≈ 66.67 → 67
    expect(safePercentage(2, 3)).toBe(67);
  });

  it('handles large numbers', () => {
    expect(safePercentage(999, 1000)).toBe(100);
  });
});
