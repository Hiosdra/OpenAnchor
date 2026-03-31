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

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');
const root = createRoot(rootEl);

fetch('exam_questions.json')
  .then(r => r.json())
  .then((data: RawExamQuestion[]) => {
    const questions = data.map(transformQuestion);
    root.render(
      <ErrorBoundary>
        <App questions={questions} />
      </ErrorBoundary>
    );
  })
  .catch(err => {
    console.error('Failed to load exam questions:', err);
    root.render(
      <div className="flex items-center justify-center min-h-screen text-red-400">
        <p>Błąd ładowania pytań. Odśwież stronę.</p>
      </div>
    );
  });
