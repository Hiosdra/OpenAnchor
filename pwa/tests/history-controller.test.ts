import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HistoryController } from '../src/modules/anchor/controllers/history.controller';

vi.mock('leaflet', () => {
  const latLng = (lat: number, lng: number) => ({ lat, lng });
  const latLngBounds = () => ({ extend: () => ({ pad: vi.fn() }) });
  return {
    default: {
      latLng, latLngBounds,
      map: () => ({ fitBounds: vi.fn(), invalidateSize: vi.fn() }),
      tileLayer: () => ({ addTo: vi.fn() }),
      circleMarker: () => ({ addTo: vi.fn() }),
      circle: () => ({ addTo: vi.fn() }),
      polyline: () => ({ addTo: vi.fn() }),
    },
    latLng, latLngBounds,
    map: () => ({ fitBounds: vi.fn(), invalidateSize: vi.fn() }),
    tileLayer: () => ({ addTo: vi.fn() }),
    circleMarker: () => ({ addTo: vi.fn() }),
    circle: () => ({ addTo: vi.fn() }),
    polyline: () => ({ addTo: vi.fn() }),
  };
});

function makeState() {
  return { unit: 'm' } as any;
}

function makeMockDb(sessions: any[] = [], trackPoints: any[] = []) {
  return {
    db: {},
    getAllSessions: vi.fn().mockResolvedValue(sessions),
    getSession: vi.fn().mockResolvedValue(sessions[0] || null),
    getTrackPoints: vi.fn().mockResolvedValue(trackPoints),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    getLogbookEntries: vi.fn().mockResolvedValue([]),
    deleteLogbookEntries: vi.fn().mockResolvedValue(undefined),
  } as any;
}

function setupDom() {
  const ids = [
    'history-list', 'history-modal', 'replay-modal', 'replay-info',
    'replay-map', 'replay-logbook', 'replay-logbook-entries',
    'replay-export-btn', 'replay-export-csv-btn', 'replay-delete-btn',
  ];
  ids.forEach(id => {
    const el = document.createElement('div');
    el.id = id;
    el.classList.add('hidden');
    document.body.appendChild(el);
  });
}

function cleanDom() {
  ['history-list', 'history-modal', 'replay-modal', 'replay-info',
    'replay-map', 'replay-logbook', 'replay-logbook-entries',
    'replay-export-btn', 'replay-export-csv-btn', 'replay-delete-btn',
  ].forEach(id => document.getElementById(id)?.remove());
}

describe('HistoryController', () => {
  let ctrl: HistoryController;
  let state: ReturnType<typeof makeState>;
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    setupDom();
    state = makeState();
    db = makeMockDb();
    ctrl = new HistoryController(state, db);
  });

  afterEach(() => {
    cleanDom();
  });

  it('showHistory shows empty message when no sessions', async () => {
    db.getAllSessions.mockResolvedValue([]);
    await ctrl.showHistory();
    const list = document.getElementById('history-list')!;
    expect(list.innerHTML).toContain('text-slate-500');
  });

  it('showHistory shows db error when db not available', async () => {
    db.db = null;
    await ctrl.showHistory();
    const list = document.getElementById('history-list')!;
    expect(list.innerHTML).toContain('text-slate-500');
  });

  it('showHistory renders session cards', async () => {
    db.getAllSessions.mockResolvedValue([
      { id: 1, startTime: Date.now() - 3600000, endTime: Date.now(), radius: 50, maxDistance: 30, alarmTriggered: false, alarmCount: 0 },
    ]);
    await ctrl.showHistory();
    const list = document.getElementById('history-list')!;
    expect(list.children.length).toBe(1);
    expect(list.innerHTML).toContain('OK');
  });

  it('showHistory renders alarm badge for triggered sessions', async () => {
    db.getAllSessions.mockResolvedValue([
      { id: 1, startTime: Date.now() - 3600000, endTime: Date.now(), radius: 50, maxDistance: 70, alarmTriggered: true, alarmCount: 3 },
    ]);
    await ctrl.showHistory();
    const list = document.getElementById('history-list')!;
    expect(list.innerHTML).toContain('3 alarm');
  });

  it('exportSessionGPX creates download link', () => {
    const mockUrl = 'blob:mock';
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => mockUrl);
    URL.revokeObjectURL = vi.fn();

    const session = { startTime: Date.now(), anchorLat: 50, anchorLng: 14, radius: 50 };
    const points = [{ lat: 50, lng: 14, timestamp: Date.now(), accuracy: 5, alarmState: 'SAFE', sessionId: 1, distance: 0 }];
    ctrl.exportSessionGPX(session, points);

    expect(URL.createObjectURL).toHaveBeenCalled();

    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
  });

  it('exportSessionCSV creates download link', () => {
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();

    const session = { startTime: Date.now() };
    const points = [{ lat: 50, lng: 14, timestamp: Date.now(), accuracy: 5, distance: 10, alarmState: 'SAFE', sessionId: 1 }];
    ctrl.exportSessionCSV(session, points);

    expect(URL.createObjectURL).toHaveBeenCalled();

    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
  });

  it('exportSessionGPX does nothing for empty points', () => {
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn();
    ctrl.exportSessionGPX({ startTime: Date.now() }, []);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    URL.createObjectURL = origCreateObjectURL;
  });
});
