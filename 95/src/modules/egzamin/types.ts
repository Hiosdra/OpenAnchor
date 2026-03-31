/**
 * Local types for the egzamin (exam) module.
 */

import type { ExamQuestion, LeitnerState } from '../../shared/types/index';

export type { LeitnerState };

export interface EgzaminQuestion extends ExamQuestion {
  correctAnswer: string;
  answerCount: number;
  pdfPage: number;
  cropYStart: number;
  cropYEnd: number;
  pageHeight: number;
}

export interface RawExamQuestion {
  id: string;
  category: string;
  correct_answer?: string;
  answer_count?: number;
  pdf_page: number;
  crop_y_start: number;
  crop_y_end: number;
  page_height: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
}

export interface ExamResult {
  question: EgzaminQuestion;
  userAnswer: string | null;
  correct: boolean;
}

export interface CategoryColors {
  bg: string;
  border: string;
  text: string;
  dot: string;
}
