import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

beforeEach(() => {
  localStorage.clear();
});

// ── ChecklistItem ────────────────────────────────────────────────────

describe('ChecklistItem', () => {
  async function importComponent() {
    const { ChecklistItem } = await import(
      '../src/modules/zeglowanie/components/ChecklistItem'
    );
    return ChecklistItem;
  }

  it('renders unchecked by default', async () => {
    const C = await importComponent();
    render(<C itemId="i1" text="Check oil" storageKey="test-key" />);

    const item = screen.getByRole('checkbox');
    expect(item.getAttribute('aria-checked')).toBe('false');
    expect(item.className).not.toContain('checked');
  });

  it('renders checked when localStorage has "true"', async () => {
    localStorage.setItem('test-key', 'true');
    const C = await importComponent();
    render(<C itemId="i1" text="Check oil" storageKey="test-key" />);

    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
  });

  it('toggles checked state on click and persists to localStorage', async () => {
    const C = await importComponent();
    render(<C itemId="i1" text="Check oil" storageKey="test-key" />);

    const item = screen.getByRole('checkbox');
    fireEvent.click(item);

    expect(item.getAttribute('aria-checked')).toBe('true');
    expect(localStorage.getItem('test-key')).toBe('true');

    fireEvent.click(item);
    expect(item.getAttribute('aria-checked')).toBe('false');
    expect(localStorage.getItem('test-key')).toBe('false');
  });

  it('toggles on Enter key', async () => {
    const C = await importComponent();
    render(<C itemId="i1" text="Check oil" storageKey="test-key" />);

    const item = screen.getByRole('checkbox');
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(item.getAttribute('aria-checked')).toBe('true');
  });

  it('toggles on Space key', async () => {
    const C = await importComponent();
    render(<C itemId="i1" text="Check oil" storageKey="test-key" />);

    const item = screen.getByRole('checkbox');
    fireEvent.keyDown(item, { key: ' ' });
    expect(item.getAttribute('aria-checked')).toBe('true');
  });

  it('does not toggle on other keys', async () => {
    const C = await importComponent();
    render(<C itemId="i1" text="Check oil" storageKey="test-key" />);

    const item = screen.getByRole('checkbox');
    fireEvent.keyDown(item, { key: 'Tab' });
    expect(item.getAttribute('aria-checked')).toBe('false');
  });

  it('renders plain text by default', async () => {
    const C = await importComponent();
    render(<C itemId="i1" text="Check oil" storageKey="test-key" />);
    expect(screen.getByText('Check oil')).toBeTruthy();
  });

  it('renders with crew prefix', async () => {
    const C = await importComponent();
    render(
      <C itemId="i1" text="Secure hatches" storageKey="test-key" crewPrefix="(Crew) " />,
    );
    expect(screen.getByText(/\(Crew\).*Secure hatches/)).toBeTruthy();
  });

  it('renders HTML content when isHtml is true', async () => {
    const C = await importComponent();
    const { container } = render(
      <C itemId="i1" text="<strong>Bold</strong> text" storageKey="test-key" isHtml />,
    );
    expect(container.querySelector('strong')).toBeTruthy();
  });

  it('has tabIndex for keyboard focus', async () => {
    const C = await importComponent();
    render(<C itemId="i1" text="Item" storageKey="test-key" />);
    expect(screen.getByRole('checkbox').getAttribute('tabindex')).toBe('0');
  });
});

// ── useLocalStorage ──────────────────────────────────────────────────

describe('useLocalStorage', () => {
  async function importHook() {
    const { useLocalStorage } = await import(
      '../src/modules/zeglowanie/hooks/useLocalStorage'
    );
    return useLocalStorage;
  }

  const isValidColor = (v: unknown): v is 'red' | 'blue' =>
    v === 'red' || v === 'blue';

  function TestHarness({
    hook,
  }: {
    hook: typeof import('../src/modules/zeglowanie/hooks/useLocalStorage').useLocalStorage;
  }) {
    const [value, setValue] = hook<'red' | 'blue'>('color', 'red', isValidColor);
    return (
      <div>
        <span data-testid="value">{value}</span>
        <button onClick={() => setValue('blue')}>Set Blue</button>
      </div>
    );
  }

  it('returns default when localStorage is empty', async () => {
    const hook = await importHook();
    render(<TestHarness hook={hook} />);
    expect(screen.getByTestId('value').textContent).toBe('red');
  });

  it('reads persisted value from localStorage', async () => {
    localStorage.setItem('color', 'blue');
    const hook = await importHook();
    render(<TestHarness hook={hook} />);
    expect(screen.getByTestId('value').textContent).toBe('blue');
  });

  it('falls back to default for invalid stored value', async () => {
    localStorage.setItem('color', 'green');
    const hook = await importHook();
    render(<TestHarness hook={hook} />);
    expect(screen.getByTestId('value').textContent).toBe('red');
  });

  it('persists new value to localStorage on update', async () => {
    const hook = await importHook();
    render(<TestHarness hook={hook} />);

    fireEvent.click(screen.getByText('Set Blue'));
    expect(screen.getByTestId('value').textContent).toBe('blue');
    expect(localStorage.getItem('color')).toBe('blue');
  });
});

// ── ResetButton ──────────────────────────────────────────────────────

describe('ResetButton', () => {
  async function importComponent() {
    const { ResetButton } = await import(
      '../src/modules/zeglowanie/components/ResetButton'
    );
    return ResetButton;
  }

  it('renders button with label', async () => {
    const C = await importComponent();
    render(<C label="Reset" confirmMessage="Sure?" onReset={vi.fn()} />);
    expect(screen.getByText('Reset')).toBeTruthy();
  });

  it('calls onReset when confirm returns true', async () => {
    globalThis.confirm = vi.fn(() => true);
    const onReset = vi.fn();
    const C = await importComponent();
    render(<C label="Reset" confirmMessage="Sure?" onReset={onReset} />);

    fireEvent.click(screen.getByText('Reset'));
    expect(globalThis.confirm).toHaveBeenCalledWith('Sure?');
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('does not call onReset when confirm returns false', async () => {
    globalThis.confirm = vi.fn(() => false);
    const onReset = vi.fn();
    const C = await importComponent();
    render(<C label="Reset" confirmMessage="Sure?" onReset={onReset} />);

    fireEvent.click(screen.getByText('Reset'));
    expect(onReset).not.toHaveBeenCalled();
  });
});

// ── TypeSelector ─────────────────────────────────────────────────────

describe('TypeSelector', () => {
  async function importComponent() {
    const { TypeSelector } = await import(
      '../src/modules/zeglowanie/components/TypeSelector'
    );
    return TypeSelector;
  }

  const options = [
    { value: 'a' as const, emoji: '🅰️', label: 'Option A', sublabel: 'First' },
    { value: 'b' as const, emoji: '🅱️', label: 'Option B', sublabel: 'Second' },
  ];

  it('renders all options', async () => {
    const C = await importComponent();
    render(<C options={options} current="a" onChange={vi.fn()} />);

    expect(screen.getByText(/Option A/)).toBeTruthy();
    expect(screen.getByText(/Option B/)).toBeTruthy();
  });

  it('marks the current option as active', async () => {
    const C = await importComponent();
    const { container } = render(
      <C options={options} current="a" onChange={vi.fn()} />,
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons[0].className).toContain('active');
    expect(buttons[1].className).not.toContain('active');
  });

  it('calls onChange with the selected value', async () => {
    const onChange = vi.fn();
    const C = await importComponent();
    render(<C options={options} current="a" onChange={onChange} />);

    fireEvent.click(screen.getByText(/Option B/));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

// ── PlaceholderSection ───────────────────────────────────────────────

describe('PlaceholderSection', () => {
  async function importComponent() {
    const { PlaceholderSection } = await import(
      '../src/modules/zeglowanie/components/PlaceholderSection'
    );
    return PlaceholderSection;
  }

  it('renders emoji, title and description', async () => {
    const C = await importComponent();
    render(<C emoji="🚧" title="Coming Soon" description="Under construction" />);

    expect(screen.getByText('🚧')).toBeTruthy();
    expect(screen.getByText('Coming Soon')).toBeTruthy();
    expect(screen.getByText('Under construction')).toBeTruthy();
  });

  it('safely renders <br> tags without dangerouslySetInnerHTML', async () => {
    const C = await importComponent();
    const { container } = render(
      <C emoji="📝" title="Info" description="Line one<br>Line two<br/>Line three" />,
    );

    const br = container.querySelectorAll('br');
    expect(br.length).toBe(2);
    expect(container.textContent).toContain('Line one');
    expect(container.textContent).toContain('Line three');
  });
});

// ── BriefingSection (integration) ────────────────────────────────────

describe('BriefingSection', () => {
  async function importComponent() {
    const { BriefingSection } = await import(
      '../src/modules/zeglowanie/components/BriefingSection'
    );
    return BriefingSection;
  }

  it('renders briefing type selector and checklist items', async () => {
    const C = await importComponent();
    const { container } = render(<C />);

    // Should have type selector buttons
    const buttons = container.querySelectorAll('button.cruise-btn');
    expect(buttons.length).toBe(2);

    // Should render checklist items for the default type (zero)
    const items = screen.getAllByRole('checkbox');
    expect(items.length).toBeGreaterThan(0);
  });

  it('switches between briefing types', async () => {
    const C = await importComponent();
    const { container } = render(<C />);

    const zeroItems = screen.getAllByRole('checkbox').length;

    // Click the second type selector button (first-day)
    const buttons = container.querySelectorAll('button.cruise-btn');
    fireEvent.click(buttons[1]);

    const firstDayItems = screen.getAllByRole('checkbox').length;
    expect(firstDayItems).toBeGreaterThan(0);
    expect(firstDayItems).not.toBe(zeroItems);
  });

  it('persists briefing type selection to localStorage', async () => {
    const C = await importComponent();
    const { container } = render(<C />);

    const buttons = container.querySelectorAll('button.cruise-btn');
    fireEvent.click(buttons[1]);
    expect(localStorage.getItem('zeglowanie_selected_briefing_type')).toBe('first-day');
  });

  it('toggles checklist item and persists to localStorage', async () => {
    const C = await importComponent();
    render(<C />);

    const firstItem = screen.getAllByRole('checkbox')[0];
    expect(firstItem.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(firstItem);
    expect(firstItem.getAttribute('aria-checked')).toBe('true');

    // First zero briefing item is 'sailing-intro'
    expect(localStorage.getItem('briefing-zero-sailing-intro')).toBe('true');
  });

  it('resets checklist clears localStorage items', async () => {
    localStorage.setItem('briefing-zero-sailing-intro', 'true');
    localStorage.setItem('briefing-zero-wc-operation', 'true');
    globalThis.confirm = vi.fn(() => true);

    const C = await importComponent();
    render(<C />);

    const resetBtn = screen.getByText('Wyczyść checklistę');
    fireEvent.click(resetBtn);

    expect(localStorage.getItem('briefing-zero-sailing-intro')).toBeNull();
    expect(localStorage.getItem('briefing-zero-wc-operation')).toBeNull();
  });
});
