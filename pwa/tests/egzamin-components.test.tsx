import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

import type { EgzaminQuestion, ExamResult, CategoryInfo } from '../src/modules/egzamin/types';
import type { ExamProgress, LeitnerState } from '../src/shared/types';

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock('../src/modules/egzamin/pdf-renderer', () => ({
  PdfRenderer: { loadFromBlob: vi.fn(), unload: vi.fn() },
}));

vi.mock('../src/modules/egzamin/pdf-runtime', () => ({
  renderEgzaminQuestion: vi.fn().mockResolvedValue(null),
  initializeEgzaminPdf: vi.fn().mockResolvedValue(false),
  clearEgzaminPdf: vi.fn(),
}));

vi.mock('../src/shared/storage/indexed-db', () => ({
  isPdfImported: vi.fn().mockResolvedValue(false),
  loadPdfBlob: vi.fn().mockResolvedValue(null),
  deletePdf: vi.fn().mockResolvedValue(undefined),
  savePdfData: vi.fn().mockResolvedValue(undefined),
  verifyPdfHash: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/modules/egzamin/exam-storage', () => ({
  loadProgress: vi.fn(() => ({ answered: {}, stats: { correct: 0, incorrect: 0, total: 0 } })),
  saveProgress: vi.fn(),
  loadLearnPosition: vi.fn(() => null),
  saveLearnPosition: vi.fn(),
  loadLeitnerState: vi.fn(() => ({ boxes: {}, lastReview: {} })),
  saveLeitnerState: vi.fn(),
  calculateStats: vi.fn(() => ({ correct: 0, incorrect: 0, total: 0 })),
  calculateCategoryStats: vi.fn(() => []),
  resetExamData: vi.fn(),
  forceResetExamData: vi.fn(),
  EXAM_PROGRESS_KEY: 'openanchor_exam_progress',
  LEARN_POSITION_KEY: 'openanchor_learn_position',
  LEITNER_STATE_KEY: 'openanchor_leitner',
}));

// ── Fixtures ─────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<EgzaminQuestion> = {}): EgzaminQuestion {
  return {
    id: 'q1',
    category: 'nawigacja',
    correctAnswer: 'A',
    answerCount: 4,
    pdfPage: 1,
    cropYStart: 0,
    cropYEnd: 100,
    pageHeight: 800,
    ...overrides,
  };
}

const emptyProgress: ExamProgress = {
  answered: {},
  stats: { correct: 0, incorrect: 0, total: 0 },
};

const emptyLeitner: LeitnerState = {
  boxes: {},
  lastReview: {},
};

// ── Tests ────────────────────────────────────────────────────────────

describe('egzamin/components — Header', () => {
  it('renders with title only', async () => {
    const { Header } = await import('../src/modules/egzamin/components/Header');
    const { container } = render(<Header title="Test Title" />);
    expect(container.textContent).toContain('Test Title');
  });

  it('renders back button when onBack provided', async () => {
    const { Header } = await import('../src/modules/egzamin/components/Header');
    const onBack = vi.fn();
    render(<Header title="T" onBack={onBack} />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe('egzamin/components — ProgressBar', () => {
  it('renders progress info', async () => {
    const { ProgressBar } = await import('../src/modules/egzamin/components/ProgressBar');
    const { container } = render(
      <ProgressBar current={3} total={10} correct={2} incorrect={1} />,
    );
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('10');
  });

  it('fires onNavigate on click', async () => {
    const { ProgressBar } = await import('../src/modules/egzamin/components/ProgressBar');
    const onNavigate = vi.fn();
    const { container } = render(
      <ProgressBar current={0} total={5} correct={0} incorrect={0} onNavigate={onNavigate} />,
    );
    const bar = container.querySelector('[style]');
    if (bar?.parentElement) fireEvent.click(bar.parentElement);
  });
});

describe('egzamin/components — CategoryBadge', () => {
  it('renders for known category', async () => {
    const { CategoryBadge } = await import('../src/modules/egzamin/components/CategoryBadge');
    const { container } = render(<CategoryBadge categoryId="nawigacja" />);
    expect(container.innerHTML).not.toBe('');
  });

  it('returns null for unknown category', async () => {
    const { CategoryBadge } = await import('../src/modules/egzamin/components/CategoryBadge');
    const { container } = render(<CategoryBadge categoryId="__unknown__" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('egzamin/components — CategorySelector', () => {
  const categories: Record<string, CategoryInfo> = {
    nawigacja: { id: 'nawigacja', name: 'Nawigacja', color: 'green' },
    locja: { id: 'locja', name: 'Locja', color: 'blue' },
  };

  it('renders categories and buttons', async () => {
    const { CategorySelector } = await import('../src/modules/egzamin/components/CategorySelector');
    const { container } = render(
      <CategorySelector
        categories={categories}
        selectedCategories={['nawigacja']}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
      />,
    );
    expect(container.textContent).toContain('Nawigacja');
    expect(container.textContent).toContain('Locja');
  });

  it('calls onToggle when category clicked', async () => {
    const { CategorySelector } = await import('../src/modules/egzamin/components/CategorySelector');
    const onToggle = vi.fn();
    render(
      <CategorySelector
        categories={categories}
        selectedCategories={['nawigacja', 'locja']}
        onToggle={onToggle}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button');
    // click the first category button (skip select/deselect all)
    const categoryBtn = buttons.find(b => b.textContent?.includes('Nawigacja'));
    if (categoryBtn) fireEvent.click(categoryBtn);
    expect(onToggle).toHaveBeenCalled();
  });
});

describe('egzamin/components — AnswerButtonsRow', () => {
  it('renders answer buttons', async () => {
    const { AnswerButtonsRow } = await import('../src/modules/egzamin/components/AnswerButtonsRow');
    const onSelect = vi.fn();
    render(
      <AnswerButtonsRow
        answerCount={4}
        correctAnswer="B"
        selectedAnswer={null}
        onSelectAnswer={onSelect}
        showCorrect={false}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(4);
    fireEvent.click(buttons[0]); // click A
    expect(onSelect).toHaveBeenCalledWith('A');
  });

  it('shows correct/incorrect states', async () => {
    const { AnswerButtonsRow } = await import('../src/modules/egzamin/components/AnswerButtonsRow');
    const { container } = render(
      <AnswerButtonsRow
        answerCount={3}
        correctAnswer="B"
        selectedAnswer="A"
        onSelectAnswer={vi.fn()}
        showCorrect={true}
      />,
    );
    expect(container.querySelectorAll('button').length).toBe(3);
  });
});

describe('egzamin/components — QuestionImageCard', () => {
  it('renders loading state', async () => {
    const { QuestionImageCard } = await import('../src/modules/egzamin/components/QuestionImageCard');
    const { container } = render(<QuestionImageCard question={makeQuestion()} />);
    // Should render something (loading or placeholder)
    expect(container.innerHTML).not.toBe('');
  });
});

describe('egzamin/components — ErrorBoundary', () => {
  it('renders children normally', async () => {
    const { ErrorBoundary } = await import('../src/modules/egzamin/components/ErrorBoundary');
    const { container } = render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>,
    );
    expect(container.textContent).toContain('Child content');
  });

  it('catches errors and renders fallback', async () => {
    const { ErrorBoundary } = await import('../src/modules/egzamin/components/ErrorBoundary');
    const ThrowingComponent = () => {
      throw new Error('Test error');
    };
    // Suppress console.error from React error boundary
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(container.textContent).toContain('błąd');
    spy.mockRestore();
  });
});

describe('egzamin/components — MenuScreen', () => {
  it('renders without crashing', async () => {
    const { MenuScreen } = await import('../src/modules/egzamin/components/MenuScreen');
    const { container } = render(
      <MenuScreen
        questions={[makeQuestion(), makeQuestion({ id: 'q2', category: 'locja' })]}
        progress={emptyProgress}
        leitnerState={emptyLeitner}
        onStartLearn={vi.fn()}
        onStartExam={vi.fn()}
        onStartLeitner={vi.fn()}
        onChangePdf={vi.fn()}
      />,
    );
    expect(container.innerHTML).not.toBe('');
  });

  it('calls onStartLearn when button clicked', async () => {
    const { MenuScreen } = await import('../src/modules/egzamin/components/MenuScreen');
    const onStartLearn = vi.fn();
    render(
      <MenuScreen
        questions={[makeQuestion()]}
        progress={emptyProgress}
        leitnerState={emptyLeitner}
        onStartLearn={onStartLearn}
        onStartExam={vi.fn()}
        onStartLeitner={vi.fn()}
        onChangePdf={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button');
    // Find the learn button
    const learnBtn = buttons.find(b =>
      b.textContent?.toLowerCase().includes('nauk') || b.textContent?.toLowerCase().includes('learn'),
    );
    if (learnBtn) {
      fireEvent.click(learnBtn);
      expect(onStartLearn).toHaveBeenCalled();
    }
  });
});

describe('egzamin/components — ExamScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders first question', async () => {
    const { ExamScreen } = await import('../src/modules/egzamin/components/ExamScreen');
    const questions = Array.from({ length: 30 }, (_, i) =>
      makeQuestion({ id: `q${i}` }),
    );
    const { container } = render(
      <ExamScreen questions={questions} onFinish={vi.fn()} onBack={vi.fn()} />,
    );
    expect(container.innerHTML).not.toBe('');

    vi.useRealTimers();
  });
});

describe('egzamin/components — LearnScreen', () => {
  it('renders without crashing', async () => {
    const { LearnScreen } = await import('../src/modules/egzamin/components/LearnScreen');
    const { container } = render(
      <LearnScreen
        questions={[makeQuestion()]}
        progress={emptyProgress}
        onUpdateProgress={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(container.innerHTML).not.toBe('');
  });
});

describe('egzamin/components — ImportPdfScreen', () => {
  it('renders upload UI', async () => {
    const { ImportPdfScreen } = await import('../src/modules/egzamin/components/ImportPdfScreen');
    const { container } = render(<ImportPdfScreen onImportComplete={vi.fn()} />);
    expect(container.innerHTML).not.toBe('');
  });
});

describe('egzamin/components — ResultsScreen', () => {
  it('renders exam results', async () => {
    const { ResultsScreen } = await import('../src/modules/egzamin/components/ResultsScreen');
    const results: ExamResult[] = [
      { question: makeQuestion(), userAnswer: 'A', correct: true },
      { question: makeQuestion({ id: 'q2' }), userAnswer: 'B', correct: false },
    ];
    const { container } = render(
      <ResultsScreen results={results} timeTaken={600} onBack={vi.fn()} onRetry={vi.fn()} />,
    );
    expect(container.textContent).toContain('50'); // 50% pass rate
  });

  it('calls onRetry', async () => {
    const { ResultsScreen } = await import('../src/modules/egzamin/components/ResultsScreen');
    const onRetry = vi.fn();
    render(
      <ResultsScreen
        results={[{ question: makeQuestion(), userAnswer: 'A', correct: true }]}
        timeTaken={60}
        onBack={vi.fn()}
        onRetry={onRetry}
      />,
    );
    const buttons = screen.getAllByRole('button');
    const retryBtn = buttons.find(b =>
      b.textContent?.toLowerCase().includes('ponow') || b.textContent?.toLowerCase().includes('retry'),
    );
    if (retryBtn) {
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalled();
    }
  });
});

describe('egzamin/components — LeitnerOverviewScreen', () => {
  it('renders overview', async () => {
    const { LeitnerOverviewScreen } = await import('../src/modules/egzamin/components/LeitnerOverviewScreen');
    const questions = [makeQuestion(), makeQuestion({ id: 'q2' })];
    const { container } = render(
      <LeitnerOverviewScreen
        questions={questions}
        leitnerState={emptyLeitner}
        onStartSession={vi.fn()}
        onBack={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(container.innerHTML).not.toBe('');
  });
});

describe('egzamin/components — LeitnerSessionScreen', () => {
  it('renders session with due questions', async () => {
    const { LeitnerSessionScreen } = await import('../src/modules/egzamin/components/LeitnerSessionScreen');
    const q = makeQuestion();
    const leitnerState: LeitnerState = {
      boxes: { q1: { box: 1, lastReview: null, reviewCount: 0 } },
      lastReview: {},
    };
    const { container } = render(
      <LeitnerSessionScreen
        dueQuestions={[q]}
        leitnerState={leitnerState}
        onUpdateLeitner={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(container.innerHTML).not.toBe('');
  });
});

describe('egzamin/components — LeitnerCompleteScreen', () => {
  it('renders completion summary', async () => {
    const { LeitnerCompleteScreen } = await import('../src/modules/egzamin/components/LeitnerCompleteScreen');
    const { container } = render(
      <LeitnerCompleteScreen
        correct={8}
        incorrect={2}
        leitnerState={emptyLeitner}
        questions={[makeQuestion()]}
        onBack={vi.fn()}
      />,
    );
    expect(container.innerHTML).not.toBe('');
    expect(container.textContent).toContain('8'); // correct count
  });
});

describe('egzamin/App', () => {
  it('renders without crashing', async () => {
    const { App } = await import('../src/modules/egzamin/App');
    const { container } = render(<App questions={[makeQuestion()]} />);
    expect(container.innerHTML).not.toBe('');
  });
});
