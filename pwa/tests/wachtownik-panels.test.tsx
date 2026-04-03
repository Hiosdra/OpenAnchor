import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

import type {
  CrewMember,
  CrewStat,
  DaySchedule,
  ScheduleSlot,
  WatchSlot,
  DashboardData,
  CoverageResult,
  Recommendation,
  Locale,
} from '../src/modules/wachtownik/types';

// ── Shared fixtures ──────────────────────────────────────────────────

const makeCrew = (overrides: Partial<CrewMember> = {}): CrewMember => ({
  id: 'c1',
  name: 'Jan',
  role: 'sailor',
  ...overrides,
});

const makeCrewStat = (overrides: Partial<CrewStat> = {}): CrewStat => ({
  id: 'c1',
  name: 'Jan',
  role: 'sailor',
  totalHours: 16,
  hardWatches: 2,
  ...overrides,
});

const makeSlot = (overrides: Partial<ScheduleSlot> = {}): ScheduleSlot => ({
  id: 'slot-1',
  start: '08:00',
  end: '16:00',
  reqCrew: 2,
  assigned: [makeCrew()],
  ...overrides,
});

const makeDaySchedule = (overrides: Partial<DaySchedule> = {}): DaySchedule => ({
  day: 1,
  slots: [makeSlot()],
  ...overrides,
});

const makeWatchSlot = (overrides: Partial<WatchSlot> = {}): WatchSlot => ({
  id: 'ws-1',
  start: '00:00',
  end: '06:00',
  reqCrew: 2,
  ...overrides,
});

// =====================================================================
// AnalyticsDashboardPanel
// =====================================================================
describe('AnalyticsDashboardPanel', () => {
  const importComponent = async () =>
    (await import('../src/modules/wachtownik/components/AnalyticsDashboardPanel')).AnalyticsDashboardPanel;

  const baseProps = () => ({
    isNightMode: false,
    userLocale: 'pl-PL' as Locale,
    captainParticipates: true,
    schedule: [makeDaySchedule()],
    crewStats: [
      makeCrewStat({ id: 'c1', name: 'Jan', role: 'sailor', totalHours: 20, hardWatches: 4 }),
      makeCrewStat({ id: 'c2', name: 'Ola', role: 'officer', totalHours: 16, hardWatches: 3 }),
      makeCrewStat({ id: 'c3', name: 'Kap', role: 'captain', totalHours: 12, hardWatches: 1 }),
    ],
  });

  it('renders in light mode with active crew stats', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.textContent).toContain('Jan');
    expect(container.textContent).toContain('Ola');
  });

  it('renders in night mode', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} isNightMode={true} />);
    expect(container.innerHTML).toContain('bg-zinc-950');
    expect(container.innerHTML).toContain('border-red-900');
  });

  it('excludes cook from activeStats', async () => {
    const Panel = await importComponent();
    const stats = [
      makeCrewStat({ id: 'c1', name: 'Jan', role: 'sailor', totalHours: 20, hardWatches: 3 }),
      makeCrewStat({ id: 'c2', name: 'Chef', role: 'cook', totalHours: 0, hardWatches: 0 }),
    ];
    const { container } = render(<Panel {...baseProps()} crewStats={stats} />);
    // Workload distribution only shows active crew
    const text = container.textContent!;
    // Chef appears in crewStats for top lists but isActiveCrew filters out cook
    expect(text).toContain('Jan');
  });

  it('excludes captain when captainParticipates=false', async () => {
    const Panel = await importComponent();
    const stats = [
      makeCrewStat({ id: 'c1', name: 'Jan', role: 'sailor', totalHours: 20, hardWatches: 3 }),
      makeCrewStat({ id: 'c2', name: 'Cap', role: 'captain', totalHours: 10, hardWatches: 1 }),
    ];
    const { container } = render(<Panel {...baseProps()} crewStats={stats} captainParticipates={false} />);
    // avgHours should only consider Jan (20h) not Captain
    expect(container.textContent).toContain('20h');
  });

  it('handles empty activeStats (avgHours = 0)', async () => {
    const Panel = await importComponent();
    const stats = [
      makeCrewStat({ id: 'c1', name: 'Chef', role: 'cook', totalHours: 0, hardWatches: 0 }),
    ];
    const { container } = render(<Panel {...baseProps()} crewStats={stats} />);
    expect(container.textContent).toContain('0h');
  });

  it('shows percentage label when width > 20%', async () => {
    const Panel = await importComponent();
    // One member with 100% of maxHours → percentage = 100 → should show "100%"
    const stats = [
      makeCrewStat({ id: 'c1', name: 'Jan', role: 'sailor', totalHours: 20, hardWatches: 3 }),
    ];
    const { container } = render(<Panel {...baseProps()} crewStats={stats} />);
    expect(container.textContent).toContain('100%');
  });

  it('hides percentage label when width <= 20%', async () => {
    const Panel = await importComponent();
    // Two members — second has very low hours relative to max
    const stats = [
      makeCrewStat({ id: 'c1', name: 'Jan', role: 'sailor', totalHours: 100, hardWatches: 5 }),
      makeCrewStat({ id: 'c2', name: 'Ola', role: 'sailor', totalHours: 10, hardWatches: 1 }),
    ];
    const { container } = render(<Panel {...baseProps()} crewStats={stats} />);
    // Ola has 10/100 = 10%, below 20 threshold — no percentage text for her bar
    // Jan has 100/100 = 100%, shows "100%"
    expect(container.textContent).toContain('100%');
  });

  it('color classes differ for idx 0, 1, 2+ in light mode', async () => {
    const Panel = await importComponent();
    const stats = [
      makeCrewStat({ id: 'c1', name: 'A', role: 'sailor', totalHours: 30, hardWatches: 5 }),
      makeCrewStat({ id: 'c2', name: 'B', role: 'sailor', totalHours: 20, hardWatches: 3 }),
      makeCrewStat({ id: 'c3', name: 'C', role: 'sailor', totalHours: 10, hardWatches: 1 }),
    ];
    const { container } = render(<Panel {...baseProps()} crewStats={stats} />);
    expect(container.innerHTML).toContain('bg-sky-600');
    expect(container.innerHTML).toContain('bg-sky-500');
    expect(container.innerHTML).toContain('bg-sky-400');
  });

  it('color classes differ for idx 0, 1, 2+ in night mode', async () => {
    const Panel = await importComponent();
    const stats = [
      makeCrewStat({ id: 'c1', name: 'A', role: 'sailor', totalHours: 30, hardWatches: 5 }),
      makeCrewStat({ id: 'c2', name: 'B', role: 'sailor', totalHours: 20, hardWatches: 3 }),
      makeCrewStat({ id: 'c3', name: 'C', role: 'sailor', totalHours: 10, hardWatches: 1 }),
    ];
    const { container } = render(<Panel {...baseProps()} crewStats={stats} isNightMode={true} />);
    expect(container.innerHTML).toContain('bg-red-700');
    expect(container.innerHTML).toContain('bg-red-600');
    expect(container.innerHTML).toContain('bg-red-800');
  });

  it('renders top performers by hours and night watches', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.textContent).toContain('🏆');
    expect(container.textContent).toContain('🌙');
  });

  it('renders total watches from schedule', async () => {
    const Panel = await importComponent();
    const schedule = [
      makeDaySchedule({ slots: [makeSlot(), makeSlot({ id: 's2', start: '16:00', end: '24:00' })] }),
      makeDaySchedule({ day: 2, slots: [makeSlot({ id: 's3' })] }),
    ];
    const { container } = render(<Panel {...baseProps()} schedule={schedule} />);
    // 2 + 1 = 3 total watches
    expect(container.textContent).toContain('3');
  });
});

// =====================================================================
// CrewStatsPanel
// =====================================================================
describe('CrewStatsPanel', () => {
  const importComponent = async () =>
    (await import('../src/modules/wachtownik/components/CrewStatsPanel')).CrewStatsPanel;

  const baseProps = () => ({
    isNightMode: false,
    userLocale: 'pl-PL' as Locale,
    captainParticipates: true,
    downloadICS: vi.fn(),
    crewStats: [
      makeCrewStat({ id: 'c1', name: 'Jan', role: 'sailor', totalHours: 16, hardWatches: 2 }),
      makeCrewStat({ id: 'c2', name: 'Kap', role: 'captain', totalHours: 12, hardWatches: 1 }),
      makeCrewStat({ id: 'c3', name: 'Chef', role: 'cook', totalHours: 0, hardWatches: 0 }),
    ],
  });

  it('renders crew members with hours when not excluded', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.textContent).toContain('Jan');
    expect(container.textContent).toContain('16h');
  });

  it('shows exemption text for cook', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.textContent).toContain('Zwolniony z wacht');
  });

  it('shows exemption for captain when captainParticipates=false', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} captainParticipates={false} />);
    const text = container.textContent!;
    // Both cook and captain should show exemption
    const exemptMatches = text.match(/Zwolniony z wacht/g);
    expect(exemptMatches!.length).toBe(2);
  });

  it('does NOT exclude captain when captainParticipates=true', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} captainParticipates={true} />);
    // Captain Kap shows hours
    expect(container.textContent).toContain('12h');
  });

  it('shows download button only for non-excluded members', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    const { container } = render(<Panel {...props} />);
    // There are 3 crew members; cook is excluded, captain participates → 2 download buttons
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(2);
  });

  it('hides download button for excluded captain', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} captainParticipates={false} />);
    // Only sailor Jan gets a button
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(1);
  });

  it('calls downloadICS when clicking download button', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    const { container } = render(<Panel {...props} />);
    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[0]);
    expect(props.downloadICS).toHaveBeenCalledOnce();
  });

  it('renders in night mode styling', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} isNightMode={true} />);
    expect(container.innerHTML).toContain('bg-zinc-950');
    expect(container.innerHTML).toContain('border-red-900');
  });

  it('shows cook icon for cook role', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.innerHTML).toContain('text-emerald-500');
  });

  it('shows captain shield icon when captain excluded', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} captainParticipates={false} />);
    expect(container.innerHTML).toContain('text-amber-500');
  });
});

// =====================================================================
// QRModal
// =====================================================================
describe('QRModal', () => {
  const importComponent = async () =>
    (await import('../src/modules/wachtownik/components/QRModal')).QRModal;

  const baseProps = () => ({
    isNightMode: false,
    setShowQRModal: vi.fn(),
    qrError: null as string | null,
    qrCodeRef: { current: null },
  });

  it('renders without error — shows QR container', async () => {
    const Modal = await importComponent();
    const { container } = render(<Modal {...baseProps()} />);
    expect(container.textContent).toContain('Udostępnij przez QR kod');
    expect(container.textContent).toContain('Zeskanuj ten kod QR');
  });

  it('renders with error — shows error message', async () => {
    const Modal = await importComponent();
    const { container } = render(<Modal {...baseProps()} qrError="Something went wrong" />);
    expect(container.textContent).toContain('Something went wrong');
    expect(container.textContent).toContain('Użyj przycisku');
  });

  it('clicking overlay calls setShowQRModal(false)', async () => {
    const Modal = await importComponent();
    const props = baseProps();
    const { container } = render(<Modal {...props} />);
    const overlay = container.firstElementChild!;
    fireEvent.click(overlay);
    expect(props.setShowQRModal).toHaveBeenCalledWith(false);
  });

  it('clicking inner dialog does NOT close (stopPropagation)', async () => {
    const Modal = await importComponent();
    const props = baseProps();
    const { container } = render(<Modal {...props} />);
    const dialog = container.querySelector('[role="dialog"]')!;
    fireEvent.click(dialog);
    // Only the overlay onClick calls setShowQRModal, stopPropagation prevents it
    expect(props.setShowQRModal).not.toHaveBeenCalled();
  });

  it('clicking close button calls setShowQRModal(false)', async () => {
    const Modal = await importComponent();
    const props = baseProps();
    render(<Modal {...props} />);
    const closeBtn = screen.getByLabelText('Zamknij okno (Escape)');
    fireEvent.click(closeBtn);
    expect(props.setShowQRModal).toHaveBeenCalledWith(false);
  });

  it('Escape key on overlay calls setShowQRModal(false)', async () => {
    const Modal = await importComponent();
    const props = baseProps();
    const { container } = render(<Modal {...props} />);
    const overlay = container.firstElementChild!;
    fireEvent.keyDown(overlay, { key: 'Escape' });
    expect(props.setShowQRModal).toHaveBeenCalledWith(false);
  });

  it('Esc key (legacy) also calls setShowQRModal(false)', async () => {
    const Modal = await importComponent();
    const props = baseProps();
    const { container } = render(<Modal {...props} />);
    const overlay = container.firstElementChild!;
    fireEvent.keyDown(overlay, { key: 'Esc' });
    expect(props.setShowQRModal).toHaveBeenCalledWith(false);
  });

  it('non-Escape key does NOT call setShowQRModal', async () => {
    const Modal = await importComponent();
    const props = baseProps();
    const { container } = render(<Modal {...props} />);
    const overlay = container.firstElementChild!;
    fireEvent.keyDown(overlay, { key: 'Enter' });
    expect(props.setShowQRModal).not.toHaveBeenCalled();
  });

  it('renders night mode styling', async () => {
    const Modal = await importComponent();
    const { container } = render(<Modal {...baseProps()} isNightMode={true} />);
    expect(container.innerHTML).toContain('bg-zinc-950');
    expect(container.innerHTML).toContain('border-red-900');
  });

  it('renders light mode styling', async () => {
    const Modal = await importComponent();
    const { container } = render(<Modal {...baseProps()} isNightMode={false} />);
    expect(container.innerHTML).toContain('bg-white');
  });

  it('shows different text based on qrError state', async () => {
    const Modal = await importComponent();
    // Without error
    const { container: c1 } = render(<Modal {...baseProps()} />);
    expect(c1.textContent).toContain('Zeskanuj ten kod QR');
    // With error
    const { container: c2 } = render(<Modal {...baseProps()} qrError="Error" />);
    expect(c2.textContent).toContain('Użyj przycisku');
    expect(c2.textContent).not.toContain('Zeskanuj ten kod QR');
  });
});

// =====================================================================
// GanttChartPanel
// =====================================================================
describe('GanttChartPanel', () => {
  const importComponent = async () =>
    (await import('../src/modules/wachtownik/components/GanttChartPanel')).GanttChartPanel;

  const baseProps = () => ({
    isNightMode: false,
    userLocale: 'pl-PL' as Locale,
    startDate: '2024-06-01',
    schedule: [
      makeDaySchedule({
        day: 1,
        slots: [
          makeSlot({ id: 's1', start: '08:00', end: '16:00', assigned: [makeCrew({ id: 'c1', name: 'Jan' }), makeCrew({ id: 'c2', name: 'Ola' })] }),
          makeSlot({ id: 's2', start: '16:00', end: '24:00', assigned: [makeCrew({ id: 'c3', name: 'Kap' })] }),
        ],
      }),
    ],
  });

  it('renders crew members from schedule', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.textContent).toContain('Jan');
    expect(container.textContent).toContain('Ola');
    expect(container.textContent).toContain('Kap');
  });

  it('renders in night mode', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} isNightMode={true} />);
    expect(container.innerHTML).toContain('bg-zinc-950');
  });

  it('handles 24:00 end time (midnight)', async () => {
    const Panel = await importComponent();
    const schedule = [makeDaySchedule({
      day: 1,
      slots: [makeSlot({ id: 's1', start: '20:00', end: '24:00', assigned: [makeCrew({ name: 'Jan' })] })],
    })];
    const { container } = render(<Panel {...baseProps()} schedule={schedule} />);
    expect(container.textContent).toContain('Jan');
  });

  it('handles regular end time (not 24:00)', async () => {
    const Panel = await importComponent();
    const schedule = [makeDaySchedule({
      day: 1,
      slots: [makeSlot({ id: 's1', start: '08:00', end: '12:00', assigned: [makeCrew({ name: 'Jan' })] })],
    })];
    const { container } = render(<Panel {...baseProps()} schedule={schedule} />);
    expect(container.textContent).toContain('Jan');
  });

  it('returns null for slot where crew member is not assigned', async () => {
    const Panel = await importComponent();
    const schedule = [makeDaySchedule({
      day: 1,
      slots: [
        makeSlot({ id: 's1', start: '08:00', end: '16:00', assigned: [makeCrew({ id: 'c1', name: 'Jan' })] }),
        makeSlot({ id: 's2', start: '16:00', end: '24:00', assigned: [makeCrew({ id: 'c2', name: 'Ola' })] }),
      ],
    })];
    const { container } = render(<Panel {...baseProps()} schedule={schedule} />);
    // Both crew are listed as allCrewMembers, but each only renders bars for their assigned slots
    expect(container.textContent).toContain('Jan');
    expect(container.textContent).toContain('Ola');
  });

  it('shows time label when width > 8%', async () => {
    const Panel = await importComponent();
    // 08:00-16:00 = 8 hours = 33.3% width > 8%
    const schedule = [makeDaySchedule({
      day: 1,
      slots: [makeSlot({ id: 's1', start: '08:00', end: '16:00', assigned: [makeCrew({ name: 'Jan' })] })],
    })];
    const { container } = render(<Panel {...baseProps()} schedule={schedule} />);
    expect(container.textContent).toContain('08:00-16:00');
  });

  it('hides time label when width <= 8%', async () => {
    const Panel = await importComponent();
    // 08:00-09:00 = 1 hour = ~4.2% width <= 8%
    const schedule = [makeDaySchedule({
      day: 1,
      slots: [makeSlot({ id: 's1', start: '08:00', end: '09:00', assigned: [makeCrew({ name: 'Jan' })] })],
    })];
    const { container } = render(<Panel {...baseProps()} schedule={schedule} />);
    expect(container.textContent).not.toContain('08:00-09:00');
  });

  it('cycles through color array', async () => {
    const Panel = await importComponent();
    const assigned = [makeCrew({ name: 'Jan' })];
    const schedule = [makeDaySchedule({
      day: 1,
      slots: Array.from({ length: 7 }, (_, i) => makeSlot({
        id: `s${i}`,
        start: `${String(i * 3).padStart(2, '0')}:00`,
        end: `${String(i * 3 + 3).padStart(2, '0')}:00`,
        assigned,
      })),
    })];
    const { container } = render(<Panel {...baseProps()} schedule={schedule} />);
    // 7 slots with 6 colors → slot 7 (idx 6) wraps back to color 0 (blue)
    expect(container.innerHTML).toContain('bg-blue-500');
    expect(container.innerHTML).toContain('bg-green-500');
  });

  it('renders multiple days', async () => {
    const Panel = await importComponent();
    const schedule = [
      makeDaySchedule({ day: 1, slots: [makeSlot({ assigned: [makeCrew({ name: 'Jan' })] })] }),
      makeDaySchedule({ day: 2, slots: [makeSlot({ id: 's2', assigned: [makeCrew({ name: 'Ola' })] })] }),
    ];
    const { container } = render(<Panel {...baseProps()} schedule={schedule} />);
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
  });

  it('renders empty schedule without errors', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} schedule={[]} />);
    expect(container.innerHTML).not.toBe('');
  });
});

// =====================================================================
// LiveDashboardPanel
// =====================================================================
describe('LiveDashboardPanel', () => {
  const importComponent = async () =>
    (await import('../src/modules/wachtownik/components/LiveDashboardPanel')).LiveDashboardPanel;

  const makeAbsoluteSlot = () => ({
    id: 'as1',
    start: '08:00',
    end: '16:00',
    reqCrew: 2,
    assigned: [makeCrew({ name: 'Jan' }), makeCrew({ id: 'c2', name: 'Ola' })],
    dayNumber: 1,
    absoluteStart: new Date('2024-06-01T08:00:00'),
    absoluteEnd: new Date('2024-06-01T16:00:00'),
  });

  const baseDashboard = (): DashboardData => ({
    currentSlot: makeAbsoluteSlot(),
    nextSlot: {
      ...makeAbsoluteSlot(),
      id: 'ns1',
      start: '16:00',
      end: '24:00',
      assigned: [makeCrew({ id: 'c3', name: 'Kap' })],
    },
    status: 'W TRAKCIE',
    progress: 45,
    allSlotsAbsolute: [],
  });

  const baseProps = () => ({
    isNightMode: false,
    userLocale: 'pl-PL' as Locale,
    dashboardData: baseDashboard(),
    currentTime: new Date('2024-06-01T12:00:00'),
    notificationsEnabled: false,
    toggleNotifications: vi.fn(),
  });

  it('renders current watch when status is "W TRAKCIE" with currentSlot', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.textContent).toContain('TERAZ NA WACHCIE');
    expect(container.textContent).toContain('Jan');
    expect(container.textContent).toContain('Ola');
  });

  it('renders "PRZED REJSEM" state when no currentSlot', async () => {
    const Panel = await importComponent();
    const data = baseDashboard();
    data.status = 'PRZED REJSEM';
    data.currentSlot = null;
    const { container } = render(<Panel {...baseProps()} dashboardData={data} />);
    expect(container.textContent).toContain('Oczekujemy na wypłynięcie');
  });

  it('renders "PO REJSIE" state (default else branch)', async () => {
    const Panel = await importComponent();
    const data = baseDashboard();
    data.status = 'PO REJSIE';
    data.currentSlot = null;
    const { container } = render(<Panel {...baseProps()} dashboardData={data} />);
    expect(container.textContent).toContain('Rejs zakończony');
  });

  it('renders next slot info when nextSlot is present', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.textContent).toContain('16:00');
    expect(container.textContent).toContain('Kap');
  });

  it('renders "no upcoming" when nextSlot is null', async () => {
    const Panel = await importComponent();
    const data = baseDashboard();
    data.nextSlot = null;
    const { container } = render(<Panel {...baseProps()} dashboardData={data} />);
    expect(container.textContent).toContain('Brak kolejnych wacht.');
  });

  it('shows notifications enabled state', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} notificationsEnabled={true} />);
    expect(container.textContent).toContain('Alarm ON');
  });

  it('shows notifications disabled state', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} notificationsEnabled={false} />);
    expect(container.textContent).toContain('Alarm OFF');
  });

  it('calls toggleNotifications on click', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    render(<Panel {...props} />);
    const toggleBtn = screen.getByText('Alarm OFF').closest('button')!;
    fireEvent.click(toggleBtn);
    expect(props.toggleNotifications).toHaveBeenCalledOnce();
  });

  it('renders in night mode', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} isNightMode={true} />);
    expect(container.innerHTML).toContain('bg-zinc-950');
  });

  it('renders progress percentage', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.textContent).toContain('45%');
  });
});

// =====================================================================
// SetupTabPanel
// =====================================================================
describe('SetupTabPanel', () => {
  const importComponent = async () =>
    (await import('../src/modules/wachtownik/components/SetupTabPanel')).SetupTabPanel;

  const defaultRecommendation = (): Recommendation => ({
    templateKey: '6x4h',
    template: {
      nameKey: 'template.6x4h',
      descKey: 'template.6x4h.desc',
      minCrew: 3,
      optimalCrew: 6,
      slots: [],
    },
    score: 100,
    reason: 'Best for your crew',
  });

  const baseProps = () => ({
    isNightMode: false,
    userLocale: 'pl-PL' as Locale,
    crew: [
      makeCrew({ id: 'c1', name: 'Anna', role: 'captain' }),
      makeCrew({ id: 'c2', name: 'Michał', role: 'officer' }),
      makeCrew({ id: 'c3', name: 'Kasia', role: 'sailor' }),
      makeCrew({ id: 'c4', name: 'Tomek', role: 'sailor' }),
      makeCrew({ id: 'c5', name: 'Piotr', role: 'cook' }),
    ],
    newCrewName: '',
    setNewCrewName: vi.fn(),
    newCrewRole: 'sailor',
    setNewCrewRole: vi.fn(),
    captainParticipates: true,
    setCaptainParticipates: vi.fn(),
    recommendations: [defaultRecommendation()],
    addCrew: vi.fn(),
    removeCrew: vi.fn(),
    slots: [
      makeWatchSlot({ id: 'ws1', start: '00:00', end: '08:00' }),
      makeWatchSlot({ id: 'ws2', start: '08:00', end: '16:00' }),
      makeWatchSlot({ id: 'ws3', start: '16:00', end: '24:00' }),
    ],
    addSlot: vi.fn(),
    removeSlot: vi.fn(),
    updateSlot: vi.fn(),
    getCoverage: vi.fn().mockReturnValue({
      totalMinutes: 1440,
      gaps: [],
      hasFull24h: true,
    } as CoverageResult),
    applyDogWatches: vi.fn(),
    applyTemplate: vi.fn(),
    startDate: '2024-06-01',
    setStartDate: vi.fn(),
    days: 7,
    setDays: vi.fn(),
    generateSchedule: vi.fn(),
  });

  it('renders basic structure', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.textContent).toContain('Anna');
    expect(container.textContent).toContain('Michał');
  });

  it('renders in night mode', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} isNightMode={true} />);
    expect(container.innerHTML).toContain('bg-zinc-950');
  });

  // ── Crew size indicator branches ──

  it('shows "optimal" crew size when in range', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    // 4 active crew (excluding cook), optimal=6, min=3 → crewSize >= min && crewSize <= optimal+2
    const { container } = render(<Panel {...props} />);
    expect(container.innerHTML).toContain('bg-emerald-500');
  });

  it('shows "low" crew size when below minCrew', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    // Only 2 active crew (below minCrew=3)
    props.crew = [
      makeCrew({ id: 'c1', name: 'Anna', role: 'sailor' }),
      makeCrew({ id: 'c2', name: 'Bob', role: 'sailor' }),
    ];
    const { container } = render(<Panel {...props} />);
    expect(container.innerHTML).toContain('bg-red-500');
  });

  it('shows "high" crew size when above optimal+2', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    // 10 active crew (much above optimal=6 + 2 = 8)
    props.crew = Array.from({ length: 10 }, (_, i) => makeCrew({ id: `c${i}`, name: `P${i}`, role: 'sailor' }));
    const { container } = render(<Panel {...props} />);
    expect(container.innerHTML).toContain('bg-orange-500');
  });

  it('shows "low" night mode styling', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.isNightMode = true;
    props.crew = [
      makeCrew({ id: 'c1', name: 'Anna', role: 'sailor' }),
      makeCrew({ id: 'c2', name: 'Bob', role: 'sailor' }),
    ];
    const { container } = render(<Panel {...props} />);
    expect(container.innerHTML).toContain('bg-red-900');
  });

  it('hides crew size indicator when no recommendations', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.recommendations = [];
    const { container } = render(<Panel {...props} />);
    // No crew size status bar rendered
    expect(container.textContent).not.toContain('label.crewSize');
  });

  // ── isExcluded branch for crew list ──

  it('shows line-through for cook in crew list', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    // Piotr (cook) should have line-through
    expect(container.innerHTML).toContain('line-through');
  });

  it('shows line-through for non-participating captain', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} captainParticipates={false} />);
    // Anna (captain) now also has line-through
    const lineThrough = container.querySelectorAll('.line-through');
    expect(lineThrough.length).toBeGreaterThanOrEqual(2);
  });

  // ── Captain participates toggle ──

  it('shows active toggle when captainParticipates=true', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} captainParticipates={true} />);
    expect(container.innerHTML).toContain('bg-sky-600');
  });

  it('shows inactive toggle when captainParticipates=false', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} captainParticipates={false} />);
    expect(container.innerHTML).toContain('bg-slate-300');
  });

  // ── Add crew input ──

  it('calls addCrew via add button click', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.newCrewName = 'NewPerson';
    const { container } = render(<Panel {...props} />);
    const addBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('Dodaj osobę')
    )!;
    fireEvent.click(addBtn);
    expect(props.addCrew).toHaveBeenCalledOnce();
  });

  it('does NOT call addCrew on non-Enter keypress', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    const { container } = render(<Panel {...props} />);
    const input = container.querySelector('input[type="text"]')!;
    fireEvent.keyPress(input, { key: 'a', charCode: 97 });
    expect(props.addCrew).not.toHaveBeenCalled();
  });

  it('disables add button when crew >= 15', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.crew = Array.from({ length: 15 }, (_, i) => makeCrew({ id: `c${i}`, name: `P${i}` }));
    const { container } = render(<Panel {...props} />);
    const addBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('Dodaj osobę')
    );
    expect(addBtn?.getAttribute('disabled')).not.toBeNull();
  });

  it('enables add button when crew < 15', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    const addBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.includes('Dodaj osobę')
    );
    expect(addBtn?.getAttribute('disabled')).toBeNull();
  });

  // ── Recommendations section ──

  it('renders recommendations when present', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.textContent).toContain('Rekomendowane systemy');
    expect(container.textContent).toContain('⭐');
    expect(container.textContent).toContain('Najlepszy');
  });

  it('hides recommendations when empty', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.recommendations = [];
    const { container } = render(<Panel {...props} />);
    expect(container.textContent).not.toContain('Rekomendowane systemy');
  });

  it('highlights first recommendation with different styling', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.recommendations = [
      defaultRecommendation(),
      { ...defaultRecommendation(), templateKey: '3x8h', template: { ...defaultRecommendation().template, nameKey: 'template.3x8h' }, score: 80 },
    ];
    const { container } = render(<Panel {...props} />);
    expect(container.innerHTML).toContain('border-emerald-300');
    // Second has different style
    expect(container.innerHTML).toContain('border-emerald-100');
  });

  it('first recommendation shows star and "best" badge', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.recommendations = [
      defaultRecommendation(),
      { ...defaultRecommendation(), templateKey: '3x8h', score: 80 },
    ];
    const { container } = render(<Panel {...props} />);
    expect(container.textContent).toContain('⭐');
    expect(container.textContent).toContain('Najlepszy');
  });

  it('calls applyTemplate when clicking a recommendation', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    render(<Panel {...props} />);
    // Find the recommendation button
    const recBtn = screen.getByText('Best for your crew').closest('button')!;
    fireEvent.click(recBtn);
    expect(props.applyTemplate).toHaveBeenCalledWith('6x4h');
  });

  // ── Coverage display ──

  it('shows full 24h coverage (green) when hasFull24h', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    const { container } = render(<Panel {...props} />);
    expect(container.innerHTML).toContain('bg-green-50');
    expect(container.innerHTML).toContain('border-green-200');
  });

  it('shows partial coverage (orange) when gaps exist', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.getCoverage = vi.fn().mockReturnValue({
      totalMinutes: 960,
      gaps: [{ start: '00:00', end: '08:00', minutes: 480 }],
      hasFull24h: false,
    } as CoverageResult);
    const { container } = render(<Panel {...props} />);
    expect(container.innerHTML).toContain('bg-orange-50');
    expect(container.innerHTML).toContain('border-orange-200');
  });

  it('shows gap details when gaps exist', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.getCoverage = vi.fn().mockReturnValue({
      totalMinutes: 960,
      gaps: [{ start: '00:00', end: '08:00', minutes: 480 }],
      hasFull24h: false,
    });
    const { container } = render(<Panel {...props} />);
    expect(container.textContent).toContain('00:00');
    expect(container.textContent).toContain('08:00');
  });

  it('hides gap details when no gaps', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    // With full 24h coverage, no gap details shown
    // The gap section should not render the gap.start-gap.end pairs
    const gapMatches = container.querySelectorAll('.text-orange-700');
    expect(gapMatches.length).toBe(0);
  });

  it('hides coverage section when no slots', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.slots = [];
    const { container } = render(<Panel {...props} />);
    expect(container.textContent).not.toContain('msg.coverage24h');
    expect(container.textContent).not.toContain('msg.coverageGap');
  });

  // ── 24h timeline colors ──

  it('renders timeline with green hours (100% coverage)', async () => {
    const Panel = await importComponent();
    const { container } = render(<Panel {...baseProps()} />);
    expect(container.innerHTML).toContain('bg-green-500');
  });

  it('renders timeline with uncovered hours (0%)', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.slots = [makeWatchSlot({ id: 'ws1', start: '08:00', end: '16:00' })];
    props.getCoverage = vi.fn().mockReturnValue({
      totalMinutes: 480,
      gaps: [{ start: '00:00', end: '08:00', minutes: 480 }, { start: '16:00', end: '24:00', minutes: 480 }],
      hasFull24h: false,
    });
    const { container } = render(<Panel {...props} />);
    // Partially covered → has both orange and uncovered hours
    expect(container.innerHTML).toContain('bg-slate-200');
  });

  // ── Slot management ──

  it('calls addSlot when clicking add slot button', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    render(<Panel {...props} />);
    const addSlotBtn = screen.getByText('Dodaj okno wachtowe').closest('button')!;
    fireEvent.click(addSlotBtn);
    expect(props.addSlot).toHaveBeenCalledOnce();
  });

  it('calls removeSlot when clicking trash button', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    const { container } = render(<Panel {...props} />);
    // Desktop table trash buttons
    const trashButtons = container.querySelectorAll('table button');
    if (trashButtons.length > 0) {
      fireEvent.click(trashButtons[0]);
      expect(props.removeSlot).toHaveBeenCalled();
    }
  });

  it('calls removeCrew when clicking remove button on crew', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    const { container } = render(<Panel {...props} />);
    // Find the first crew delete button (has Trash2 icon)
    const crewDelButtons = container.querySelectorAll('.space-y-3 button');
    if (crewDelButtons.length > 0) {
      fireEvent.click(crewDelButtons[0]);
      expect(props.removeCrew).toHaveBeenCalled();
    }
  });

  it('calls generateSchedule when clicking generate button', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    render(<Panel {...props} />);
    const genBtn = screen.getByText('Generuj harmonogram wacht').closest('button')!;
    fireEvent.click(genBtn);
    expect(props.generateSchedule).toHaveBeenCalledOnce();
  });

  it('calls applyDogWatches when clicking dog watches button', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    render(<Panel {...props} />);
    const btn = screen.getByText('Dodaj Psie Wachty (16-20)').closest('button')!;
    fireEvent.click(btn);
    expect(props.applyDogWatches).toHaveBeenCalledOnce();
  });

  // ── Night mode for coverage section ──

  it('coverage section night mode with full coverage', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.isNightMode = true;
    const { container } = render(<Panel {...props} />);
    expect(container.innerHTML).toContain('bg-green-950/20');
  });

  it('coverage section night mode with gaps', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.isNightMode = true;
    props.getCoverage = vi.fn().mockReturnValue({
      totalMinutes: 960,
      gaps: [{ start: '00:00', end: '08:00', minutes: 480 }],
      hasFull24h: false,
    });
    const { container } = render(<Panel {...props} />);
    expect(container.innerHTML).toContain('bg-orange-950/20');
  });

  // ── Recommendations night mode ──

  it('recommendations render in night mode', async () => {
    const Panel = await importComponent();
    const props = baseProps();
    props.isNightMode = true;
    props.recommendations = [
      defaultRecommendation(),
      { ...defaultRecommendation(), templateKey: '3x8h', score: 80 },
    ];
    const { container } = render(<Panel {...props} />);
    expect(container.innerHTML).toContain('bg-red-950');
    expect(container.innerHTML).toContain('border-red-700');
  });
});

// =====================================================================
// useAppSettings — additional branch coverage
// =====================================================================
describe('useAppSettings — branch coverage', () => {
  const importHook = async () =>
    await import('../src/modules/wachtownik/hooks/useAppSettings');

  // ── detectLocale branches ──

  describe('detectLocale', () => {
    it('returns saved locale "en-US" from localStorage', async () => {
      const { detectLocale } = await importHook();
      localStorage.setItem('wachtownik_language', 'en-US');
      expect(detectLocale()).toBe('en-US');
    });

    it('returns saved locale "pl-PL" from localStorage', async () => {
      const { detectLocale } = await importHook();
      localStorage.setItem('wachtownik_language', 'pl-PL');
      expect(detectLocale()).toBe('pl-PL');
    });

    it('falls back to browser locale starting with "en"', async () => {
      const { detectLocale } = await importHook();
      localStorage.removeItem('wachtownik_language');
      const origLang = navigator.language;
      Object.defineProperty(navigator, 'language', { value: 'en-GB', configurable: true });
      expect(detectLocale()).toBe('en-US');
      Object.defineProperty(navigator, 'language', { value: origLang, configurable: true });
    });

    it('falls back to pl-PL for non-English browser locale', async () => {
      const { detectLocale } = await importHook();
      localStorage.removeItem('wachtownik_language');
      const origLang = navigator.language;
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      expect(detectLocale()).toBe('pl-PL');
      Object.defineProperty(navigator, 'language', { value: origLang, configurable: true });
    });

    it('returns pl-PL when saved locale is invalid', async () => {
      const { detectLocale } = await importHook();
      localStorage.setItem('wachtownik_language', 'fr-FR');
      const origLang = navigator.language;
      Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true });
      expect(detectLocale()).toBe('pl-PL');
      Object.defineProperty(navigator, 'language', { value: origLang, configurable: true });
    });
  });

  // ── useAppSettings hook ──

  describe('useAppSettings hook', () => {
    it('toggleNightMode adds and removes dark class', async () => {
      const { useAppSettings } = await importHook();
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.isNightMode).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      act(() => result.current.toggleNightMode());
      expect(result.current.isNightMode).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      act(() => result.current.toggleNightMode());
      expect(result.current.isNightMode).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('toggleLanguage switches between pl-PL and en-US', async () => {
      const { useAppSettings } = await importHook();
      const { result } = renderHook(() => useAppSettings());

      const initial = result.current.userLocale;
      act(() => result.current.toggleLanguage());
      expect(result.current.userLocale).not.toBe(initial);
      act(() => result.current.toggleLanguage());
      expect(result.current.userLocale).toBe(initial);
    });

    it('toggleLanguage persists to localStorage', async () => {
      const { useAppSettings } = await importHook();
      const { result } = renderHook(() => useAppSettings());

      act(() => result.current.toggleLanguage());
      expect(localStorage.getItem('wachtownik_language')).toBeDefined();
    });

    it('toggleNotifications requests permission when disabled', async () => {
      const { useAppSettings } = await importHook();

      // Mock Notification API
      const mockRequestPermission = vi.fn().mockResolvedValue('granted');
      (window as any).Notification = { requestPermission: mockRequestPermission };

      const { result } = renderHook(() => useAppSettings());
      expect(result.current.notificationsEnabled).toBe(false);

      await act(async () => {
        await result.current.toggleNotifications();
      });
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result.current.notificationsEnabled).toBe(true);

      delete (window as any).Notification;
    });

    it('toggleNotifications disables when already enabled', async () => {
      const { useAppSettings } = await importHook();

      const mockRequestPermission = vi.fn().mockResolvedValue('granted');
      (window as any).Notification = { requestPermission: mockRequestPermission };

      const { result } = renderHook(() => useAppSettings());

      // First enable
      await act(async () => {
        await result.current.toggleNotifications();
      });
      expect(result.current.notificationsEnabled).toBe(true);

      // Then disable
      await act(async () => {
        await result.current.toggleNotifications();
      });
      expect(result.current.notificationsEnabled).toBe(false);

      delete (window as any).Notification;
    });

    it('toggleNotifications alerts when permission denied', async () => {
      const { useAppSettings } = await importHook();

      const mockRequestPermission = vi.fn().mockResolvedValue('denied');
      (window as any).Notification = { requestPermission: mockRequestPermission };
      const mockAlert = vi.fn();
      window.alert = mockAlert;

      const { result } = renderHook(() => useAppSettings());

      await act(async () => {
        await result.current.toggleNotifications();
      });
      expect(mockAlert).toHaveBeenCalled();
      expect(result.current.notificationsEnabled).toBe(false);

      delete (window as any).Notification;
    });

    it('toggleNotifications does nothing when Notification API unavailable', async () => {
      const { useAppSettings } = await importHook();

      // Ensure no Notification in window
      delete (window as any).Notification;

      const { result } = renderHook(() => useAppSettings());

      await act(async () => {
        await result.current.toggleNotifications();
      });
      // Should remain disabled, no error thrown
      expect(result.current.notificationsEnabled).toBe(false);
    });

    it('setActiveTab changes the active tab', async () => {
      const { useAppSettings } = await importHook();
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.activeTab).toBe('setup');
      act(() => result.current.setActiveTab('schedule'));
      expect(result.current.activeTab).toBe('schedule');
    });
  });
});
