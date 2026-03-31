/**
 * Constants and helpers for the egzamin module.
 */

import type { CategoryInfo, CategoryColors, EgzaminQuestion, RawExamQuestion } from './types';

export const CATEGORIES: Record<string, CategoryInfo> = {
  JACHTY_ZAGLOWE: { id: 'jachty_zaglowe', name: 'Jachty Żaglowe Morskie', color: 'amber' },
  LOCJA: { id: 'locja', name: 'Locja', color: 'blue' },
  METEOROLOGIA: { id: 'meteorologia', name: 'Meteorologia', color: 'cyan' },
  NAWIGACJA: { id: 'nawigacja', name: 'Nawigacja', color: 'green' },
  PLANOWANIE: { id: 'planowanie', name: 'Planowanie Rejsów', color: 'orange' },
  PRAWO: { id: 'prawo', name: 'Prawo', color: 'indigo' },
  RATOWNICTWO: { id: 'ratownictwo', name: 'Ratownictwo', color: 'red' },
  SYGNALY: { id: 'sygnaly', name: 'Sygnały i Łączność', color: 'purple' },
};

export const CATEGORY_IDS = Object.values(CATEGORIES).map(c => c.id);

const CATEGORY_NAME_TO_ID: Record<string, string> = {
  'JACHTY ŻAGLOWE MORSKIE': 'jachty_zaglowe',
  'LOCJA': 'locja',
  'METEOROLOGIA': 'meteorologia',
  'NAWIGACJA': 'nawigacja',
  'PLANOWANIE REJSÓW': 'planowanie',
  'PRAWO': 'prawo',
  'RATOWNICTWO': 'ratownictwo',
  'SYGNAŁY I ŁĄCZNOŚĆ': 'sygnaly',
};

export const MODES = {
  MENU: 'menu',
  LEARN: 'learn',
  EXAM: 'exam',
  RESULTS: 'results',
  LEITNER_OVERVIEW: 'leitner_overview',
  LEITNER_SESSION: 'leitner_session',
  LEITNER_COMPLETE: 'leitner_complete',
} as const;

export type Mode = (typeof MODES)[keyof typeof MODES];

export const LEITNER_BOX_COUNT = 5;

const CATEGORY_COLOR_MAP: Record<string, CategoryColors> = {
  amber:  { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24', dot: '#f59e0b' },
  blue:   { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa', dot: '#3b82f6' },
  cyan:   { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)', text: '#22d3ee', dot: '#06b6d4' },
  green:  { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', text: '#4ade80', dot: '#22c55e' },
  indigo: { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.3)', text: '#a5b4fc', dot: '#6366f1' },
  orange: { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)', text: '#fb923c', dot: '#f97316' },
  red:    { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171', dot: '#ef4444' },
  purple: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', text: '#c084fc', dot: '#a855f7' },
};

export function getCategoryColors(colorName: string): CategoryColors {
  return CATEGORY_COLOR_MAP[colorName] || CATEGORY_COLOR_MAP.amber;
}

export function getAnswerLabels(answerCount: number): string[] {
  return ['A', 'B', 'C', 'D'].slice(0, answerCount);
}

export function transformQuestion(q: RawExamQuestion): EgzaminQuestion {
  return {
    id: q.id,
    category: CATEGORY_NAME_TO_ID[q.category.toUpperCase()] || q.category.toLowerCase().replace(/\s+/g, '_'),
    correctAnswer: q.correct_answer || 'A',
    answerCount: q.answer_count || 3,
    pdfPage: q.pdf_page,
    cropYStart: q.crop_y_start,
    cropYEnd: q.crop_y_end,
    pageHeight: q.page_height,
  };
}
