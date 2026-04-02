/**
 * Pure utility functions extracted from egzamin UI components.
 * No React / DOM dependencies — fully testable in isolation.
 */

// -- Answer state ----------------------------------------------------------

export type AnswerState = 'default' | 'correct' | 'incorrect' | 'selected';

/**
 * Determine the visual state of an answer button.
 * Logic mirrors AnswerButtonsRow.tsx `getState()`.
 */
export function getAnswerState(
  label: string,
  selectedAnswer: string | null,
  correctAnswer: string,
  showCorrect: boolean,
): AnswerState {
  if (!selectedAnswer) return 'default';
  if (showCorrect && label === correctAnswer) return 'correct';
  if (!showCorrect && label === selectedAnswer) return 'selected';
  if (showCorrect && label === selectedAnswer && label !== correctAnswer) return 'incorrect';
  return 'default';
}

// -- Time formatting -------------------------------------------------------

/** Format seconds as "M:SS" (exam countdown style). */
export function formatExamTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// -- Exam result calculation -----------------------------------------------

export interface QuestionStub {
  id: number;
  correctAnswer: string;
}

export interface ExamResultEntry {
  questionId: number;
  userAnswer: string | null;
  correct: boolean;
}

/**
 * Map questions + user answers into a results array.
 * Logic mirrors ExamScreen.tsx `handleFinishExam()`.
 */
export function calculateExamResults(
  questions: QuestionStub[],
  answers: Record<number, string>,
): ExamResultEntry[] {
  return questions.map((q) => ({
    questionId: q.id,
    userAnswer: answers[q.id] || null,
    correct: answers[q.id] === q.correctAnswer,
  }));
}

// -- Pass / fail -----------------------------------------------------------

export interface PassStatus {
  pct: number;
  passed: boolean;
}

/** Calculate pass percentage and status (70 % threshold). */
export function calculatePassStatus(correct: number, total: number): PassStatus {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = pct >= 70;
  return { pct, passed };
}

// -- Time-taken breakdown --------------------------------------------------

export interface TimeParts {
  minutes: number;
  seconds: number;
}

/** Split raw seconds into minutes + remaining seconds. */
export function formatTimeTaken(timeTaken: number): TimeParts {
  return {
    minutes: Math.floor(timeTaken / 60),
    seconds: timeTaken % 60,
  };
}

// -- Category counting -----------------------------------------------------

/** Count how many questions belong to each category. */
export function countByCategory(
  questions: Array<{ category: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  questions.forEach((q) => {
    if (!counts[q.category]) counts[q.category] = 0;
    counts[q.category]++;
  });
  return counts;
}

// -- Progress-bar click → index --------------------------------------------

/**
 * Convert a click position on the progress bar into a question index.
 * Logic mirrors ProgressBar.tsx `handleClick()`.
 */
export function clickPositionToIndex(
  clickX: number,
  totalWidth: number,
  totalItems: number,
): number {
  const clickedPct = clickX / totalWidth;
  const targetIndex = Math.floor(clickedPct * totalItems);
  return Math.max(0, Math.min(totalItems - 1, targetIndex));
}

// -- Safe percentage -------------------------------------------------------

/** Calculate a rounded percentage, returning 0 when total is 0. */
export function safePercentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
