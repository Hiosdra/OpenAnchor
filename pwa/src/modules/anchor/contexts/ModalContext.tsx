/**
 * Modal visibility context — manages open/close state for all modals.
 *
 * Split into two contexts so that components that only need actions
 * (openModal / closeModal) don't re-render on every modal toggle.
 */

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

// ─── Modal names ───────────────────────────────────────────────────
export type ModalName =
  | 'calc'
  | 'offset'
  | 'sector'
  | 'watch'
  | 'weather'
  | 'sync'
  | 'ai'
  | 'session'
  | 'apiKey'
  | 'stats'
  | 'qr'
  | 'simpleMonitor'
  | 'onboarding'
  | 'dragWarning'
  | 'gpsLost'
  | 'batteryLow'
  | 'watchAlert'
  | 'connLost';

export type ModalState = Record<ModalName, boolean>;

export interface ModalActions {
  openModal: (name: ModalName) => void;
  closeModal: (name: ModalName) => void;
  toggleModal: (name: ModalName) => void;
}

// ─── Contexts ──────────────────────────────────────────────────────
const ModalActionsContext = createContext<ModalActions | null>(null);
const ModalStateContext = createContext<ModalState | null>(null);

const INITIAL_STATE: ModalState = {
  calc: false,
  offset: false,
  sector: false,
  watch: false,
  weather: false,
  sync: false,
  ai: false,
  session: false,
  apiKey: false,
  stats: false,
  qr: false,
  simpleMonitor: false,
  onboarding: false,
  dragWarning: false,
  gpsLost: false,
  batteryLow: false,
  watchAlert: false,
  connLost: false,
};

// ─── Provider ──────────────────────────────────────────────────────
export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<ModalState>(INITIAL_STATE);

  // Actions are stable — they use functional state updates so no deps
  const actions = useMemo<ModalActions>(
    () => ({
      openModal: (name) => setModals((prev) => ({ ...prev, [name]: true })),
      closeModal: (name) => setModals((prev) => ({ ...prev, [name]: false })),
      toggleModal: (name) => setModals((prev) => ({ ...prev, [name]: !prev[name] })),
    }),
    [],
  );

  return (
    <ModalActionsContext.Provider value={actions}>
      <ModalStateContext.Provider value={modals}>{children}</ModalStateContext.Provider>
    </ModalActionsContext.Provider>
  );
}

// ─── Hooks ─────────────────────────────────────────────────────────

/** Stable actions only — will NOT re-render on modal state changes */
export function useModalActions(): ModalActions {
  const ctx = useContext(ModalActionsContext);
  if (!ctx) throw new Error('useModalActions must be used within ModalProvider');
  return ctx;
}

/** Full modal visibility state — will re-render on every change */
export function useModalState(): ModalState {
  const ctx = useContext(ModalStateContext);
  if (!ctx) throw new Error('useModalState must be used within ModalProvider');
  return ctx;
}
