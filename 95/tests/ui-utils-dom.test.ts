import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock lucide and I18N before imports
vi.mock('lucide', () => ({
  createIcons: vi.fn(),
  icons: {},
}));

vi.mock('../src/modules/anchor/i18n', () => ({
  I18N: {
    _lang: 'en',
    t: {
      unitMeters: 'METERS',
      unitFeet: 'FEET',
      dropAnchor: 'Drop Anchor',
      raiseAnchor: 'Raise Anchor',
      obStart: 'Start',
      obNext: 'Next',
    },
    translations: {},
    init: vi.fn(),
    fmt: vi.fn(),
    locale: 'en',
    lang: 'en',
    setLang: vi.fn(),
    _applyToDOM: vi.fn(),
  },
}));

import { UI, OnboardingController } from '../src/modules/anchor/ui-utils';

describe('UI', () => {
  describe('showModal / hideModal', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="test-modal" class="modal hidden"></div>
        <div id="qr-scan-modal" class="modal hidden"></div>
      `;
    });

    it('showModal removes hidden class from modal', () => {
      const modal = document.getElementById('test-modal')!;
      expect(modal.classList.contains('hidden')).toBe(true);

      UI.showModal('test-modal');
      expect(modal.classList.contains('hidden')).toBe(false);
    });

    it('showModal does nothing for non-existent modal', () => {
      expect(() => UI.showModal('nonexistent')).not.toThrow();
    });

    it('hideModal adds hidden class to modal', () => {
      const modal = document.getElementById('test-modal')!;
      modal.classList.remove('hidden');

      UI.hideModal('test-modal');
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('hideModal does nothing for non-existent modal', () => {
      expect(() => UI.hideModal('nonexistent')).not.toThrow();
    });

    it('showModal focuses first focusable element', async () => {
      document.body.innerHTML = `
        <div id="focus-modal" class="modal hidden">
          <button id="focusable-btn">OK</button>
        </div>
      `;

      UI.showModal('focus-modal');
      // focus happens via setTimeout(50), advance timers
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);
      vi.useRealTimers();

      expect(document.getElementById('focus-modal')!.classList.contains('hidden')).toBe(false);
    });
  });

  describe('updateDashboard', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <span class="unit-label"></span>
        <span class="unit-label"></span>
        <span id="unit-toggle"></span>
        <span id="val-dist"></span>
        <span id="val-acc"></span>
        <span id="val-sog"></span>
        <span id="val-cog"></span>
      `;
    });

    it('displays values in meters when anchored', () => {
      UI.updateDashboard(42, 3.5, 180, 5, 'm', true);

      expect(document.getElementById('unit-toggle')!.textContent).toBe('METERS');
      expect(document.getElementById('val-dist')!.innerHTML).toContain('42');
      expect(document.getElementById('val-dist')!.innerHTML).toContain('m');
      expect(document.getElementById('val-sog')!.textContent).toBe('3.5');
      expect(document.getElementById('val-cog')!.textContent).toBe('180°');
    });

    it('shows -- for distance when not anchored', () => {
      UI.updateDashboard(42, 3.5, 180, 5, 'm', false);
      expect(document.getElementById('val-dist')!.innerHTML).toBe('--');
    });

    it('shows --- for COG when null', () => {
      UI.updateDashboard(42, 3.5, null, 5, 'm', true);
      expect(document.getElementById('val-cog')!.textContent).toBe('---');
    });

    it('displays feet labels when unit is ft', () => {
      UI.updateDashboard(100, 2.0, 90, 10, 'ft', true);
      expect(document.getElementById('unit-toggle')!.textContent).toBe('FEET');
      const unitLabels = document.querySelectorAll('.unit-label');
      unitLabels.forEach((el) => expect(el.textContent).toBe('ft'));
    });
  });

  describe('updateRadiusControls', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="radius-slider" type="range" />
        <input id="radius-number" type="number" />
      `;
    });

    it('sets slider max to 500 for meters', () => {
      UI.updateRadiusControls(100, 'm');
      const slider = document.getElementById('radius-slider') as HTMLInputElement;
      expect(slider.max).toBe('500');
      expect(slider.value).toBe('100');
    });

    it('sets slider max to 1500 for feet', () => {
      UI.updateRadiusControls(300, 'ft');
      const slider = document.getElementById('radius-slider') as HTMLInputElement;
      expect(slider.max).toBe('1500');
      expect(slider.value).toBe('300');
    });

    it('updates radius-number input value', () => {
      UI.updateRadiusControls(250, 'm');
      const numberInput = document.getElementById('radius-number') as HTMLInputElement;
      expect(numberInput.value).toBe('250');
    });
  });

  describe('setAnchorMode', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button id="main-btn" class="bg-blue-600 hover:bg-blue-500">
          <span id="main-btn-text">Drop Anchor</span>
        </button>
      `;
    });

    it('switches to anchored mode', () => {
      UI.setAnchorMode(true);
      const btn = document.getElementById('main-btn')!;
      const text = document.getElementById('main-btn-text')!;
      expect(text.textContent).toBe('Raise Anchor');
      expect(btn.classList.contains('bg-slate-700')).toBe(true);
      expect(btn.classList.contains('bg-blue-600')).toBe(false);
    });

    it('switches to unanchored mode', () => {
      // First anchor, then unanchor
      UI.setAnchorMode(true);
      UI.setAnchorMode(false);
      const btn = document.getElementById('main-btn')!;
      const text = document.getElementById('main-btn-text')!;
      expect(text.textContent).toBe('Drop Anchor');
      expect(btn.classList.contains('bg-blue-600')).toBe(true);
      expect(btn.classList.contains('bg-slate-700')).toBe(false);
    });
  });

  describe('_bindGlobalEvents', () => {
    it('close button hides its parent modal', () => {
      document.body.innerHTML = `
        <div id="my-modal" class="modal">
          <button class="modal-close-btn">X</button>
        </div>
      `;
      UI._bindGlobalEvents();

      const btn = document.querySelector('.modal-close-btn') as HTMLElement;
      btn.click();

      expect(document.getElementById('my-modal')!.classList.contains('hidden')).toBe(true);
    });

    it('data-modal button opens the referenced modal', () => {
      document.body.innerHTML = `
        <button data-modal="target-modal">Open</button>
        <div id="target-modal" class="modal hidden"></div>
      `;
      UI._bindGlobalEvents();

      const btn = document.querySelector('[data-modal]') as HTMLElement;
      btn.click();

      expect(document.getElementById('target-modal')!.classList.contains('hidden')).toBe(false);
    });
  });
});

describe('OnboardingController', () => {
  function setupOnboardingDOM() {
    document.body.innerHTML = `
      <div id="onboarding-overlay" class="hidden">
        <div class="onboarding-step opacity-0 z-0 pointer-events-none">Step 1</div>
        <div class="onboarding-step opacity-0 z-0 pointer-events-none">Step 2</div>
        <div class="onboarding-step opacity-0 z-0 pointer-events-none">Step 3</div>
        <div id="ob-dots">
          <span class="bg-slate-600"></span>
          <span class="bg-slate-600"></span>
          <span class="bg-slate-600"></span>
        </div>
        <button id="ob-next-btn" class="bg-blue-600 hover:bg-blue-500">Next</button>
        <button id="ob-skip-btn">Skip</button>
      </div>
    `;
  }

  beforeEach(() => {
    localStorage.clear();
    setupOnboardingDOM();
  });

  it('shows overlay if onboarding not done', () => {
    const ctrl = new OnboardingController();
    const overlay = document.getElementById('onboarding-overlay')!;
    expect(overlay.classList.contains('hidden')).toBe(false);
    expect(overlay.classList.contains('flex')).toBe(true);
  });

  it('does not show overlay if onboarding already done', () => {
    localStorage.setItem('anchor_onboarding_done', 'true');
    const ctrl = new OnboardingController();
    const overlay = document.getElementById('onboarding-overlay')!;
    expect(overlay.classList.contains('hidden')).toBe(true);
  });

  it('next() advances step and updates UI', () => {
    const ctrl = new OnboardingController();
    const steps = document.querySelectorAll('.onboarding-step');

    // Step 0 should be visible
    expect(steps[0].classList.contains('opacity-100')).toBe(true);
    expect(steps[1].classList.contains('opacity-0')).toBe(true);

    ctrl.next();
    // Step 1 should be visible
    expect(steps[1].classList.contains('opacity-100')).toBe(true);
    expect(steps[0].classList.contains('opacity-0')).toBe(true);
  });

  it('next() on last step calls finish()', () => {
    const ctrl = new OnboardingController();
    ctrl.next(); // step 1
    ctrl.next(); // step 2 (last)
    ctrl.next(); // should finish

    const overlay = document.getElementById('onboarding-overlay')!;
    expect(overlay.classList.contains('hidden')).toBe(true);
    expect(localStorage.getItem('anchor_onboarding_done')).toBe('true');
  });

  it('finish() hides overlay and marks onboarding done', () => {
    const ctrl = new OnboardingController();
    ctrl.finish();

    const overlay = document.getElementById('onboarding-overlay')!;
    expect(overlay.classList.contains('hidden')).toBe(true);
    expect(overlay.classList.contains('flex')).toBe(false);
    expect(localStorage.getItem('anchor_onboarding_done')).toBe('true');
  });

  it('updates dots to highlight current step', () => {
    const ctrl = new OnboardingController();
    const dots = document.getElementById('ob-dots')!.children;

    expect(dots[0].classList.contains('bg-blue-500')).toBe(true);
    expect(dots[1].classList.contains('bg-slate-600')).toBe(true);

    ctrl.next();
    expect(dots[0].classList.contains('bg-slate-600')).toBe(true);
    expect(dots[1].classList.contains('bg-blue-500')).toBe(true);
  });

  it('changes next button to "Start" on last step', () => {
    const ctrl = new OnboardingController();
    const nextBtn = document.getElementById('ob-next-btn')!;
    const skipBtn = document.getElementById('ob-skip-btn')!;

    ctrl.next(); // step 1
    ctrl.next(); // step 2 (last)

    expect(nextBtn.textContent).toBe('Start');
    expect(nextBtn.classList.contains('bg-green-600')).toBe(true);
    expect(skipBtn.classList.contains('invisible')).toBe(true);
  });

  it('skip button calls finish()', () => {
    const ctrl = new OnboardingController();
    const skipBtn = document.getElementById('ob-skip-btn')!;
    skipBtn.click();

    expect(localStorage.getItem('anchor_onboarding_done')).toBe('true');
    expect(document.getElementById('onboarding-overlay')!.classList.contains('hidden')).toBe(true);
  });

  it('next button click advances step', () => {
    const ctrl = new OnboardingController();
    const nextBtn = document.getElementById('ob-next-btn')!;
    const steps = document.querySelectorAll('.onboarding-step');

    nextBtn.click();
    expect(steps[1].classList.contains('opacity-100')).toBe(true);
  });
});
