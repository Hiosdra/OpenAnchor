/**
 * SPA mount/unmount helpers for the Egzamin module.
 *
 * Used by the router to dynamically load this module inside the dashboard
 * without a full page navigation.
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { transformQuestion } from './constants';
import type { RawExamQuestion } from './types';
import './styles.css';

// Vite handles JSON imports natively (resolves relative to project root)
import examData from '../../../modules/egzamin/exam_questions.json';

let root: Root | null = null;

export function mount(container: HTMLElement): void {
  const questions = (examData as unknown as RawExamQuestion[]).map(transformQuestion);
  root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App questions={questions} />
    </ErrorBoundary>,
  );
}

export function unmount(): void {
  root?.unmount();
  root = null;
}
