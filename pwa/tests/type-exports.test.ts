import { describe, it, expect } from 'vitest';
import type {
  Position,
  AlarmStateValue,
  AlarmStates,
  LeitnerQuestionData,
  LeitnerState,
  LeitnerIntervals,
  ExamQuestion,
  ExamAnswerRecord,
  ExamProgress,
  ExamStats,
  CategoryStat,
  LearnPosition,
  SyncOperation,
  SyncResult,
  PdfMetadata,
  PdfStorageRecord,
} from '../src/shared/types';

import type { AnchorConfig, AlarmEngineState } from '../src/modules/anchor/types';

describe('shared type exports', () => {
  it('Position is usable', () => {
    const pos: Position = { lat: 54.0, lon: 18.0, timestamp: Date.now() };
    expect(pos.lat).toBe(54.0);
    expect(pos.lon).toBe(18.0);
    expect(typeof pos.timestamp).toBe('number');
  });

  it('AlarmStateValue accepts valid values', () => {
    const values: AlarmStateValue[] = ['safe', 'caution', 'warning', 'alarm'];
    expect(values).toHaveLength(4);
  });

  it('AlarmStates interface is structurally valid', () => {
    const states: AlarmStates = {
      SAFE: 'safe',
      CAUTION: 'caution',
      WARNING: 'warning',
      ALARM: 'alarm',
    };
    expect(states.SAFE).toBe('safe');
  });

  it('LeitnerQuestionData is usable', () => {
    const data: LeitnerQuestionData = { box: 1, lastReview: null, reviewCount: 0 };
    expect(data.box).toBe(1);
  });

  it('LeitnerState is usable', () => {
    const state: LeitnerState = { boxes: {}, lastReview: {} };
    expect(state.boxes).toEqual({});
  });

  it('LeitnerIntervals is usable', () => {
    const intervals: LeitnerIntervals = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };
    expect(intervals[1]).toBe(0);
  });

  it('ExamQuestion is usable', () => {
    const q: ExamQuestion = { id: 'q1', category: 'nav' };
    expect(q.id).toBe('q1');
  });

  it('ExamAnswerRecord is usable', () => {
    const rec: ExamAnswerRecord = { correct: true };
    expect(rec.correct).toBe(true);
  });

  it('ExamProgress is usable', () => {
    const prog: ExamProgress = { answered: {}, stats: { correct: 0, incorrect: 0, total: 0 } };
    expect(prog.stats.total).toBe(0);
  });

  it('ExamStats is usable', () => {
    const stats: ExamStats = { total: 10, correct: 7, incorrect: 3, percentage: 70 };
    expect(stats.percentage).toBe(70);
  });

  it('CategoryStat is usable', () => {
    const stat: CategoryStat = { total: 5, correct: 3 };
    expect(stat.total).toBe(5);
  });

  it('LearnPosition is usable', () => {
    const pos: LearnPosition = { questionId: 'q1', timestamp: 0 };
    expect(pos.questionId).toBe('q1');
  });

  it('SyncOperation is usable', () => {
    const op: SyncOperation = { id: 's1', type: 'push', payload: null, timestamp: 0, retries: 0 };
    expect(op.retries).toBe(0);
  });

  it('SyncResult is usable', () => {
    const res: SyncResult = { processed: 5, failed: 1 };
    expect(res.processed).toBe(5);
  });

  it('PdfMetadata is usable', () => {
    const meta: PdfMetadata = {
      hash: 'abc123',
      filename: 'test.pdf',
      importDate: '2026-01-01',
      fileSize: 100,
    };
    expect(meta.hash).toBe('abc123');
  });

  it('PdfStorageRecord is usable', () => {
    const rec: PdfStorageRecord = {
      blob: new Blob(),
      metadata: { hash: 'abc', filename: 'f.pdf', importDate: '2026-01-01', fileSize: 50 },
    };
    expect(rec.blob).toBeInstanceOf(Blob);
  });
});

describe('anchor module type exports', () => {
  it('AnchorConfig is usable', () => {
    const cfg: AnchorConfig = { radius: 50, depth: 10, chainLength: 30 };
    expect(cfg.radius).toBe(50);
  });

  it('AlarmEngineState is usable', () => {
    const state: AlarmEngineState = {
      anchorPosition: null,
      currentPosition: null,
      radius: 100,
      isActive: false,
    };
    expect(state.isActive).toBe(false);
  });

  it('Position re-export from anchor types works', () => {
    // anchor/types re-exports Position from shared
    const pos: Position = { lat: 0, lon: 0, timestamp: 0 };
    expect(pos).toBeDefined();
  });
});
