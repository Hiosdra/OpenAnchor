import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EgzaminQuestion } from '../src/modules/egzamin/types';

const runtime = vi.hoisted(() => ({
  initialize: vi.fn(),
  clear: vi.fn(),
  saveProgress: vi.fn(),
  saveLeitner: vi.fn(),
}));

vi.mock('../src/modules/egzamin/pdf-runtime', () => ({
  initializeEgzaminPdf: runtime.initialize,
  clearEgzaminPdf: runtime.clear,
}));

vi.mock('../src/modules/egzamin/exam-storage', () => ({
  loadProgress: () => ({ answered: {}, stats: { correct: 0, incorrect: 0, total: 0 } }),
  saveProgress: runtime.saveProgress,
  loadLeitnerState: () => ({ boxes: { q1: 1 }, lastReview: {} }),
  saveLeitnerState: runtime.saveLeitner,
}));

vi.mock('../src/modules/egzamin/helpers', () => ({
  getDueQuestions: (_state: unknown, questions: EgzaminQuestion[]) => questions,
}));

vi.mock('../src/modules/egzamin/components/ImportPdfScreen', () => ({
  ImportPdfScreen: ({ onImportComplete }: { onImportComplete: () => void }) => (
    <button onClick={onImportComplete}>complete-import</button>
  ),
}));

vi.mock('../src/modules/egzamin/components/MenuScreen', () => ({
  MenuScreen: (props: Record<string, () => void>) => (
    <div>
      <span>menu-screen</span>
      <button onClick={props.onStartLearn}>start-learn</button>
      <button onClick={props.onStartExam}>start-exam</button>
      <button onClick={props.onStartLeitner}>start-leitner</button>
      <button onClick={props.onChangePdf}>change-pdf</button>
    </div>
  ),
}));

vi.mock('../src/modules/egzamin/components/LearnScreen', () => ({
  LearnScreen: (props: Record<string, (...args: unknown[]) => void>) => (
    <div>
      <span>learn-screen</span>
      <button
        onClick={() =>
          props.onUpdateProgress({
            answered: { q1: { answer: 'A', correct: true, timestamp: 1 } },
            stats: { correct: 1, incorrect: 0, total: 1 },
          })
        }
      >
        update-progress
      </button>
      <button onClick={() => props.onBack()}>learn-back</button>
    </div>
  ),
}));

vi.mock('../src/modules/egzamin/components/ExamScreen', () => ({
  ExamScreen: (props: Record<string, (...args: unknown[]) => void>) => (
    <div>
      <span>exam-screen</span>
      <button onClick={() => props.onFinish([{ questionId: 'q1', answer: 'A' }], 42)}>
        finish-exam
      </button>
      <button onClick={() => props.onBack()}>exam-back</button>
    </div>
  ),
}));

vi.mock('../src/modules/egzamin/components/ResultsScreen', () => ({
  ResultsScreen: (props: Record<string, () => void>) => (
    <div>
      <span>results-screen</span>
      <button onClick={props.onRetry}>retry-exam</button>
      <button onClick={props.onBack}>results-back</button>
    </div>
  ),
}));

vi.mock('../src/modules/egzamin/components/LeitnerOverviewScreen', () => ({
  LeitnerOverviewScreen: (props: Record<string, () => void>) => (
    <div>
      <span>leitner-overview</span>
      <button onClick={props.onStartSession}>start-session</button>
      <button onClick={props.onReset}>reset-leitner</button>
      <button onClick={props.onBack}>overview-back</button>
    </div>
  ),
}));

vi.mock('../src/modules/egzamin/components/LeitnerSessionScreen', () => ({
  LeitnerSessionScreen: (props: Record<string, (...args: unknown[]) => void>) => (
    <div>
      <span>leitner-session</span>
      <button onClick={() => props.onUpdateLeitner({ boxes: { q1: 2 }, lastReview: {} })}>
        update-leitner
      </button>
      <button onClick={() => props.onComplete(3, 1, { boxes: { q1: 3 }, lastReview: { q1: 1 } })}>
        complete-leitner
      </button>
      <button onClick={() => props.onBack()}>session-back</button>
    </div>
  ),
}));

vi.mock('../src/modules/egzamin/components/LeitnerCompleteScreen', () => ({
  LeitnerCompleteScreen: (props: Record<string, () => void>) => (
    <div>
      <span>leitner-complete</span>
      <button onClick={props.onBack}>complete-back</button>
    </div>
  ),
}));

const question: EgzaminQuestion = {
  id: 'q1',
  category: 'nawigacja',
  correctAnswer: 'A',
  answerCount: 4,
  pdfPage: 1,
  cropYStart: 0,
  cropYEnd: 100,
  pageHeight: 800,
};

describe('Egzamin App orchestration', () => {
  beforeEach(() => {
    runtime.initialize.mockReset();
    runtime.clear.mockReset().mockResolvedValue(undefined);
    runtime.saveProgress.mockReset();
    runtime.saveLeitner.mockReset();
  });

  afterEach(cleanup);

  it('handles PDF initialization failure, import completion, and PDF replacement', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    runtime.initialize.mockRejectedValueOnce(new Error('broken PDF'));
    const { App } = await import('../src/modules/egzamin/App');
    render(<App questions={[question]} />);

    await waitFor(() => expect(screen.getByText('complete-import')).toBeTruthy());
    fireEvent.click(screen.getByText('complete-import'));
    expect(screen.getByText('menu-screen')).toBeTruthy();

    fireEvent.click(screen.getByText('change-pdf'));
    await waitFor(() => expect(screen.getByText('complete-import')).toBeTruthy());
    expect(runtime.clear).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });

  it('drives learn, exam, results, and every Leitner mode', async () => {
    runtime.initialize.mockResolvedValue(true);
    const { App } = await import('../src/modules/egzamin/App');
    render(<App questions={[question]} />);
    await waitFor(() => expect(screen.getByText('menu-screen')).toBeTruthy());

    fireEvent.click(screen.getByText('start-learn'));
    fireEvent.click(screen.getByText('update-progress'));
    expect(runtime.saveProgress).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('learn-back'));

    fireEvent.click(screen.getByText('start-exam'));
    fireEvent.click(screen.getByText('exam-back'));
    fireEvent.click(screen.getByText('start-exam'));
    fireEvent.click(screen.getByText('finish-exam'));
    expect(screen.getByText('results-screen')).toBeTruthy();
    fireEvent.click(screen.getByText('retry-exam'));
    expect(screen.getByText('exam-screen')).toBeTruthy();
    fireEvent.click(screen.getByText('finish-exam'));
    fireEvent.click(screen.getByText('results-back'));

    fireEvent.click(screen.getByText('start-leitner'));
    fireEvent.click(screen.getByText('reset-leitner'));
    fireEvent.click(screen.getByText('start-session'));
    fireEvent.click(screen.getByText('update-leitner'));
    fireEvent.click(screen.getByText('session-back'));
    fireEvent.click(screen.getByText('start-session'));
    fireEvent.click(screen.getByText('complete-leitner'));
    expect(screen.getByText('leitner-complete')).toBeTruthy();
    fireEvent.click(screen.getByText('complete-back'));
    fireEvent.click(screen.getByText('overview-back'));

    expect(screen.getByText('menu-screen')).toBeTruthy();
    expect(runtime.saveLeitner).toHaveBeenCalledTimes(3);
  });
});
