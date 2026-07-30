import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackButton } from '../src/shared/components/BackButton';
import { ErrorBoundary } from '../src/shared/components/ErrorBoundary';

afterEach(cleanup);

describe('shared components behavior', () => {
  it('follows the default back link when no callback is supplied', () => {
    render(<BackButton />);
    expect(screen.getByRole('link', { name: '← Powrót' }).getAttribute('href')).toBe('../');
  });

  it('prevents navigation and delegates custom back actions', () => {
    const onClick = vi.fn();
    render(<BackButton href="/menu" label="Menu" onClick={onClick} />);

    const link = screen.getByRole('link', { name: 'Menu' });
    const accepted = fireEvent.click(link);
    expect(accepted).toBe(false);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders children when no descendant throws', () => {
    render(
      <ErrorBoundary>
        <div>Healthy content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Healthy content')).toBeTruthy();
  });

  it('renders a custom fallback after an error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Thrower = () => {
      throw new Error('boom');
    };

    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <Thrower />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback')).toBeTruthy();
    consoleSpy.mockRestore();
  });

  it('shows the default error details and retries rendering', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    const ThrowOnce = () => {
      if (shouldThrow) throw new Error('temporary failure');
      return <div>Recovered content</div>;
    };

    render(
      <ErrorBoundary>
        <ThrowOnce />
      </ErrorBoundary>,
    );
    expect(screen.getByText('temporary failure')).toBeTruthy();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(screen.getByText('Recovered content')).toBeTruthy();
    consoleSpy.mockRestore();
  });
});
