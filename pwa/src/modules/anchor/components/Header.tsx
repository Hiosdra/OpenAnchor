import { Moon, Smartphone, Satellite } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

export interface HeaderProps {
  isOnline: boolean;
  nightMode: boolean;
  onToggleNightMode: () => void;
  unit: string;
  onToggleUnit: () => void;
  onToggleLang: () => void;
  wsConnected: boolean;
  peerBattery: number | null;
  peerCharging: boolean;
  hasGpsFix: boolean;
  gpsSignalLost: boolean;
  batterySaverActive: boolean;
}

export function Header({
  isOnline,
  nightMode,
  onToggleNightMode,
  unit,
  onToggleUnit,
  onToggleLang,
  wsConnected,
  peerBattery,
  peerCharging,
  hasGpsFix,
  gpsSignalLost,
  batterySaverActive,
}: HeaderProps) {
  const { t, fmt, lang } = useI18n();

  const unitLabel = unit === 'meters' ? t.unitMeters : t.unitFeet;
  const langLabel = lang === 'pl' ? 'EN' : 'PL';

  const gpsColor = hasGpsFix && !gpsSignalLost
    ? 'text-green-500'
    : gpsSignalLost
      ? 'text-red-500'
      : 'text-yellow-500';

  const gpsText = hasGpsFix && !gpsSignalLost
    ? t.gpsOk
    : gpsSignalLost
      ? t.gpsLost
      : t.gpsSearching;

  return (
    <header className="oa-header">
      <a href="../../index.html" title="OpenAnchor Superapp" className="oa-back-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>Menu</span>
      </a>

      <h1 className="oa-header-title">{t.appTitle}</h1>

      <div className="flex items-center gap-2 sm:gap-3">
        <span
          className={`connection-status${isOnline ? '' : ' connection-status--offline'}`}
          role="status"
          aria-live="polite"
        >
          <span className="connection-status__dot" />
          <span>{isOnline ? t.connOnline : `⚠ ${t.connOffline}`}</span>
        </span>

        <button
          id="night-mode-btn"
          className="oa-settings-btn"
          title={t.nightMode}
          aria-label={t.nightMode}
          aria-pressed={nightMode}
          onClick={onToggleNightMode}
        >
          <Moon className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>

        <button
          id="unit-toggle"
          className="bg-slate-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-bold text-slate-300 border border-slate-600"
          onClick={onToggleUnit}
        >
          {unitLabel}
        </button>

        <button
          id="lang-toggle"
          className="bg-slate-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold text-slate-300 border border-slate-600"
          title="Language / Język"
          onClick={onToggleLang}
        >
          {langLabel}
        </button>

        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-slate-700">
          <span title={t.wsStatus}>
            <Smartphone
              className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${wsConnected ? 'text-green-500' : 'text-slate-600'}`}
              aria-label={t.wsStatus}
            />
          </span>

          {peerBattery !== null && (
            <span
              className="text-[10px] text-slate-400"
              title={fmt(t.peerBatteryTooltip, { level: peerBattery })}
            >
              {peerBattery}%{peerCharging ? ' ⚡' : ''}
            </span>
          )}

          <div className={`flex items-center gap-0.5 sm:gap-1 text-xs ${gpsColor} ml-0.5 sm:ml-1`}>
            <Satellite className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span id="gps-status-text">{gpsText}</span>
          </div>

          {batterySaverActive && (
            <span className="text-[9px] bg-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded-full ml-1">
              🔋 Eco
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
