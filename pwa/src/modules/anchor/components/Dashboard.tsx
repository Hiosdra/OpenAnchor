import { useI18n } from '../hooks/useI18n';

export interface DashboardProps {
  distance: number;
  sog: number;
  cog: number | null;
  accuracy: number;
  unit: string;
  isAnchored: boolean;
}

const M_TO_FT = 3.28084;

export function Dashboard({ distance, sog, cog, accuracy, unit, isAnchored }: DashboardProps) {
  const { t } = useI18n();

  const hasData = accuracy > 0;

  const distDisplay = !hasData
    ? '--'
    : unit === 'feet'
      ? (distance * M_TO_FT).toFixed(1)
      : distance.toFixed(1);

  const accDisplay = !hasData
    ? '--'
    : unit === 'feet'
      ? String(Math.round(accuracy * M_TO_FT))
      : String(Math.round(accuracy));

  const unitLabel = unit === 'feet' ? 'ft' : 'm';

  return (
    <div
      className="grid grid-cols-4 bg-slate-800 border-b border-slate-700 divide-x divide-slate-700 text-center z-20 shadow-lg"
      role="region"
      aria-label="Navigation metrics"
      aria-live="polite"
    >
      <div className="p-1.5 sm:p-2">
        <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase">{t.dashDistance}</div>
        <div id="val-dist" className="font-mono font-bold text-lg sm:text-xl text-white">
          {distDisplay}
          {hasData && <span className="text-xs text-slate-400 ml-0.5">{unitLabel}</span>}
        </div>
      </div>

      <div className="p-1.5 sm:p-2">
        <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase">
          SOG <span className="text-[7px] sm:text-[8px]">({t.dashSog})</span>
        </div>
        <div id="val-sog" className="font-mono font-bold text-lg sm:text-xl text-blue-400">
          {sog.toFixed(1)}
        </div>
      </div>

      <div className="p-1.5 sm:p-2">
        <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase">
          COG <span className="text-[7px] sm:text-[8px]">({t.dashCogUnit})</span>
        </div>
        <div id="val-cog" className="font-mono font-bold text-lg sm:text-xl text-blue-400">
          {cog !== null ? `${Math.round(cog)}°` : '---'}
        </div>
      </div>

      <div className="p-1.5 sm:p-2">
        <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase">{t.dashGpsAcc}</div>
        <div id="val-acc" className="font-mono font-bold text-lg sm:text-xl text-slate-300">
          {accDisplay}
          {hasData && <span className="text-xs text-slate-400 ml-0.5">{unitLabel}</span>}
        </div>
      </div>
    </div>
  );
}
