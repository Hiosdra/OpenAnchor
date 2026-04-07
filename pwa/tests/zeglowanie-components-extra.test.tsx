import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

beforeEach(() => {
  localStorage.clear();
});

// ── ChecklistsSection ────────────────────────────────────────────────

describe('ChecklistsSection', () => {
  async function importComponent() {
    const { ChecklistsSection } = await import(
      '../src/modules/zeglowanie/components/ChecklistsSection'
    );
    return ChecklistsSection;
  }

  it('renders checklist items for default type (morning)', async () => {
    const C = await importComponent();
    render(<C />);

    const items = screen.getAllByRole('checkbox');
    expect(items.length).toBe(7);
  });

  it('type selector changes displayed checklist', async () => {
    const C = await importComponent();
    const { container } = render(<C />);

    const morningCount = screen.getAllByRole('checkbox').length;
    expect(morningCount).toBe(7);

    // Click "Wyjście z portu" (departure) button
    const buttons = container.querySelectorAll('button.cruise-btn');
    fireEvent.click(buttons[1]);

    const departureCount = screen.getAllByRole('checkbox').length;
    expect(departureCount).toBe(13);
    expect(departureCount).not.toBe(morningCount);
  });

  it('reset button clears all items for current type', async () => {
    localStorage.setItem('checklist-morning-oil', 'true');
    localStorage.setItem('checklist-morning-battery', 'true');
    globalThis.confirm = vi.fn(() => true);

    const C = await importComponent();
    render(<C />);

    const resetBtn = screen.getByText('Wyczyść obecną checklistę');
    fireEvent.click(resetBtn);

    expect(localStorage.getItem('checklist-morning-oil')).toBeNull();
    expect(localStorage.getItem('checklist-morning-battery')).toBeNull();
  });

  it('renders correct number of items per type', async () => {
    const C = await importComponent();
    const { container } = render(<C />);

    const buttons = container.querySelectorAll('button.cruise-btn');
    const expectedCounts = [7, 13, 11, 8]; // morning, departure, mooring, grabbag

    for (let i = 0; i < buttons.length; i++) {
      fireEvent.click(buttons[i]);
      expect(screen.getAllByRole('checkbox').length).toBe(expectedCounts[i]);
    }
  });
});

// ── PackingSection ───────────────────────────────────────────────────

describe('PackingSection', () => {
  async function importComponent() {
    const { PackingSection } = await import(
      '../src/modules/zeglowanie/components/PackingSection'
    );
    return PackingSection;
  }

  it('renders packing items for default cruise type (baltic-autumn)', async () => {
    const C = await importComponent();
    render(<C />);

    const items = screen.getAllByRole('checkbox');
    expect(items.length).toBe(22);
  });

  it('type selector switches between cruise types', async () => {
    const C = await importComponent();
    const { container } = render(<C />);

    const balticCount = screen.getAllByRole('checkbox').length;
    expect(balticCount).toBe(22);

    // Click "Chorwacja" button
    const buttons = container.querySelectorAll('button.cruise-btn');
    fireEvent.click(buttons[1]);

    const croatiaCount = screen.getAllByRole('checkbox').length;
    expect(croatiaCount).toBe(24);
    expect(croatiaCount).not.toBe(balticCount);
  });

  it('reset button clears packing state', async () => {
    localStorage.setItem('sailing-baltic-autumn-ekuz', 'true');
    localStorage.setItem('sailing-baltic-autumn-dowod', 'true');
    globalThis.confirm = vi.fn(() => true);

    const C = await importComponent();
    render(<C />);

    const resetBtn = screen.getByText('Wyczyść obecną listę');
    fireEvent.click(resetBtn);

    expect(localStorage.getItem('sailing-baltic-autumn-ekuz')).toBeNull();
    expect(localStorage.getItem('sailing-baltic-autumn-dowod')).toBeNull();
  });

  it('correct item count per type', async () => {
    const C = await importComponent();
    const { container } = render(<C />);

    const buttons = container.querySelectorAll('button.cruise-btn');
    fireEvent.click(buttons[0]);
    expect(screen.getAllByRole('checkbox').length).toBe(22);

    fireEvent.click(buttons[1]);
    expect(screen.getAllByRole('checkbox').length).toBe(24);
  });
});

// ── SectionNav ───────────────────────────────────────────────────────

describe('SectionNav', () => {
  async function importComponent() {
    const { SectionNav } = await import(
      '../src/modules/zeglowanie/components/SectionNav'
    );
    return SectionNav;
  }

  it('renders all section names', async () => {
    const C = await importComponent();
    render(<C current="packing" onChange={vi.fn()} />);

    expect(screen.getByText('Pakowanie')).toBeDefined();
    expect(screen.getByText('Zakupy')).toBeDefined();
    expect(screen.getByText('Briefing')).toBeDefined();
    expect(screen.getByText('Checklisty')).toBeDefined();
    expect(screen.getByText('Wiedza')).toBeDefined();
  });

  it('highlights active section', async () => {
    const C = await importComponent();
    const { container } = render(<C current="briefing" onChange={vi.fn()} />);

    const buttons = container.querySelectorAll('button.section-nav-btn');
    const briefingBtn = Array.from(buttons).find((b) => b.textContent?.includes('Briefing'));
    expect(briefingBtn?.className).toContain('active');

    const packingBtn = Array.from(buttons).find((b) => b.textContent?.includes('Pakowanie'));
    expect(packingBtn?.className).not.toContain('active');
  });

  it('click on section calls onSelect callback', async () => {
    const onChange = vi.fn();
    const C = await importComponent();
    render(<C current="packing" onChange={onChange} />);

    fireEvent.click(screen.getByText('Checklisty'));
    expect(onChange).toHaveBeenCalledWith('checklists');
  });

  it('all sections are accessible as buttons', async () => {
    const C = await importComponent();
    const { container } = render(<C current="packing" onChange={vi.fn()} />);

    const buttons = container.querySelectorAll('button.section-nav-btn');
    expect(buttons.length).toBe(5);
  });
});

// ── Header ───────────────────────────────────────────────────────────

describe('Header', () => {
  async function importComponent() {
    const { Header } = await import(
      '../src/modules/zeglowanie/components/Header'
    );
    return Header;
  }

  it('renders back link', async () => {
    const C = await importComponent();
    render(<C />);

    const backLink = screen.getByLabelText('Wróć do menu głównego');
    expect(backLink).toBeDefined();
    expect(backLink.tagName).toBe('A');
  });

  it('renders title text', async () => {
    const C = await importComponent();
    render(<C />);

    expect(screen.getByText('Informacje o Żeglarstwie')).toBeDefined();
  });
});

// ── App (integration) ────────────────────────────────────────────────

describe('App (integration)', () => {
  async function importComponent() {
    const { default: App } = await import(
      '../src/modules/zeglowanie/App'
    );
    return App;
  }

  it('renders default section (packing)', async () => {
    const App = await importComponent();
    render(<App />);

    expect(screen.getByText('Co spakować na rejs?')).toBeDefined();
  });

  it('section navigation switches displayed content', async () => {
    const App = await importComponent();
    render(<App />);

    // Default is packing
    expect(screen.getByText('Co spakować na rejs?')).toBeDefined();

    // Switch to checklists
    fireEvent.click(screen.getByText('Checklisty'));
    expect(screen.getByText('Codziennie rano')).toBeDefined();
  });

  it('all 3 sections render correctly', async () => {
    const App = await importComponent();
    render(<App />);

    // Packing (default)
    expect(screen.getAllByRole('checkbox').length).toBe(22);

    // Briefing
    fireEvent.click(screen.getByText('Briefing'));
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);

    // Checklists
    fireEvent.click(screen.getByText('Checklisty'));
    expect(screen.getAllByRole('checkbox').length).toBe(7);
  });
});
