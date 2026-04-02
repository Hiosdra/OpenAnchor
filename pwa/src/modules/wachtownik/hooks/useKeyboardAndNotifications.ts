import { useEffect, useCallback, useRef } from 'react';
import type { DashboardData } from '../types';

export interface NotificationsReturn {
  notifiedSlots: React.MutableRefObject<Set<string>>;
}

export function useNotifications(
  notificationsEnabled: boolean,
  dashboardData: DashboardData | null,
  currentTime: Date,
): NotificationsReturn {
  const notifiedSlots = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notificationsEnabled || !dashboardData?.nextSlot) return;
    const msToNext = dashboardData.nextSlot.absoluteStart.getTime() - currentTime.getTime();

    if (
      msToNext > 0 &&
      msToNext <= 15 * 60000 &&
      !notifiedSlots.current.has(dashboardData.nextSlot.id)
    ) {
      if (Notification.permission === 'granted') {
        new Notification('Morski Grafik: Zmiana wachty!', {
          body: `Przygotuj się na wachtę za 15 minut (${dashboardData.nextSlot.start} - ${dashboardData.nextSlot.end}).`,
          icon: '/favicon.ico',
        });
        notifiedSlots.current.add(dashboardData.nextSlot.id);
      }
    }
  }, [currentTime, dashboardData, notificationsEnabled]);

  return { notifiedSlots };
}

export interface KeyboardShortcutsParams {
  activeTab: string;
  canUndo: boolean;
  canRedo: boolean;
  isReadOnly: boolean;
  showQRModal: boolean;
  undo: () => void;
  redo: () => void;
  generateSchedule: () => void;
  handlePrint: () => void;
  setShowQRModal: (v: boolean) => void;
}

export function useKeyboardShortcuts(params: KeyboardShortcutsParams): void {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const p = paramsRef.current;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (!p.isReadOnly && p.canUndo) p.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (!p.isReadOnly && p.canRedo) p.redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (p.activeTab === 'setup') p.generateSchedule();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        p.handlePrint();
      }
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (p.showQRModal) p.setShowQRModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);
}
