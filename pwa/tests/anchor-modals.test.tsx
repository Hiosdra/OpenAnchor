import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '../src/modules/anchor/hooks/useI18n';

// Mock lucide-react icons — vitest requires explicit named exports
const icon = (name: string) => (props: any) => <span data-icon={name} {...props} />;
vi.mock('lucide-react', () => ({
  X: icon('X'),
  Ruler: icon('Ruler'),
  MoveDownLeft: icon('MoveDownLeft'),
  PieChart: icon('PieChart'),
  History: icon('History'),
  BarChart3: icon('BarChart3'),
  Download: icon('Download'),
  FileSpreadsheet: icon('FileSpreadsheet'),
  Trash2: icon('Trash2'),
  PlayCircle: icon('PlayCircle'),
  BookOpen: icon('BookOpen'),
  ClipboardList: icon('ClipboardList'),
  Timer: icon('Timer'),
  CalendarClock: icon('CalendarClock'),
  Plus: icon('Plus'),
  Smartphone: icon('Smartphone'),
  CloudSun: icon('CloudSun'),
  Loader2: icon('Loader2'),
  AlertCircle: icon('AlertCircle'),
  SatelliteDish: icon('SatelliteDish'),
  BatteryWarning: icon('BatteryWarning'),
  Wifi: icon('Wifi'),
  Sparkles: icon('Sparkles'),
  Key: icon('Key'),
  Send: icon('Send'),
  Anchor: icon('Anchor'),
  MessageCircle: icon('MessageCircle'),
  CloudLightning: icon('CloudLightning'),
  Save: icon('Save'),
  QrCode: icon('QrCode'),
}));

beforeEach(() => {
  localStorage.clear();
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

// ── Modal (base) ────────────────────────────────────────────────────

describe('Modal (base)', () => {
  async function importComponent() {
    const { Modal } = await import(
      '../src/modules/anchor/components/modals/Modal'
    );
    return Modal;
  }

  it('renders children when open=true (hidden class removed)', async () => {
    const Modal = await importComponent();
    const { container } = render(
      <Modal open={true} onClose={vi.fn()}>
        <span>child content</span>
      </Modal>,
    );
    expect(screen.getByText('child content')).toBeTruthy();
    const root = container.querySelector('[role="dialog"]')!;
    expect(root.classList.contains('hidden')).toBe(false);
  });

  it('has role="dialog" and aria-modal="true"', async () => {
    const Modal = await importComponent();
    const { container } = render(
      <Modal open={true} onClose={vi.fn()}>
        <span>hello</span>
      </Modal>,
    );
    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('close button calls onClose, backdrop click calls onClose', async () => {
    const onClose = vi.fn();
    const Modal = await importComponent();
    const { container } = render(
      <Modal open={true} onClose={onClose} title="Test Title">
        <span>body</span>
      </Modal>,
    );
    // Close button
    const closeBtn = container.querySelector('.modal-close-btn')!;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Backdrop click
    const backdrop = container.querySelector('[role="dialog"]')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

// ── CalcModal ───────────────────────────────────────────────────────

describe('CalcModal', () => {
  async function importComponent() {
    const { CalcModal } = await import(
      '../src/modules/anchor/components/modals/CalcModal'
    );
    return CalcModal;
  }

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onApply: vi.fn(),
    chainLengthM: null,
    depthM: null,
    onChainChange: vi.fn(),
    onDepthChange: vi.fn(),
  };

  it('renders input fields for depth and ratio selector', async () => {
    const CalcModal = await importComponent();
    const { container } = render(
      <Wrapper><CalcModal {...defaultProps} /></Wrapper>,
    );
    expect(container.querySelector('#calc-depth')).toBeTruthy();
    expect(container.querySelector('#calc-ratio')).toBeTruthy();
  });

  it('computes swing radius using sqrt(chain²-depth²) × 1.2', async () => {
    const CalcModal = await importComponent();
    const { container } = render(
      <Wrapper><CalcModal {...defaultProps} /></Wrapper>,
    );
    // Default: depth=5, ratio=5 → chain=25
    // swing = sqrt(25²-5²) = sqrt(600) ≈ 24.49, radius = round(24.49 * 1.2) = 29
    const result = container.querySelector('#calc-chain-result')!;
    expect(result.textContent).toBe('29');
  });

  it('apply button calls onApply with calculated value', async () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const onDepthChange = vi.fn();
    const onChainChange = vi.fn();
    const CalcModal = await importComponent();
    render(
      <Wrapper>
        <CalcModal
          {...defaultProps}
          onApply={onApply}
          onClose={onClose}
          onDepthChange={onDepthChange}
          onChainChange={onChainChange}
        />
      </Wrapper>,
    );
    const applyBtn = document.querySelector('#apply-calc-btn')!;
    fireEvent.click(applyBtn);
    expect(onApply).toHaveBeenCalledWith(29);
    expect(onDepthChange).toHaveBeenCalledWith(5);
    expect(onChainChange).toHaveBeenCalledWith(25);
    expect(onClose).toHaveBeenCalled();
  });
});

// ── SessionModal ────────────────────────────────────────────────────

describe('SessionModal', () => {
  async function importComponent() {
    const { SessionModal } = await import(
      '../src/modules/anchor/components/modals/SessionModal'
    );
    return SessionModal;
  }

  const makeSession = (overrides = {}) => ({
    id: 1,
    anchorLat: 0,
    anchorLng: 0,
    radius: 50,
    bufferRadius: null,
    sectorEnabled: false,
    sectorBearing: 0,
    sectorWidth: 90,
    startTime: 1700000000000,
    endTime: 1700003600000, // +1h
    chainLengthM: null,
    depthM: null,
    alarmTriggered: false,
    alarmCount: 0,
    maxDistance: 12.5,
    ...overrides,
  });

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    sessions: [] as any[],
    loading: false,
    onReplay: vi.fn(),
    onExportGPX: vi.fn(),
    onExportCSV: vi.fn(),
    onDelete: vi.fn(),
    replaySession: null,
    replayMapRef: { current: null },
  };

  it('renders session list from props', async () => {
    const SessionModal = await importComponent();
    const sessions = [makeSession(), makeSession({ id: 2, alarmCount: 3 })];
    render(
      <Wrapper>
        <SessionModal {...defaultProps} sessions={sessions} />
      </Wrapper>,
    );
    // Each session renders as a button
    const buttons = screen.getAllByRole('button');
    // Should have session buttons + close button + hidden export button
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('duration uses formatDuration with ms (not seconds)', async () => {
    const SessionModal = await importComponent();
    // 3600000ms = 1h 0m
    const sessions = [makeSession()];
    const { container } = render(
      <Wrapper>
        <SessionModal {...defaultProps} sessions={sessions} />
      </Wrapper>,
    );
    // formatDuration(3600000, 'ms') = '1h 0m'
    expect(container.textContent).toContain('1h 0m');
  });

  it('replay view renders session date without *1000 multiplication', async () => {
    const SessionModal = await importComponent();
    const session = makeSession();
    const replay = {
      session,
      points: [{ lat: 0, lng: 0 }],
      logEntries: [],
    };
    const { container } = render(
      <Wrapper>
        <SessionModal {...defaultProps} replaySession={replay} />
      </Wrapper>,
    );
    // startTime is already in ms, so toLocaleString should give a reasonable date (2023)
    // If it was multiplied by 1000, it would give year ~55883
    expect(container.textContent).not.toContain('55883');
    expect(container.textContent).toContain('2023');
  });
});

// ── StatsModal ──────────────────────────────────────────────────────

describe('StatsModal', () => {
  async function importComponent() {
    const { StatsModal } = await import(
      '../src/modules/anchor/components/modals/StatsModal'
    );
    return StatsModal;
  }

  const stats = {
    totalSessions: 10,
    totalAlarms: 2,
    totalTime: 7200000, // 2h in ms
    avgTime: 3600000,   // 1h in ms
    maxDistance: 25.3,
    maxSog: 1.7,
  };

  it('renders stat items with labels and values', async () => {
    const StatsModal = await importComponent();
    const { container } = render(
      <Wrapper>
        <StatsModal open={true} onClose={vi.fn()} stats={stats} />
      </Wrapper>,
    );
    expect(container.textContent).toContain('10');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('25.3m');
    expect(container.textContent).toContain('1.7 kn');
  });

  it('formats duration with default ms unit', async () => {
    const StatsModal = await importComponent();
    const { container } = render(
      <Wrapper>
        <StatsModal open={true} onClose={vi.fn()} stats={stats} />
      </Wrapper>,
    );
    // totalTime: 7200000ms = 2h 0m, avgTime: 3600000ms = 1h 0m
    expect(container.textContent).toContain('2h 0m');
    expect(container.textContent).toContain('1h 0m');
  });
});

// ── WatchModal ──────────────────────────────────────────────────────

describe('WatchModal', () => {
  async function importComponent() {
    const { WatchModal } = await import(
      '../src/modules/anchor/components/modals/WatchModal'
    );
    return WatchModal;
  }

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    watchActive: false,
    watchMinutes: 30,
    schedule: [] as any[],
    onStartWatch: vi.fn(),
    onCancelWatch: vi.fn(),
    onAddScheduleItem: vi.fn(),
    onRemoveScheduleItem: vi.fn(),
    onWatchMinutesChange: vi.fn(),
  };

  it('renders schedule items', async () => {
    const WatchModal = await importComponent();
    const schedule = [
      { start: '08:00', end: '12:00', person: 'Alice' },
      { start: '12:00', end: '16:00', person: 'Bob' },
    ];
    const { container } = render(
      <Wrapper><WatchModal {...defaultProps} schedule={schedule} /></Wrapper>,
    );
    expect(container.textContent).toContain('Alice');
    expect(container.textContent).toContain('Bob');
    expect(container.textContent).toContain('08:00');
    expect(container.textContent).toContain('16:00');
  });

  it('add schedule item creates {start, end, person} shape', async () => {
    const onAddScheduleItem = vi.fn();
    const WatchModal = await importComponent();
    const { container } = render(
      <Wrapper>
        <WatchModal {...defaultProps} onAddScheduleItem={onAddScheduleItem} />
      </Wrapper>,
    );
    // Fill in the time inputs
    const timeInputs = container.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: '08:00' } });
    fireEvent.change(timeInputs[1], { target: { value: '12:00' } });
    // Fill in name
    const nameInput = container.querySelector('input[type="text"]')!;
    fireEvent.change(nameInput, { target: { value: 'Alice' } });

    // Click add button
    const addBtns = Array.from(container.querySelectorAll('button'));
    const addBtn = addBtns.find(b => b.textContent?.includes('Dodaj'))!;
    fireEvent.click(addBtn);

    expect(onAddScheduleItem).toHaveBeenCalledWith({
      start: '08:00',
      end: '12:00',
      person: 'Alice',
    });
  });

  it('remove button calls onRemoveScheduleItem', async () => {
    const onRemoveScheduleItem = vi.fn();
    const WatchModal = await importComponent();
    const schedule = [{ start: '08:00', end: '12:00', person: 'Alice' }];
    const { container } = render(
      <Wrapper>
        <WatchModal
          {...defaultProps}
          schedule={schedule}
          onRemoveScheduleItem={onRemoveScheduleItem}
        />
      </Wrapper>,
    );
    const removeBtn = screen.getByLabelText('Remove');
    fireEvent.click(removeBtn);
    expect(onRemoveScheduleItem).toHaveBeenCalledWith(0);
  });
});

// ── SyncModal ───────────────────────────────────────────────────────

describe('SyncModal', () => {
  async function importComponent() {
    const { SyncModal } = await import(
      '../src/modules/anchor/components/modals/SyncModal'
    );
    return SyncModal;
  }

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    wsConnected: false,
    wsUrl: 'ws://192.168.1.1:8080',
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onUrlChange: vi.fn(),
  };

  it('renders URL input field with value', async () => {
    const SyncModal = await importComponent();
    const { container } = render(
      <Wrapper><SyncModal {...defaultProps} /></Wrapper>,
    );
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('ws://192.168.1.1:8080');
  });

  it('connect/disconnect buttons call handlers', async () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    const SyncModal = await importComponent();

    // Test connect when disconnected
    const { unmount } = render(
      <Wrapper>
        <SyncModal
          {...defaultProps}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      </Wrapper>,
    );
    const buttons = Array.from(document.querySelectorAll('button'));
    const connectBtn = buttons.find(b => b.textContent?.includes('Połącz') || b.textContent?.includes('Connect'));
    fireEvent.click(connectBtn!);
    expect(onConnect).toHaveBeenCalledWith('ws://192.168.1.1:8080');
    unmount();

    // Test disconnect when connected
    render(
      <Wrapper>
        <SyncModal
          {...defaultProps}
          wsConnected={true}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      </Wrapper>,
    );
    const buttons2 = Array.from(document.querySelectorAll('button'));
    const disconnectBtn = buttons2.find(b => !b.disabled && (b.textContent?.includes('Rozłącz') || b.textContent?.includes('Disconnect')));
    fireEvent.click(disconnectBtn!);
    expect(onDisconnect).toHaveBeenCalled();
  });
});

// ── WeatherModal ────────────────────────────────────────────────────

describe('WeatherModal', () => {
  async function importComponent() {
    const { WeatherModal } = await import(
      '../src/modules/anchor/components/modals/WeatherModal'
    );
    return WeatherModal;
  }

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    loading: false,
    error: null,
    windSpeed: null,
    windGust: null,
    windDir: null,
    waveHeight: null,
    wavePeriod: null,
    waveDir: null,
    windForecast: [] as number[],
    waveForecast: [] as number[],
    gustForecast: [] as number[],
    assessment: null,
    onFetch: vi.fn(),
  };

  it('renders weather data when provided', async () => {
    const WeatherModal = await importComponent();
    const { container } = render(
      <Wrapper>
        <WeatherModal
          {...defaultProps}
          windSpeed={15}
          windGust={22}
          windDir={180}
          waveHeight={1.5}
          wavePeriod={6}
          waveDir={200}
        />
      </Wrapper>,
    );
    expect(container.textContent).toContain('15');
    expect(container.textContent).toContain('22');
    expect(container.textContent).toContain('180°');
    expect(container.textContent).toContain('1.5');
  });

  it('shows loading state', async () => {
    const WeatherModal = await importComponent();
    const { container } = render(
      <Wrapper><WeatherModal {...defaultProps} loading={true} /></Wrapper>,
    );
    // Loading spinner icon should be present
    expect(container.querySelector('[data-icon="Loader2"]')).toBeTruthy();
  });
});

// ── AlertModals ─────────────────────────────────────────────────────

describe('AlertModals', () => {
  async function importComponent() {
    const { AlertModals } = await import(
      '../src/modules/anchor/components/modals/AlertModals'
    );
    return AlertModals;
  }

  const allClosed = {
    dragWarningOpen: false,
    onDragDismiss: vi.fn(),
    onDragCheck: vi.fn(),
    gpsLostOpen: false,
    onGpsLostClose: vi.fn(),
    batteryLowOpen: false,
    onBatteryLowClose: vi.fn(),
    watchAlertOpen: false,
    onWatchAlertOk: vi.fn(),
    connLostOpen: false,
    onConnLostClose: vi.fn(),
  };

  it('GPS lost modal renders with correct message', async () => {
    const AlertModals = await importComponent();
    const { container } = render(
      <Wrapper>
        <AlertModals {...allClosed} gpsLostOpen={true} />
      </Wrapper>,
    );
    expect(container.querySelector('[data-icon="SatelliteDish"]')).toBeTruthy();
    // Should contain GPS lost related text
    expect(container.textContent).toContain('GPS');
  });

  it('battery low modal renders', async () => {
    const AlertModals = await importComponent();
    const { container } = render(
      <Wrapper>
        <AlertModals {...allClosed} batteryLowOpen={true} />
      </Wrapper>,
    );
    expect(container.querySelector('[data-icon="BatteryWarning"]')).toBeTruthy();
    expect(container.querySelector('#battery-modal')).toBeTruthy();
  });

  it('watch alert modal renders and ok calls handler', async () => {
    const onWatchAlertOk = vi.fn();
    const AlertModals = await importComponent();
    const { container } = render(
      <Wrapper>
        <AlertModals
          {...allClosed}
          watchAlertOpen={true}
          onWatchAlertOk={onWatchAlertOk}
        />
      </Wrapper>,
    );
    const okBtn = container.querySelector('#watch-alert-ok-btn')!;
    expect(okBtn).toBeTruthy();
    fireEvent.click(okBtn);
    expect(onWatchAlertOk).toHaveBeenCalledOnce();
  });
});

// ── OffsetModal ─────────────────────────────────────────────────────

describe('OffsetModal', () => {
  async function importComponent() {
    const { OffsetModal } = await import(
      '../src/modules/anchor/components/modals/OffsetModal'
    );
    return OffsetModal;
  }

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    cog: 90,
    onApply: vi.fn(),
  };

  it('renders distance and bearing inputs', async () => {
    const OffsetModal = await importComponent();
    const { container } = render(
      <Wrapper><OffsetModal {...defaultProps} /></Wrapper>,
    );
    expect(container.querySelector('#offset-dist')).toBeTruthy();
    expect(container.querySelector('#offset-bearing')).toBeTruthy();
  });

  it('apply calls onApply with offset values', async () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const OffsetModal = await importComponent();
    const { container } = render(
      <Wrapper>
        <OffsetModal {...defaultProps} onApply={onApply} onClose={onClose} />
      </Wrapper>,
    );
    // Change distance to 50
    const distInput = container.querySelector('#offset-dist')!;
    fireEvent.change(distInput, { target: { value: '50' } });
    // Change bearing to 180
    const bearingInput = container.querySelector('#offset-bearing')!;
    fireEvent.change(bearingInput, { target: { value: '180' } });

    const confirmBtn = container.querySelector('#confirm-offset-btn')!;
    fireEvent.click(confirmBtn);

    expect(onApply).toHaveBeenCalledWith(50, 180);
    expect(onClose).toHaveBeenCalled();
  });
});

// ── SectorModal ─────────────────────────────────────────────────────

describe('SectorModal', () => {
  async function importComponent() {
    const { SectorModal } = await import(
      '../src/modules/anchor/components/modals/SectorModal'
    );
    return SectorModal;
  }

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    sectorEnabled: false,
    sectorBearing: 0,
    sectorWidth: 90,
    onSave: vi.fn(),
  };

  it('renders bearing and width inputs', async () => {
    const SectorModal = await importComponent();
    const { container } = render(
      <Wrapper><SectorModal {...defaultProps} /></Wrapper>,
    );
    expect(container.querySelector('#sector-bearing')).toBeTruthy();
    expect(container.querySelector('#sector-width')).toBeTruthy();
  });

  it('toggle enables/disables sector and save calls onSave', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const SectorModal = await importComponent();
    const { container } = render(
      <Wrapper>
        <SectorModal {...defaultProps} onSave={onSave} onClose={onClose} />
      </Wrapper>,
    );
    // Enable sector
    const checkbox = container.querySelector('#sector-enable') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);

    // Save
    const saveBtn = container.querySelector('#save-sector-btn')!;
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledWith(true, 0, 90);
    expect(onClose).toHaveBeenCalled();
  });
});

// ── AIModal ─────────────────────────────────────────────────────────

describe('AIModal', () => {
  async function importComponent() {
    const { AIModal } = await import(
      '../src/modules/anchor/components/modals/AIModal'
    );
    return AIModal;
  }

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    chatMessages: [] as any[],
    loading: false,
    onSendMessage: vi.fn(),
    onClearChat: vi.fn(),
    logbookEntry: null,
    onSaveLogbook: vi.fn(),
    hasApiKey: true,
    onOpenApiKeyModal: vi.fn(),
  };

  it('renders send button and chat area', async () => {
    const AIModal = await importComponent();
    const { container } = render(
      <Wrapper><AIModal {...defaultProps} /></Wrapper>,
    );
    expect(container.querySelector('#ai-chat-area')).toBeTruthy();
    expect(container.querySelector('[data-icon="Send"]')).toBeTruthy();
  });

  it('shows loading state while generating', async () => {
    const AIModal = await importComponent();
    const { container } = render(
      <Wrapper><AIModal {...defaultProps} loading={true} /></Wrapper>,
    );
    expect(container.querySelector('[data-icon="Loader2"]')).toBeTruthy();
  });
});

// ── ApiKeyModal ─────────────────────────────────────────────────────

describe('ApiKeyModal', () => {
  async function importComponent() {
    const { ApiKeyModal } = await import(
      '../src/modules/anchor/components/modals/ApiKeyModal'
    );
    return ApiKeyModal;
  }

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onClear: vi.fn(),
    hasKey: false,
  };

  it('renders API key input', async () => {
    const ApiKeyModal = await importComponent();
    const { container } = render(
      <Wrapper><ApiKeyModal {...defaultProps} /></Wrapper>,
    );
    const input = container.querySelector('#api-key-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('password');
  });

  it('save calls onSave with trimmed key value', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const ApiKeyModal = await importComponent();
    const { container } = render(
      <Wrapper>
        <ApiKeyModal {...defaultProps} onSave={onSave} onClose={onClose} />
      </Wrapper>,
    );
    const input = container.querySelector('#api-key-input')!;
    fireEvent.change(input, { target: { value: '  AIzaSyTest123  ' } });

    const saveBtn = container.querySelector('#save-api-key-btn')!;
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledWith('AIzaSyTest123');
    expect(onClose).toHaveBeenCalled();
  });
});

// ── QRScanModal ─────────────────────────────────────────────────────

describe('QRScanModal', () => {
  async function importComponent() {
    const { QRScanModal } = await import(
      '../src/modules/anchor/components/modals/QRScanModal'
    );
    return QRScanModal;
  }

  it('renders scanner container', async () => {
    const QRScanModal = await importComponent();
    const { container } = render(
      <Wrapper>
        <QRScanModal open={true} onClose={vi.fn()} onConnect={vi.fn()} />
      </Wrapper>,
    );
    expect(container.querySelector('#qr-reader')).toBeTruthy();
    expect(container.querySelector('[data-icon="QrCode"]')).toBeTruthy();
  });
});
