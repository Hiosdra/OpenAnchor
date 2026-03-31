import { createIcons } from 'lucide';
import { I18N } from './i18n';

export const UI = {
  init() {
    createIcons();
    this._bindGlobalEvents();
  },

  _bindGlobalEvents() {
    document.querySelectorAll('.modal-close-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modal = (e.target as HTMLElement).closest('.modal');
        if (modal) {
          modal.classList.add('hidden');
          if (modal.id === 'qr-scan-modal' && (window as any).app?._stopQrScanner) {
            (window as any).app._stopQrScanner();
          }
        }
      });
    });
    document.querySelectorAll('[data-modal]').forEach((btn) => {
      btn.addEventListener('click', (e) =>
        this.showModal((e.currentTarget as HTMLElement).getAttribute('data-modal')!)
      );
    });
  },

  showModal(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      const focusable = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) setTimeout(() => focusable.focus(), 50);
    }
  },

  hideModal(id: string) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  },

  updateDashboard(
    dist: number | string,
    sog: number,
    cog: number | null,
    acc: number | string,
    unit: string,
    isAnchored: boolean
  ) {
    const lbl = unit === 'm' ? 'm' : 'ft';
    document.querySelectorAll('.unit-label').forEach((el) => (el.textContent = lbl));
    document.getElementById('unit-toggle')!.textContent = unit === 'm' ? I18N.t.unitMeters : I18N.t.unitFeet;
    document.getElementById('val-dist')!.innerHTML = isAnchored
      ? `${dist}<span class="text-xs text-slate-500">${lbl}</span>`
      : '--';
    document.getElementById('val-acc')!.innerHTML = `${acc}<span class="text-[10px] text-slate-500">${lbl}</span>`;
    document.getElementById('val-sog')!.textContent = sog.toFixed(1);
    document.getElementById('val-cog')!.textContent = cog !== null ? Math.round(cog) + '°' : '---';
  },

  updateRadiusControls(radius: number, unit: string) {
    const slider = document.getElementById('radius-slider') as HTMLInputElement;
    slider.max = unit === 'm' ? '500' : '1500';
    slider.value = String(radius);
    (document.getElementById('radius-number') as HTMLInputElement).value = String(radius);
  },

  setAnchorMode(isAnchored: boolean) {
    const btn = document.getElementById('main-btn')!;
    const text = document.getElementById('main-btn-text')!;
    if (isAnchored) {
      text.textContent = I18N.t.raiseAnchor;
      btn.classList.replace('bg-blue-600', 'bg-slate-700');
      btn.classList.replace('hover:bg-blue-500', 'hover:bg-slate-600');
    } else {
      text.textContent = I18N.t.dropAnchor;
      btn.classList.replace('bg-slate-700', 'bg-blue-600');
      btn.classList.replace('hover:bg-slate-600', 'hover:bg-blue-500');
    }
  },
};

export class OnboardingController {
  private overlay: HTMLElement;
  private steps: NodeListOf<Element>;
  private dots: HTMLCollection;
  private nextBtn: HTMLElement;
  private skipBtn: HTMLElement;
  private currentStep = 0;

  constructor() {
    this.overlay = document.getElementById('onboarding-overlay')!;
    this.steps = document.querySelectorAll('.onboarding-step');
    this.dots = document.getElementById('ob-dots')!.children;
    this.nextBtn = document.getElementById('ob-next-btn')!;
    this.skipBtn = document.getElementById('ob-skip-btn')!;

    if (localStorage.getItem('anchor_onboarding_done') !== 'true') this.show();
    this.nextBtn.addEventListener('click', () => this.next());
    this.skipBtn.addEventListener('click', () => this.finish());
  }

  show() {
    this.overlay.classList.remove('hidden');
    this.overlay.classList.add('flex');
    this.updateUI();
  }

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.updateUI();
    } else {
      this.finish();
    }
  }

  finish() {
    localStorage.setItem('anchor_onboarding_done', 'true');
    this.overlay.classList.add('hidden');
    this.overlay.classList.remove('flex');
  }

  updateUI() {
    this.steps.forEach((step, idx) => {
      if (idx === this.currentStep) {
        step.classList.remove('opacity-0', 'z-0', 'pointer-events-none');
        step.classList.add('opacity-100', 'z-10');
      } else {
        step.classList.add('opacity-0', 'z-0', 'pointer-events-none');
        step.classList.remove('opacity-100', 'z-10');
      }
    });
    Array.from(this.dots).forEach((dot, idx) => {
      if (idx === this.currentStep) dot.classList.replace('bg-slate-600', 'bg-blue-500');
      else dot.classList.replace('bg-blue-500', 'bg-slate-600');
    });
    if (this.currentStep === this.steps.length - 1) {
      this.nextBtn.textContent = I18N.t.obStart;
      this.nextBtn.classList.replace('bg-blue-600', 'bg-green-600');
      this.nextBtn.classList.replace('hover:bg-blue-500', 'hover:bg-green-500');
      this.skipBtn.classList.add('invisible');
    } else {
      this.nextBtn.textContent = I18N.t.obNext;
      this.nextBtn.classList.replace('bg-green-600', 'bg-blue-600');
      this.nextBtn.classList.replace('hover:bg-green-500', 'hover:bg-blue-500');
      this.skipBtn.classList.remove('invisible');
    }
  }
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): T & { cancel(): void } {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function throttled(this: any, ...args: any[]) {
    const now = Date.now();
    if (timer) clearTimeout(timer);
    if (now - last >= ms) {
      last = now;
      return fn.apply(this, args);
    }
    timer = setTimeout(() => {
      last = Date.now();
      fn.apply(this, args);
    }, ms - (now - last));
  }

  throttled.cancel = function () {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return throttled as T & { cancel(): void };
}
