import { ShieldCheck, AlertTriangle, Siren, BellOff } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

export interface AlarmBarProps {
  alarmState: string;
  distance: number;
  unit: string;
  isAnchored: boolean;
  onDismissAlarm: () => void;
}

const M_TO_FT = 3.28084;

const ALARM_CONFIG: Record<string, {
  barClass: string;
  i18nKey: string;
  Icon: typeof ShieldCheck;
}> = {
  SAFE: { barClass: 'alarm-bar-safe', i18nKey: 'alarmSafe', Icon: ShieldCheck },
  CAUTION: { barClass: 'alarm-bar-caution', i18nKey: 'alarmCaution', Icon: AlertTriangle },
  WARNING: { barClass: 'alarm-bar-warning', i18nKey: 'alarmWarning', Icon: AlertTriangle },
  ALARM: { barClass: 'alarm-bar-alarm', i18nKey: 'alarmAlarm', Icon: Siren },
};

export function AlarmBar({ alarmState, distance, unit, isAnchored, onDismissAlarm }: AlarmBarProps) {
  const { t } = useI18n();

  if (!isAnchored) return null;

  const config = ALARM_CONFIG[alarmState] ?? ALARM_CONFIG.SAFE;
  const { barClass, i18nKey, Icon } = config;

  const distDisplay = unit === 'feet'
    ? (distance * M_TO_FT).toFixed(1)
    : distance.toFixed(1);
  const unitLabel = unit === 'feet' ? 'ft' : 'm';

  return (
    <div
      id="alarm-state-bar"
      className={`w-full py-1 text-center text-xs font-bold uppercase tracking-widest z-20 transition-all flex items-center justify-center gap-2 ${barClass}`}
      role="alert"
      aria-live="assertive"
    >
      <Icon className="w-4 h-4" />
      <span>
        {t[i18nKey]} — {distDisplay}{unitLabel}
      </span>
      {alarmState === 'ALARM' && (
        <button
          id="stop-alarm-btn"
          onClick={onDismissAlarm}
          className="ml-2 bg-black/30 px-2 py-0.5 rounded text-[10px]"
          aria-label={t.muteAlarm}
        >
          <BellOff className="w-3 h-3 inline mr-0.5" />
          {t.muteAlarm}
        </button>
      )}
    </div>
  );
}
