import { describe, it, expect } from 'vitest';
import {
  CATEGORIES,
  CATEGORY_IDS,
  MODES,
  LEITNER_BOX_COUNT,
  getCategoryColors,
  getAnswerLabels,
  transformQuestion,
} from '../src/modules/egzamin/constants';
import type { RawExamQuestion } from '../src/modules/egzamin/types';

describe('egzamin/constants', () => {
  // ------------------------------------------------------------------
  // Static constants validation
  // ------------------------------------------------------------------
  describe('CATEGORIES', () => {
    it('has 8 categories', () => {
      expect(Object.keys(CATEGORIES)).toHaveLength(8);
    });

    it('every category has id, name, and color', () => {
      for (const cat of Object.values(CATEGORIES)) {
        expect(cat.id).toBeTruthy();
        expect(cat.name).toBeTruthy();
        expect(cat.color).toBeTruthy();
      }
    });

    it('CATEGORY_IDS matches CATEGORIES values', () => {
      const idsFromCategories = Object.values(CATEGORIES).map((c) => c.id);
      expect(CATEGORY_IDS).toEqual(idsFromCategories);
    });
  });

  describe('MODES', () => {
    it('contains all expected mode values', () => {
      expect(MODES.MENU).toBe('menu');
      expect(MODES.LEARN).toBe('learn');
      expect(MODES.EXAM).toBe('exam');
      expect(MODES.RESULTS).toBe('results');
      expect(MODES.LEITNER_OVERVIEW).toBe('leitner_overview');
      expect(MODES.LEITNER_SESSION).toBe('leitner_session');
      expect(MODES.LEITNER_COMPLETE).toBe('leitner_complete');
    });
  });

  describe('LEITNER_BOX_COUNT', () => {
    it('equals 5', () => {
      expect(LEITNER_BOX_COUNT).toBe(5);
    });
  });

  // ------------------------------------------------------------------
  // getCategoryColors
  // ------------------------------------------------------------------
  describe('getCategoryColors', () => {
    it('returns colors for known color name', () => {
      const colors = getCategoryColors('blue');
      expect(colors.bg).toContain('59, 130, 246');
      expect(colors.border).toBeTruthy();
      expect(colors.text).toBeTruthy();
      expect(colors.dot).toBeTruthy();
    });

    it('returns all 4 color properties', () => {
      for (const colorName of ['amber', 'blue', 'cyan', 'green', 'indigo', 'orange', 'red', 'purple']) {
        const colors = getCategoryColors(colorName);
        expect(Object.keys(colors)).toEqual(['bg', 'border', 'text', 'dot']);
      }
    });

    it('falls back to amber for unknown color', () => {
      const colors = getCategoryColors('nonexistent');
      const amber = getCategoryColors('amber');
      expect(colors).toEqual(amber);
    });
  });

  // ------------------------------------------------------------------
  // getAnswerLabels
  // ------------------------------------------------------------------
  describe('getAnswerLabels', () => {
    it('returns ["A","B","C"] for 3 answers', () => {
      expect(getAnswerLabels(3)).toEqual(['A', 'B', 'C']);
    });

    it('returns ["A","B","C","D"] for 4 answers', () => {
      expect(getAnswerLabels(4)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('returns ["A"] for 1 answer', () => {
      expect(getAnswerLabels(1)).toEqual(['A']);
    });

    it('returns empty for 0 answers', () => {
      expect(getAnswerLabels(0)).toEqual([]);
    });
  });

  // ------------------------------------------------------------------
  // transformQuestion
  // ------------------------------------------------------------------
  describe('transformQuestion', () => {
    const raw: RawExamQuestion = {
      id: 'q42',
      category: 'Nawigacja',
      correct_answer: 'B',
      answer_count: 4,
      pdf_page: 7,
      crop_y_start: 100,
      crop_y_end: 400,
      page_height: 842,
    };

    it('maps known category name to id', () => {
      const q = transformQuestion(raw);
      expect(q.category).toBe('nawigacja');
    });

    it('maps uppercase category correctly', () => {
      const q = transformQuestion({ ...raw, category: 'JACHTY ŻAGLOWE MORSKIE' });
      expect(q.category).toBe('jachty_zaglowe');
    });

    it('handles mixed-case category "Sygnały i Łączność"', () => {
      const q = transformQuestion({ ...raw, category: 'Sygnały i Łączność' });
      expect(q.category).toBe('sygnaly');
    });

    it('falls back to lowercase with underscores for unknown category', () => {
      const q = transformQuestion({ ...raw, category: 'New Category Name' });
      expect(q.category).toBe('new_category_name');
    });

    it('preserves all other fields', () => {
      const q = transformQuestion(raw);
      expect(q.id).toBe('q42');
      expect(q.correctAnswer).toBe('B');
      expect(q.answerCount).toBe(4);
      expect(q.pdfPage).toBe(7);
      expect(q.cropYStart).toBe(100);
      expect(q.cropYEnd).toBe(400);
      expect(q.pageHeight).toBe(842);
    });

    it('defaults correctAnswer to "A" when missing', () => {
      const q = transformQuestion({ ...raw, correct_answer: undefined });
      expect(q.correctAnswer).toBe('A');
    });

    it('defaults answerCount to 3 when missing', () => {
      const q = transformQuestion({ ...raw, answer_count: undefined });
      expect(q.answerCount).toBe(3);
    });
  });
});
