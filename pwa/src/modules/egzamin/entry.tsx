/**
 * Egzamin module entry point.
 *
 * Loads the question database from JSON, then renders the React app.
 */

import './styles.css';
import { initBackground } from '../../shared/init-background';

import React from 'react';

initBackground();
import { createRoot } from 'react-dom/client';
import { transformQuestion } from './constants';
import type { RawExamQuestion } from './types';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import examData from '../../../modules/egzamin/exam_questions.json';

// Apply early theme
document.documentElement.dataset.theme = localStorage.getItem('openanchor-theme') || 'dark';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');
const root = createRoot(rootEl);

const questions = (examData as unknown as RawExamQuestion[]).map(transformQuestion);
root.render(
  <ErrorBoundary>
    <App questions={questions} />
  </ErrorBoundary>
);
