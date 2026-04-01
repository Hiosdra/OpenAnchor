/**
 * Egzamin module entry point.
 *
 * Loads the question database from JSON, then renders the React app.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { transformQuestion } from './constants';
import type { RawExamQuestion } from './types';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import examData from '../../../modules/egzamin/exam_questions.json';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');
const root = createRoot(rootEl);

const questions = (examData as unknown as RawExamQuestion[]).map(transformQuestion);
root.render(
  <ErrorBoundary>
    <App questions={questions} />
  </ErrorBoundary>
);
