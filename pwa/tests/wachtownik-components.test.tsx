import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

import type { DaySchedule, Locale } from '../src/modules/wachtownik/types';

// ── Fixtures ─────────────────────────────────────────────────────────

const minimalDaySchedule: DaySchedule = {
  day: 1,
  slots: [
    {
      id: 'slot-1',
      start: '08:00',
      end: '12:00',
      reqCrew: 2,
      assigned: [
        { id: 'crew-1', name: 'Jan Kowalski', role: 'SAILOR' },
      ],
    },
  ],
};

const mockT = (key: string, _locale: Locale = 'pl-PL') => key;

// ── Tests ────────────────────────────────────────────────────────────

describe('wachtownik/components — Icon', () => {
  it('renders known icons', async () => {
    const { Icon } = await import('../src/modules/wachtownik/components/Icon');
    const knownIcons = ['Users', 'Clock', 'Settings', 'Anchor', 'Shield', 'Moon', 'Sun'];
    for (const name of knownIcons) {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });

  it('returns null for unknown icon', async () => {
    const { Icon } = await import('../src/modules/wachtownik/components/Icon');
    const { container } = render(<Icon name="__nonexistent__" />);
    expect(container.innerHTML).toBe('');
  });

  it('passes className through', async () => {
    const { Icon } = await import('../src/modules/wachtownik/components/Icon');
    const { container } = render(<Icon name="Anchor" className="test-class" />);
    expect(container.querySelector('svg')?.classList.contains('test-class')).toBe(true);
  });
});

describe('wachtownik/components — Dropdown', () => {
  it('renders closed by default', async () => {
    const { Dropdown, DropdownItem } = await import('../src/modules/wachtownik/components/Dropdown');
    render(
      <Dropdown label="Menu" isNightMode={false}>
        <DropdownItem icon="Settings" label="Option 1" isNightMode={false} />
      </Dropdown>,
    );
    const button = screen.getByRole('button', { expanded: false });
    expect(button).toBeDefined();
  });

  it('opens on click and shows items', async () => {
    const { Dropdown, DropdownItem } = await import('../src/modules/wachtownik/components/Dropdown');
    render(
      <Dropdown label="Menu" isNightMode={false}>
        <DropdownItem icon="Settings" label="Option A" isNightMode={false} />
        <DropdownItem icon="Users" label="Option B" isNightMode={false} />
      </Dropdown>,
    );
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(screen.getByText('Option A')).toBeDefined();
    expect(screen.getByText('Option B')).toBeDefined();
  });

  it('calls item onClick and closes', async () => {
    const { Dropdown, DropdownItem } = await import('../src/modules/wachtownik/components/Dropdown');
    const onClick = vi.fn();
    render(
      <Dropdown label="Menu" isNightMode={false}>
        <DropdownItem icon="Settings" label="Do thing" isNightMode={false} onClick={onClick} />
      </Dropdown>,
    );
    // Open dropdown
    fireEvent.click(screen.getByRole('button'));
    // Click item
    const item = screen.getByText('Do thing');
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders in night mode', async () => {
    const { Dropdown, DropdownItem } = await import('../src/modules/wachtownik/components/Dropdown');
    const { container } = render(
      <Dropdown label="Night" isNightMode={true} icon="Moon">
        <DropdownItem icon="Sun" label="Toggle" isNightMode={true} />
      </Dropdown>,
    );
    expect(container.innerHTML).not.toBe('');
  });
});

describe('wachtownik/components — ScheduleTableRow', () => {
  it('renders row with day and slots', async () => {
    const { ScheduleTableRow } = await import('../src/modules/wachtownik/components/ScheduleTableRow');
    const { container } = render(
      <table>
        <tbody>
          <ScheduleTableRow
            daySchedule={minimalDaySchedule}
            dayIndex={0}
            startDate="2024-06-01"
            isNightMode={false}
            isReadOnly={false}
            draggedItem={null}
            onDragStart={vi.fn()}
            onDrop={vi.fn()}
            onDragOver={vi.fn()}
            t={mockT}
            userLocale="pl-PL"
          />
        </tbody>
      </table>,
    );
    expect(container.textContent).toContain('Jan Kowalski');
  });

  it('renders in read-only night mode', async () => {
    const { ScheduleTableRow } = await import('../src/modules/wachtownik/components/ScheduleTableRow');
    const { container } = render(
      <table>
        <tbody>
          <ScheduleTableRow
            daySchedule={minimalDaySchedule}
            dayIndex={2}
            startDate="2024-06-01"
            isNightMode={true}
            isReadOnly={true}
            draggedItem={null}
            onDragStart={vi.fn()}
            onDrop={vi.fn()}
            onDragOver={vi.fn()}
            t={mockT}
            userLocale="en-US"
          />
        </tbody>
      </table>,
    );
    expect(container.innerHTML).not.toBe('');
  });

  it('renders multiple slots', async () => {
    const { ScheduleTableRow } = await import('../src/modules/wachtownik/components/ScheduleTableRow');
    const multiSlotDay: DaySchedule = {
      day: 1,
      slots: [
        { id: 's1', start: '00:00', end: '08:00', reqCrew: 2, assigned: [{ id: 'c1', name: 'Anna', role: 'OFFICER' }] },
        { id: 's2', start: '08:00', end: '16:00', reqCrew: 2, assigned: [{ id: 'c2', name: 'Piotr', role: 'CAPTAIN' }] },
        { id: 's3', start: '16:00', end: '24:00', reqCrew: 2, assigned: [] },
      ],
    };
    const { container } = render(
      <table>
        <tbody>
          <ScheduleTableRow
            daySchedule={multiSlotDay}
            dayIndex={0}
            startDate="2024-06-01"
            isNightMode={false}
            isReadOnly={false}
            draggedItem={null}
            onDragStart={vi.fn()}
            onDrop={vi.fn()}
            onDragOver={vi.fn()}
            t={mockT}
            userLocale="pl-PL"
          />
        </tbody>
      </table>,
    );
    expect(container.textContent).toContain('Anna');
    expect(container.textContent).toContain('Piotr');
  });
});
