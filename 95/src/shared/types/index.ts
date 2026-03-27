/** Shared TypeScript types for the OpenAnchor PWA */

export interface Position {
  lat: number;
  lon: number;
  timestamp: number;
}

export type AlarmStateValue = 'safe' | 'caution' | 'warning' | 'alarm';

export interface AlarmStates {
  readonly SAFE: 'safe';
  readonly CAUTION: 'caution';
  readonly WARNING: 'warning';
  readonly ALARM: 'alarm';
}

export interface LeitnerQuestionData {
  box: number;
  lastReview: number | null;
  reviewCount: number;
}

export interface LeitnerState {
  boxes: Record<string, LeitnerQuestionData>;
  lastReview: Record<string, unknown>;
}

export interface LeitnerIntervals {
  readonly 1: number;
  readonly 2: number;
  readonly 3: number;
  readonly 4: number;
  readonly 5: number;
}

export interface ExamQuestion {
  id: string;
  category: string;
  [key: string]: unknown;
}

export interface ExamAnswerRecord {
  correct: boolean;
  [key: string]: unknown;
}

export interface ExamProgress {
  answered: Record<string, ExamAnswerRecord>;
  stats: {
    correct: number;
    incorrect: number;
    total: number;
  };
}

export interface ExamStats {
  total: number;
  correct: number;
  incorrect: number;
  percentage: number;
}

export interface CategoryStat {
  total: number;
  correct: number;
  percentage?: number;
}

export interface LearnPosition {
  questionId: string;
  timestamp: number;
}

export interface SyncOperation {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

export interface SyncResult {
  processed: number;
  failed: number;
}

export interface PdfMetadata {
  [key: string]: unknown;
}

export interface PdfStorageRecord {
  blob: Blob;
  metadata: PdfMetadata;
}
