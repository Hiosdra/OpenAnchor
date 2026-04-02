import { useState, useRef, useEffect, useCallback } from 'react';
import LZString from 'lz-string';
import type { CrewMember, DaySchedule, DashboardData, CrewStat, Locale, AppState } from '../types';
import { t } from '../constants';
import { exportScheduleToPDF } from '../utils/pdf-export';
import { generateICSContent } from '../utils/ics-export';

export interface ExportShareReturn {
  copyStatus: string;
  toastType: string;
  showQRModal: boolean;
  setShowQRModal: (v: boolean) => void;
  qrError: string;
  qrCodeRef: React.RefObject<HTMLDivElement | null>;
  downloadICS: (person: CrewMember) => void;
  handlePrint: () => void;
  handleExportPDF: () => void;
  handleExportConfig: () => void;
  handleImportConfig: () => void;
  handleShare: (readOnly?: boolean) => void;
  handleShowQR: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function buildShareUrlLocal(state: AppState, readOnly = false): string {
  const jsonState = JSON.stringify(state);
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const prefix = readOnly ? 'share-readonly' : 'share';

  if (readOnly) {
    const encoded = btoa(encodeURIComponent(jsonState));
    return `${baseUrl}#${prefix}=${encoded}`;
  }

  try {
    const compressed = LZString.compressToEncodedURIComponent(jsonState);
    return `${baseUrl}#${prefix}=c:${compressed}`;
  } catch (e) {
    console.error('LZString compression failed:', e);
    return baseUrl;
  }
}

export function useExportShare(
  appState: AppState,
  dashboardData: DashboardData | null,
  crewStats: CrewStat[],
  userLocale: Locale,
  isReadOnly: boolean,
  setters: {
    setCrew: React.Dispatch<React.SetStateAction<CrewMember[]>>;
    setSlots: React.Dispatch<React.SetStateAction<import('../types').WatchSlot[]>>;
    setCaptainParticipates: (v: boolean) => void;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule[]>>;
    setIsGenerated: React.Dispatch<React.SetStateAction<boolean>>;
  },
): ExportShareReturn {
  const [copyStatus, setCopyStatus] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrError, setQrError] = useState('');
  const qrCodeRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastType(type);
    setCopyStatus(msg);
    setTimeout(() => {
      setCopyStatus('');
      setToastType('success');
    }, 3000);
  }, []);

  const downloadICS = useCallback(
    (person: CrewMember) => {
      if (!dashboardData) return;

      const ics = generateICSContent(dashboardData.allSlotsAbsolute, person);
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wachty_${person.name.replace(/\s+/g, '_')}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [dashboardData],
  );

  const handlePrint = useCallback(() => window.print(), []);

  const handleExportPDF = useCallback(() => {
    if (!appState.isGenerated || appState.schedule.length === 0) {
      alert('Najpierw wygeneruj grafik, aby wyeksportować do PDF.');
      return;
    }

    try {
      exportScheduleToPDF(
        appState.schedule,
        appState.startDate,
        crewStats,
        dashboardData,
        appState.captainParticipates,
        userLocale,
      );
      showToast('PDF wyeksportowany pomyślnie!');
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Błąd podczas eksportowania do PDF. Spróbuj ponownie.');
    }
  }, [appState, crewStats, dashboardData, userLocale, showToast]);

  const handleExportConfig = useCallback(() => {
    try {
      const config = {
        crew: appState.crew,
        slots: appState.slots,
        captainParticipates: appState.captainParticipates,
        version: '1.0',
        exportDate: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(config, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wachtownik-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Konfiguracja wyeksportowana!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Błąd podczas eksportowania konfiguracji.');
    }
  }, [appState, showToast]);

  const handleImportConfig = useCallback(() => {
    if (isReadOnly) {
      alert('Importowanie nie jest dostępne w trybie tylko do odczytu.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const config = JSON.parse(event.target?.result as string);

          if (!config || typeof config !== 'object') {
            throw new Error('Nieprawidłowy format pliku konfiguracji.');
          }

          const { crew, slots } = config;
          const MAX_ITEMS = 1000;

          const isValidArrayOfObjects = (value: unknown) =>
            Array.isArray(value) &&
            value.length <= MAX_ITEMS &&
            value.every(
              (item: unknown) =>
                item !== null && typeof item === 'object' && !Array.isArray(item),
            );

          if (!isValidArrayOfObjects(crew) || !isValidArrayOfObjects(slots)) {
            throw new Error('Nieprawidłowy format pliku konfiguracji.');
          }

          setters.setCrew(crew);
          setters.setSlots(slots);
          if (typeof config.captainParticipates === 'boolean') {
            setters.setCaptainParticipates(config.captainParticipates);
          }

          setters.setSchedule([]);
          setters.setIsGenerated(false);

          showToast('Konfiguracja zaimportowana!');
        } catch (error) {
          console.error('Import error:', error);
          alert('Błąd podczas importowania konfiguracji: ' + (error as Error).message);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }, [isReadOnly, setters, showToast]);

  const handleShare = useCallback(
    (readOnly = false) => {
      const url = buildShareUrlLocal(appState, readOnly);
      navigator.clipboard.writeText(url).then(() => {
        showToast(readOnly ? 'Link tylko do odczytu skopiowany!' : 'Skopiowano!');
      });
    },
    [appState, showToast],
  );

  const handleShowQR = useCallback(() => {
    setShowQRModal(true);
    setQrError('');
  }, []);

  // QR code generation
  useEffect(() => {
    if (
      showQRModal &&
      qrCodeRef.current &&
      (window as unknown as { QRCode?: unknown }).QRCode
    ) {
      qrCodeRef.current.innerHTML = '';
      setQrError('');

      try {
        const url = buildShareUrlLocal(appState);

        if (url.length > 2900) {
          setQrError(
            'Grafik jest zbyt złożony do zakodowania w QR. Użyj przycisku "Udostępnij" aby skopiować link.',
          );
          return;
        }

        const QRCodeLib = (window as unknown as { QRCode: new (el: HTMLElement, opts: unknown) => void }).QRCode;
        new QRCodeLib(qrCodeRef.current, {
          text: url,
          width: 256,
          height: 256,
          colorDark: appState.isNightMode ? '#000000' : '#0c4a6e',
          colorLight: appState.isNightMode ? '#dc2626' : '#ffffff',
          correctLevel: { M: 1 },
        });
      } catch (error) {
        console.error('QR generation error:', error);
        setQrError(
          'Nie udało się wygenerować kodu QR. Spróbuj użyć przycisku "Udostępnij" aby skopiować link.',
        );
      }
    }
  }, [showQRModal, appState]);

  return {
    copyStatus,
    toastType,
    showQRModal,
    setShowQRModal,
    qrError,
    qrCodeRef,
    downloadICS,
    handlePrint,
    handleExportPDF,
    handleExportConfig,
    handleImportConfig,
    handleShare,
    handleShowQR,
    showToast,
  };
}
