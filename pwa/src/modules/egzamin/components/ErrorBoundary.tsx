import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Wystąpił błąd</h2>
            <p className="text-white/50 mb-4">Odśwież stronę, aby spróbować ponownie.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors"
            >
              Odśwież stronę
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
