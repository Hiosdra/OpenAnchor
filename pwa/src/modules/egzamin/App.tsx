import React, { useState, useEffect, useCallback } from 'react';
import type { EgzaminQuestion, ExamResult, LeitnerState } from './types';
import type { ExamProgress } from '../../shared/types/index';
import { MODES } from './constants';
import type { Mode } from './constants';
import { getDueQuestions } from './helpers';
import { loadProgress, saveProgress, loadLeitnerState, saveLeitnerState } from './exam-storage';
import { isPdfImported, loadPdfBlob, deletePdf } from '../../shared/storage/indexed-db';
import { PdfRenderer } from './pdf-renderer';

import { ImportPdfScreen } from './components/ImportPdfScreen';
import { MenuScreen } from './components/MenuScreen';
import { LearnScreen } from './components/LearnScreen';
import { ExamScreen } from './components/ExamScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { LeitnerOverviewScreen } from './components/LeitnerOverviewScreen';
import { LeitnerSessionScreen } from './components/LeitnerSessionScreen';
import { LeitnerCompleteScreen } from './components/LeitnerCompleteScreen';

interface AppProps {
  questions: EgzaminQuestion[];
}

export function App({ questions }: AppProps) {
  const [pdfReady, setPdfReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [mode, setMode] = useState<Mode>(MODES.MENU);
  const [progress, setProgress] = useState<ExamProgress>(loadProgress);
  const [leitnerState, setLeitnerState] = useState<LeitnerState>(loadLeitnerState);
  const [examResults, setExamResults] = useState<ExamResult[] | null>(null);
  const [examTime, setExamTime] = useState(0);
  const [leitnerSessionQuestions, setLeitnerSessionQuestions] = useState<EgzaminQuestion[]>([]);
  const [leitnerSessionCorrect, setLeitnerSessionCorrect] = useState(0);
  const [leitnerSessionIncorrect, setLeitnerSessionIncorrect] = useState(0);

  useEffect(() => {
    async function init() {
      try {
        const imported = await isPdfImported();
        if (imported) {
          const blob = await loadPdfBlob();
          if (blob) {
            await PdfRenderer.loadFromBlob(blob);
            setPdfReady(true);
          }
        }
      } catch (err) {
        console.error('Failed to initialize PDF:', err);
      }
      setInitializing(false);
    }
    init();
  }, []);

  const handleChangePdf = useCallback(async () => {
    PdfRenderer.unload();
    await deletePdf();
    setPdfReady(false);
  }, []);

  const updateProgress = useCallback((newProgress: ExamProgress) => {
    setProgress(newProgress);
    saveProgress(newProgress);
  }, []);

  const updateLeitner = useCallback((newState: LeitnerState) => {
    setLeitnerState(newState);
    saveLeitnerState(newState);
  }, []);

  const handleExamFinish = useCallback((results: ExamResult[], timeTaken: number) => {
    setExamResults(results);
    setExamTime(timeTaken);
    setMode(MODES.RESULTS);
  }, []);

  const handleStartLeitnerSession = useCallback(() => {
    const due = getDueQuestions(leitnerState, questions);
    if (due.length === 0) return;

    const shuffled = [...due].sort(() => Math.random() - 0.5);
    setLeitnerSessionQuestions(shuffled);
    setMode(MODES.LEITNER_SESSION);
  }, [leitnerState, questions]);

  const handleLeitnerComplete = useCallback((correct: number, incorrect: number, finalState: LeitnerState) => {
    setLeitnerSessionCorrect(correct);
    setLeitnerSessionIncorrect(incorrect);
    setLeitnerState(finalState);
    saveLeitnerState(finalState);
    setMode(MODES.LEITNER_COMPLETE);
  }, []);

  const handleResetLeitner = useCallback(() => {
    const freshState: LeitnerState = { boxes: {}, lastReview: {} };
    setLeitnerState(freshState);
    saveLeitnerState(freshState);
  }, []);

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-sm text-white/50">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!pdfReady) {
    return <ImportPdfScreen onImportComplete={() => setPdfReady(true)} />;
  }

  switch (mode) {
    case MODES.MENU:
      return (
        <MenuScreen
          questions={questions}
          progress={progress}
          leitnerState={leitnerState}
          onStartLearn={() => setMode(MODES.LEARN)}
          onStartExam={() => setMode(MODES.EXAM)}
          onStartLeitner={() => setMode(MODES.LEITNER_OVERVIEW)}
          onChangePdf={handleChangePdf}
        />
      );
    case MODES.LEARN:
      return (
        <LearnScreen
          questions={questions}
          progress={progress}
          onUpdateProgress={updateProgress}
          onBack={() => setMode(MODES.MENU)}
        />
      );
    case MODES.EXAM:
      return (
        <ExamScreen
          questions={questions}
          onFinish={handleExamFinish}
          onBack={() => setMode(MODES.MENU)}
        />
      );
    case MODES.RESULTS:
      return (
        <ResultsScreen
          results={examResults!}
          timeTaken={examTime}
          onBack={() => setMode(MODES.MENU)}
          onRetry={() => setMode(MODES.EXAM)}
        />
      );
    case MODES.LEITNER_OVERVIEW:
      return (
        <LeitnerOverviewScreen
          questions={questions}
          leitnerState={leitnerState}
          onStartSession={handleStartLeitnerSession}
          onBack={() => setMode(MODES.MENU)}
          onReset={handleResetLeitner}
        />
      );
    case MODES.LEITNER_SESSION:
      return (
        <LeitnerSessionScreen
          dueQuestions={leitnerSessionQuestions}
          leitnerState={leitnerState}
          onUpdateLeitner={updateLeitner}
          onComplete={handleLeitnerComplete}
          onBack={() => setMode(MODES.LEITNER_OVERVIEW)}
        />
      );
    case MODES.LEITNER_COMPLETE:
      return (
        <LeitnerCompleteScreen
          correct={leitnerSessionCorrect}
          incorrect={leitnerSessionIncorrect}
          leitnerState={leitnerState}
          questions={questions}
          onBack={() => setMode(MODES.LEITNER_OVERVIEW)}
        />
      );
    default:
      return null;
  }
}
