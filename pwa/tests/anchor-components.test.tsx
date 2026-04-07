import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '../src/modules/anchor/hooks/useI18n';

beforeEach(() => {
  localStorage.clear();
});

const icon = (name: string) => {
  const Comp = (props: any) => <span data-icon={name} {...props} />;
  Comp.displayName = name;
  return Comp;
};

vi.mock('lucide-react', () => ({
  Moon: icon('Moon'),
  Smartphone: icon('Smartphone'),
  Satellite: icon('Satellite'),
  ShieldCheck: icon('ShieldCheck'),
  AlertTriangle: icon('AlertTriangle'),
  Siren: icon('Siren'),
  BellOff: icon('BellOff'),
  Anchor: icon('Anchor'),
  MoveDownLeft: icon('MoveDownLeft'),
  Calculator: icon('Calculator'),
  Radar: icon('Radar'),
  Clock: icon('Clock'),
  CloudSun: icon('CloudSun'),
  Monitor: icon('Monitor'),
  History: icon('History'),
  Bot: icon('Bot'),
  Share2: icon('Share2'),
  QrCode: icon('QrCode'),
  Layers: icon('Layers'),
  Crosshair: icon('Crosshair'),
  Map: icon('Map'),
  SunDim: icon('SunDim'),
  BatteryWarning: icon('BatteryWarning'),
  MapPinOff: icon('MapPinOff'),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

// ── Header ───────────────────────────────────────────────────────────

describe('Header', () => {
  async function importComponent() {
    const { Header } = await import('../src/modules/anchor/components/Header');
    return Header;
  }

  const baseProps = {
    isOnline: true,
    nightMode: false,
    onToggleNightMode: vi.fn(),
    unit: 'meters' as string,
    onToggleUnit: vi.fn(),
    onToggleLang: vi.fn(),
    wsConnected: false,
    peerBattery: null as number | null,
    peerCharging: false,
    hasGpsFix: true,
    gpsSignalLost: false,
    batterySaverActive: false,
  };

  it('renders app title', async () => {
    const Header = await importComponent();
    render(<Header {...baseProps} />, { wrapper: Wrapper });
    expect(screen.getByText(/Alert Kotwiczny|Anchor Alert/)).toBeTruthy();
  });

  it('shows GPS OK when hasGpsFix is true and signal not lost', async () => {
    const Header = await importComponent();
    render(<Header {...baseProps} hasGpsFix={true} gpsSignalLost={false} />, { wrapper: Wrapper });
    expect(screen.getByText('OK')).toBeTruthy();
  });

  it('shows GPS searching when hasGpsFix is false', async () => {
    const Header = await importComponent();
    render(<Header {...baseProps} hasGpsFix={false} gpsSignalLost={false} />, { wrapper: Wrapper });
    expect(screen.getByText(/Szukam|Searching/)).toBeTruthy();
  });

  it('calls onToggleNightMode when night mode button clicked', async () => {
    const onToggleNightMode = vi.fn();
    const Header = await importComponent();
    render(<Header {...baseProps} onToggleNightMode={onToggleNightMode} />, { wrapper: Wrapper });

    const btn = screen.getByRole('button', { name: /nocny|Night mode/i });
    fireEvent.click(btn);
    expect(onToggleNightMode).toHaveBeenCalledOnce();
  });

  it('displays unit label matching current unit', async () => {
    const Header = await importComponent();
    render(<Header {...baseProps} unit="meters" />, { wrapper: Wrapper });
    expect(screen.getByText(/METRY|METERS/)).toBeTruthy();
  });
});

// ── Dashboard ────────────────────────────────────────────────────────

describe('Dashboard', () => {
  async function importComponent() {
    const { Dashboard } = await import('../src/modules/anchor/components/Dashboard');
    return Dashboard;
  }

  const baseProps = {
    distance: 12.5,
    sog: 1.3,
    cog: 180 as number | null,
    accuracy: 5,
    unit: 'meters' as string,
    isAnchored: true,
  };

  it('renders all four metric values', async () => {
    const Dashboard = await importComponent();
    render(<Dashboard {...baseProps} />, { wrapper: Wrapper });

    expect(screen.getByText('12.5')).toBeTruthy();
    expect(screen.getByText('1.3')).toBeTruthy();
    expect(screen.getByText('180°')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows m suffix when unit is meters', async () => {
    const Dashboard = await importComponent();
    const { container } = render(<Dashboard {...baseProps} />, { wrapper: Wrapper });
    const unitLabels = container.querySelectorAll('.text-xs.text-slate-400');
    const mLabels = Array.from(unitLabels).filter(el => el.textContent === 'm');
    expect(mLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('shows ft suffix when unit is feet', async () => {
    const Dashboard = await importComponent();
    const { container } = render(<Dashboard {...baseProps} unit="feet" />, { wrapper: Wrapper });
    const unitLabels = container.querySelectorAll('.text-xs.text-slate-400');
    const ftLabels = Array.from(unitLabels).filter(el => el.textContent === 'ft');
    expect(ftLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('shows dashes when accuracy is zero (no data)', async () => {
    const Dashboard = await importComponent();
    render(<Dashboard {...baseProps} accuracy={0} />, { wrapper: Wrapper });

    const dashes = screen.getAllByText('--');
    expect(dashes.length).toBe(2);
  });

  it('shows --- for COG when cog is null', async () => {
    const Dashboard = await importComponent();
    render(<Dashboard {...baseProps} cog={null} />, { wrapper: Wrapper });
    expect(screen.getByText('---')).toBeTruthy();
  });
});

// ── AlarmBar ─────────────────────────────────────────────────────────

describe('AlarmBar', () => {
  async function importComponent() {
    const { AlarmBar } = await import('../src/modules/anchor/components/AlarmBar');
    return AlarmBar;
  }

  const baseProps = {
    alarmState: 'SAFE' as string,
    distance: 10,
    unit: 'meters' as string,
    isAnchored: true,
    onDismissAlarm: vi.fn(),
  };

  it('returns null when not anchored', async () => {
    const AlarmBar = await importComponent();
    const { container } = render(<AlarmBar {...baseProps} isAnchored={false} />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });

  it('renders SAFE state with alarm-bar-safe class', async () => {
    const AlarmBar = await importComponent();
    const { container } = render(<AlarmBar {...baseProps} alarmState="SAFE" />, { wrapper: Wrapper });
    const bar = container.querySelector('#alarm-state-bar');
    expect(bar).toBeTruthy();
    expect(bar!.className).toContain('alarm-bar-safe');
    expect(bar!.textContent).toMatch(/Bezpiecznie|Safe/);
  });

  it('renders WARNING state with alarm-bar-warning class', async () => {
    const AlarmBar = await importComponent();
    const { container } = render(<AlarmBar {...baseProps} alarmState="WARNING" />, { wrapper: Wrapper });
    const bar = container.querySelector('#alarm-state-bar');
    expect(bar!.className).toContain('alarm-bar-warning');
  });

  it('renders ALARM state with mute button', async () => {
    const onDismiss = vi.fn();
    const AlarmBar = await importComponent();
    render(<AlarmBar {...baseProps} alarmState="ALARM" onDismissAlarm={onDismiss} />, { wrapper: Wrapper });

    const muteBtn = screen.getByRole('button', { name: /Wycisz|Mute/i });
    expect(muteBtn).toBeTruthy();
    fireEvent.click(muteBtn);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

// ── Controls ─────────────────────────────────────────────────────────

describe('Controls', () => {
  async function importComponent() {
    const { Controls } = await import('../src/modules/anchor/components/Controls');
    return Controls;
  }

  const baseProps = {
    isAnchored: false,
    radius: 50,
    unit: 'meters' as string,
    sectorEnabled: false,
    alarmState: 'SAFE' as string,
    hasGpsFix: true,
    onToggleAnchor: vi.fn(),
    onRadiusChange: vi.fn(),
    onOpenTool: vi.fn(),
    onOffset: vi.fn(),
    onMuteAlarm: vi.fn(),
    onCenterMap: vi.fn(),
    onToggleMapLayer: vi.fn(),
    mapAutoCenter: true,
  };

  it('renders the anchor button with drop text', async () => {
    const Controls = await importComponent();
    render(<Controls {...baseProps} />, { wrapper: Wrapper });
    expect(screen.getByText(/Rzuć Kotwicę|Drop Anchor/)).toBeTruthy();
  });

  it('shows raise anchor text when isAnchored', async () => {
    const Controls = await importComponent();
    render(<Controls {...baseProps} isAnchored={true} />, { wrapper: Wrapper });
    expect(screen.getByText(/Podnieś Kotwicę|Raise Anchor/)).toBeTruthy();
  });

  it('disables anchor button when no GPS fix and not anchored', async () => {
    const Controls = await importComponent();
    render(<Controls {...baseProps} hasGpsFix={false} isAnchored={false} />, { wrapper: Wrapper });
    const btn = document.getElementById('main-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('renders tool buttons', async () => {
    const Controls = await importComponent();
    render(<Controls {...baseProps} />, { wrapper: Wrapper });
    expect(document.getElementById('tool-calc')).toBeTruthy();
    expect(document.getElementById('tool-sector')).toBeTruthy();
    expect(document.getElementById('tool-watch')).toBeTruthy();
  });

  it('calls onToggleAnchor when anchor button clicked', async () => {
    const onToggleAnchor = vi.fn();
    const Controls = await importComponent();
    render(<Controls {...baseProps} onToggleAnchor={onToggleAnchor} />, { wrapper: Wrapper });
    fireEvent.click(document.getElementById('main-btn')!);
    expect(onToggleAnchor).toHaveBeenCalledOnce();
  });
});

// ── SimpleMonitor ────────────────────────────────────────────────────

describe('SimpleMonitor', () => {
  async function importComponent() {
    const { SimpleMonitor } = await import('../src/modules/anchor/components/SimpleMonitor');
    return SimpleMonitor;
  }

  const baseProps = {
    visible: true,
    distance: 15.7,
    sog: 0.8,
    cog: 90 as number | null,
    accuracy: 3,
    unit: 'meters' as string,
    alarmState: 'SAFE' as string,
    hasGpsFix: true,
    gpsSignalLost: false,
    nightRedFilter: false,
    onClose: vi.fn(),
    onDismissAlarm: vi.fn(),
    onToggleNightRed: vi.fn(),
    onOpenMap: vi.fn(),
  };

  it('returns null when not visible', async () => {
    const SimpleMonitor = await importComponent();
    const { container } = render(<SimpleMonitor {...baseProps} visible={false} />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });

  it('renders distance and SOG values', async () => {
    const SimpleMonitor = await importComponent();
    render(<SimpleMonitor {...baseProps} />, { wrapper: Wrapper });
    expect(screen.getByText('15.7')).toBeTruthy();
    expect(screen.getByText('0.8')).toBeTruthy();
  });

  it('shows alarm state text', async () => {
    const SimpleMonitor = await importComponent();
    render(<SimpleMonitor {...baseProps} alarmState="SAFE" />, { wrapper: Wrapper });
    expect(screen.getByText(/Bezpiecznie|Safe/)).toBeTruthy();
  });

  it('shows mute button in ALARM state', async () => {
    const onDismiss = vi.fn();
    const SimpleMonitor = await importComponent();
    render(<SimpleMonitor {...baseProps} alarmState="ALARM" onDismissAlarm={onDismiss} />, { wrapper: Wrapper });
    const muteBtn = screen.getByText(/Wycisz|Mute/i);
    expect(muteBtn).toBeTruthy();
  });
});

// ── Onboarding ───────────────────────────────────────────────────────

describe('Onboarding', () => {
  async function importComponent() {
    const { Onboarding } = await import('../src/modules/anchor/components/Onboarding');
    return Onboarding;
  }

  it('returns null when not visible', async () => {
    const Onboarding = await importComponent();
    const { container } = render(<Onboarding visible={false} onComplete={vi.fn()} />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });

  it('renders welcome step when visible', async () => {
    const Onboarding = await importComponent();
    render(<Onboarding visible={true} onComplete={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByText(/Witaj na pokładzie|Welcome Aboard/)).toBeTruthy();
  });

  it('calls onComplete when skip button clicked', async () => {
    const onComplete = vi.fn();
    const Onboarding = await importComponent();
    render(<Onboarding visible={true} onComplete={onComplete} />, { wrapper: Wrapper });

    const skipBtn = screen.getByText(/Pomiń|Skip/);
    fireEvent.click(skipBtn);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('advances to next step on Next click', async () => {
    const Onboarding = await importComponent();
    render(<Onboarding visible={true} onComplete={vi.fn()} />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText(/Dalej|Next/));
    expect(screen.getByText(/Ustaw Strefę|Set the Zone/)).toBeTruthy();
  });
});

// ── MapContainer ─────────────────────────────────────────────────────

describe('MapContainer', () => {
  async function importComponent() {
    const { MapContainer } = await import('../src/modules/anchor/components/MapContainer');
    return MapContainer;
  }

  it('renders map div with correct id', async () => {
    const ref = React.createRef<HTMLDivElement>();
    const MapContainer = await importComponent();
    render(<MapContainer mapRef={ref} hasGpsFix={true} gpsSignalLost={false} />, { wrapper: Wrapper });
    const mapDiv = document.getElementById('map');
    expect(mapDiv).toBeTruthy();
    expect(mapDiv!.getAttribute('role')).toBe('application');
  });

  it('passes ref to the map div', async () => {
    const ref = React.createRef<HTMLDivElement>();
    const MapContainer = await importComponent();
    render(<MapContainer mapRef={ref} hasGpsFix={true} gpsSignalLost={false} />, { wrapper: Wrapper });
    expect(ref.current).toBeTruthy();
    expect(ref.current!.id).toBe('map');
  });

  it('shows no-signal overlay when GPS fix is missing', async () => {
    const ref = React.createRef<HTMLDivElement>();
    const MapContainer = await importComponent();
    render(<MapContainer mapRef={ref} hasGpsFix={false} gpsSignalLost={false} />, { wrapper: Wrapper });
    expect(screen.getByText(/Brak sygnału GPS|No GPS signal/)).toBeTruthy();
  });
});
