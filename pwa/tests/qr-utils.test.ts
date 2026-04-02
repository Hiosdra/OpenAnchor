import { describe, it, expect } from 'vitest';
import { buildShareUrlCore } from '../src/modules/wachtownik/utils/qr-utils';
import type { AppState } from '../src/modules/wachtownik/types';

const baseUrl = 'https://example.com/wachtownik/';

const minimalState: AppState = {
  crew: [{ id: 'c1', name: 'Anna', role: 'captain' }],
  slots: [{ id: '1', start: '00:00', end: '12:00', reqCrew: 1 }],
  days: 1,
  startDate: '2026-04-01',
  schedule: [],
  isGenerated: false,
  isNightMode: false,
  captainParticipates: true,
};

describe('buildShareUrlCore', () => {
  it('produces a URL with #share= prefix for editable link', () => {
    const url = buildShareUrlCore(baseUrl, minimalState, false);
    expect(url).toContain('#share=c:');
    expect(url.startsWith(baseUrl)).toBe(true);
  });

  it('produces a URL with #share-readonly= prefix for read-only link', () => {
    const url = buildShareUrlCore(baseUrl, minimalState, true);
    expect(url).toContain('#share-readonly=');
    expect(url.startsWith(baseUrl)).toBe(true);
  });

  it('read-only URL uses base64 encoding (not LZString)', () => {
    const url = buildShareUrlCore(baseUrl, minimalState, true);
    const hash = url.split('#share-readonly=')[1];
    // Should be valid base64 that decodes to URI-encoded JSON
    const decoded = decodeURIComponent(atob(hash));
    const parsed = JSON.parse(decoded);
    expect(parsed.crew).toEqual(minimalState.crew);
  });

  it('editable URL is shorter than read-only (LZString compression)', () => {
    const editUrl = buildShareUrlCore(baseUrl, minimalState, false);
    const readUrl = buildShareUrlCore(baseUrl, minimalState, true);
    // Compressed should be shorter for any non-trivial state
    expect(editUrl.length).toBeLessThanOrEqual(readUrl.length);
  });

  it('handles empty crew', () => {
    const state = { ...minimalState, crew: [] };
    const url = buildShareUrlCore(baseUrl, state, true);
    expect(url).toContain('#share-readonly=');
  });

  it('preserves state round-trip for read-only URL', () => {
    const url = buildShareUrlCore(baseUrl, minimalState, true);
    const encoded = url.split('#share-readonly=')[1];
    const json = decodeURIComponent(atob(encoded));
    const restored = JSON.parse(json);

    expect(restored.days).toBe(minimalState.days);
    expect(restored.startDate).toBe(minimalState.startDate);
    expect(restored.captainParticipates).toBe(minimalState.captainParticipates);
  });

  it('editable URL starts with c: prefix for LZString format', () => {
    const url = buildShareUrlCore(baseUrl, minimalState, false);
    const hash = url.split('#share=')[1];
    expect(hash).toMatch(/^c:/);
  });
});
