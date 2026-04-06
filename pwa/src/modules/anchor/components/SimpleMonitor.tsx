import { Map, SunDim, Moon } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

export interface SimpleMonitorProps {
  visible: boolean;
  distance: number;
  sog: number;
  cog: number | null;
  accuracy: number;
  unit: string;
  alarmState: string;
  hasGpsFix: boolean;
  gpsSignalLost: boolean;
  nightRedFilter: boolean;
  onClose: () => void;
  onDismissAlarm: () => void;
  onToggleNightRed: () => void;
  onOpenMap: () => void;
}

const M_TO_FT = 3.28084;

const BG_CLASS: Record<string, string> = {
  SAFE: 'simple-monitor-bg-safe',
  CAUTION: 'simple-monitor-bg-caution',
  WARNING: 'simple-monitor-bg-warning',
  ALARM: 'simple-monitor-bg-alarm',
};

const TEXT_COLOR: Record<string, string> = {
  SAFE: 'text-green-500',
  CAUTION: 'text-yellow-500',
  WARNING: 'text-orange-500',
  ALARM: 'text-red-500',
};

export function SimpleMonitor({
  visible,
  distance,
  sog,
  cog,
  accuracy,
  unit,
  alarmState,
  hasGpsFix,
  gpsSignalLost,
  nightRedFilter,
  onClose,
  onDismissAlarm,
  onToggleNightRed,
  onOpenMap,
}: SimpleMonitorProps) {
  const { t } = useI18n();

  if (!visible) return null;

  const bg = BG_CLASS[alarmState] ?? BG_CLASS.SAFE;
  const color = TEXT_COLOR[alarmState] ?? TEXT_COLOR.SAFE;

  const distDisplay = unit === 'feet'
    ? (distance * M_TO_FT).toFixed(1)
    : distance.toFixed(1);

  const accDisplay = unit === 'feet'
    ? Math.round(accuracy * M_TO_FT)
    : Math.round(accuracy);

  const unitLabel = unit === 'feet' ? t.smUnitFt : t.smUnit;
  const unitShort = unit === 'feet' ? 'ft' : 'm';
  const isAlarm = alarmState === 'ALARM' || alarmState === 'WARNING';

  return (
    <div className={`fixed inset-0 z-[5500] flex flex-col ${bg}`}>
      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center select-none">
        <div className={`text-lg font-bold uppercase tracking-widest mb-2 ${color}`}>
          {t[`alarm${alarmState.charAt(0) + alarmState.slice(1).toLowerCase()}` as keyof typeof t] ?? alarmState}
        </div>

        {(!hasGpsFix || gpsSignalLost) && (
          <div className="text-red-500 text-sm font-bold mb-2">{t.smGpsLost}</div>
        )}

        <div className="mb-1">
          <span className={`text-[120px] leading-none font-bold tabular-nums ${color}`}>
            {distDisplay}
          </span>
        </div>
        <div className="text-xl text-slate-500 font-medium mb-6">{unitLabel}</div>

        <div className="flex gap-8 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 tabular-nums">{sog.toFixed(1)}</div>
            <div className="text-xs text-slate-500">SOG (kn)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 tabular-nums">
              {cog !== null ? `${Math.round(cog)}°` : '---'}
            </div>
            <div className="text-xs text-slate-500">COG</div>
          </div>
        </div>

        <div className="text-xs text-slate-600 mb-8">
          GPS: {accDisplay} {unitShort}
        </div>

        {isAlarm && (
          <button
            onClick={onDismissAlarm}
            className="w-full max-w-xs py-4 rounded-2xl text-lg font-bold bg-red-600 text-white mb-4"
          >
            {t.muteAlarm}
          </button>
        )}
      </div>

      <div className="p-4 bg-black/50 flex justify-between items-center">
        <button
          onClick={onOpenMap}
          className="text-slate-400 font-medium text-sm px-4 py-2 bg-slate-800 rounded-xl border border-slate-700"
        >
          <Map className="w-4 h-4 inline mr-1" /> {t.smMap}
        </button>
        <div className="text-slate-500 text-sm font-mono">
          {new Date().toLocaleTimeString()}
        </div>
        <button
          onClick={onToggleNightRed}
          className="text-slate-400 font-medium text-sm px-4 py-2 bg-slate-800 rounded-xl border border-slate-700"
        >
          {nightRedFilter ? (
            <><Moon className="w-4 h-4 inline mr-1" /> {t.smNormalFilter}</>
          ) : (
            <><SunDim className="w-4 h-4 inline mr-1" /> {t.smRedFilter}</>
          )}
        </button>
      </div>
    </div>
  );
}
