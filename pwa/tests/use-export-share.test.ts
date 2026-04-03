import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppState } from '../src/modules/wachtownik/types';

const generateQRCodeMock = vi.fn();

vi.mock('../src/modules/wachtownik/utils/pdf-export', () => ({
  exportScheduleToPDF: vi.fn(),
}));

vi.mock('../src/modules/wachtownik/utils/qr-utils', async () => {
  const actual = await vi.importActual<typeof import('../src/modules/wachtownik/utils/qr-utils')>(
    '../src/modules/wachtownik/utils/qr-utils',
  );

  return {
    ...actual,
    generateQRCode: generateQRCodeMock,
  };
});

const baseState: AppState = {
  crew: [{ id: 'c1', name: 'Anna', role: 'captain' }],
  slots: [{ id: 's1', start: '00:00', end: '06:00', reqCrew: 1 }],
  days: 1,
  startDate: '2026-04-01',
  schedule: [],
  isGenerated: false,
  isNightMode: false,
  captainParticipates: true,
};

function makeLargeState(size: number): AppState {
  return {
    ...baseState,
    crew: Array.from({ length: size }, (_, index) => ({
      id: `crew-${index}-${String(index).padStart(4, '0')}`,
      name: `Crew member ${index} ${'abcdefghij'.repeat(6)}`,
      role: 'sailor',
    })),
    slots: Array.from({ length: Math.max(4, Math.floor(size / 10)) }, (_, index) => ({
      id: `slot-${index}`,
      start: `${String((index * 2) % 24).padStart(2, '0')}:00`,
      end: `${String(((index * 2) + 2) % 24).padStart(2, '0')}:00`,
      reqCrew: 1,
    })),
  };
}

describe('renderShareQrCode', () => {
  beforeEach(() => {
    generateQRCodeMock.mockReset();
    generateQRCodeMock.mockResolvedValue(undefined);
  });

  it('delegates QR rendering to the npm qrcode helper', async () => {
    const { renderShareQrCode } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const container = document.createElement('div');

    await renderShareQrCode(container, baseState);

    expect(generateQRCodeMock).toHaveBeenCalledTimes(1);
    expect(generateQRCodeMock).toHaveBeenCalledWith(
      container,
      expect.stringContaining('#share=c:'),
      false,
    );
  });

  it('rejects oversized share payloads before QR generation', async () => {
    const { buildShareUrlLocal, renderShareQrCode } = await import(
      '../src/modules/wachtownik/hooks/useExportShare'
    );
    const container = document.createElement('div');

    let largeState = makeLargeState(100);
    while (buildShareUrlLocal(largeState).length <= 2900) {
      largeState = makeLargeState(largeState.crew.length * 2);
    }

    await expect(renderShareQrCode(container, largeState)).rejects.toThrow(
      'Grafik jest zbyt złożony do zakodowania w QR. Użyj przycisku "Udostępnij" aby skopiować link.',
    );
    expect(generateQRCodeMock).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe('');
  });
});
