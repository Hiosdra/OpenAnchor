import { describe, it, expect } from 'vitest';

describe('shared/components smoke tests', () => {
  it('ErrorBoundary exports a class', async () => {
    const mod = await import('../src/shared/components/ErrorBoundary');
    expect(mod.ErrorBoundary).toBeDefined();
    expect(typeof mod.ErrorBoundary).toBe('function');
  });

  it('BackButton exports a component', async () => {
    const mod = await import('../src/shared/components/BackButton');
    expect(mod.BackButton).toBeDefined();
    expect(typeof mod.BackButton).toBe('function');
  });
});
