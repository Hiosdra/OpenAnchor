/**
 * Leitner and storage helper wrappers for the egzamin module.
 *
 * Thin wrappers that bridge the generic leitner/storage modules
 * with the egzamin-specific EgzaminQuestion type.
 */

import type { LeitnerState, EgzaminQuestion } from './types';
import type { ExamQuestion } from '../../shared/types/index';
import {
  isDueForReview as leitnerIsDue,
  getDueQuestions as leitnerGetDue,
  updateLeitnerState,
} from './leitner';

export function getBoxForQuestion(leitnerState: LeitnerState, questionId: string): number {
  const qData = leitnerState.boxes?.[questionId];
  return qData?.box || 1;
}

export function getBoxCounts(leitnerState: LeitnerState, questions: EgzaminQuestion[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  questions.forEach(q => {
    const box = getBoxForQuestion(leitnerState, q.id);
    counts[box - 1]++;
  });
  return counts;
}

export function isDueForReview(leitnerState: LeitnerState, questionId: string): boolean {
  const qData = leitnerState.boxes?.[questionId];
  return leitnerIsDue(qData);
}

export function getDueQuestions(leitnerState: LeitnerState, questions: EgzaminQuestion[]): EgzaminQuestion[] {
  return leitnerGetDue(leitnerState, questions as ExamQuestion[]) as EgzaminQuestion[];
}

export function advanceQuestion(leitnerState: LeitnerState, questionId: string, correct: boolean): LeitnerState {
  return updateLeitnerState(leitnerState, questionId, correct);
}

export { getLeitnerStats } from './leitner';
