import {
  Anchor, MoveDownLeft, BellOff, Calculator, Radar, Clock,
  CloudSun, Monitor, History, Bot, Share2, QrCode,
  Layers, Crosshair,
} from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

export interface ControlsProps {
  isAnchored: boolean;
  radius: number;
  unit: string;
  sectorEnabled: boolean;
  alarmState: string;
  hasGpsFix: boolean;
  onToggleAnchor: () => void;
  onRadiusChange: (radius: number) => void;
  onOpenTool: (tool: string) => void;
  onOffset: () => void;
  onMuteAlarm: () => void;
  onCenterMap: () => void;
  onToggleMapLayer: () => void;
  mapAutoCenter: boolean;
}

const M_TO_FT = 3.28084;

const TOOL_IDS: Record<string, string> = {
  calc: 'tool-calc',
  sector: 'tool-sector',
  watch: 'tool-watch',
  sync: 'tool-sync',
  monitor: 'simple-monitor-btn',
  history: 'open-history-btn',
  ai: 'open-ai-btn',
  share: 'share-pos-btn',
  qr: 'open-qr-scan-btn',
  weather: 'open-weather-btn',
};

const TOOL_DATA_MODAL: Record<string, string> = {
  calc: 'calc-modal',
  sector: 'sector-modal',
  watch: 'watch-setup-modal',
  sync: 'ws-sync-modal',
};

const TOOLS = [
  { id: 'calc', Icon: Calculator, i18nKey: 'toolChain', colSpan: '' },
  { id: 'sector', Icon: Radar, i18nKey: 'toolSector', colSpan: '' },
  { id: 'watch', Icon: Clock, i18nKey: 'toolWatch', colSpan: '' },
  { id: 'weather', Icon: CloudSun, i18nKey: 'toolWeather', colSpan: '' },
  { id: 'monitor', Icon: Monitor, i18nKey: 'toolMonitor', colSpan: '' },
  { id: 'sync', Icon: undefined, i18nKey: '', colSpan: '', label: 'Android' },
  { id: 'history', Icon: History, i18nKey: 'toolHistory', colSpan: '' },
  { id: 'ai', Icon: Bot, i18nKey: 'toolAssistant', colSpan: '', special: true },
  { id: 'share', Icon: Share2, i18nKey: 'toolShare', colSpan: 'col-span-2' },
  { id: 'qr', Icon: QrCode, i18nKey: 'toolQr', colSpan: 'col-span-2' },
] as const;

export function Controls({
  isAnchored,
  radius,
  unit,
  sectorEnabled,
  alarmState,
  hasGpsFix,
  onToggleAnchor,
  onRadiusChange,
  onOpenTool,
  onOffset,
  onMuteAlarm,
  onCenterMap,
  onToggleMapLayer,
  mapAutoCenter,
}: ControlsProps) {
  const { t } = useI18n();

  const unitLabel = unit === 'feet' ? 'ft' : 'm';
  const displayRadius = unit === 'feet' ? Math.round(radius * M_TO_FT) : radius;
  const sliderMax = 500;
  const numberMax = unit === 'feet' ? Math.round(500 * M_TO_FT) : 1000;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onRadiusChange(Number(e.target.value));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const inMeters = unit === 'feet' ? Math.round(val / M_TO_FT) : val;
    onRadiusChange(Math.max(10, Math.min(500, inMeters)));
  };

  const showMute = isAnchored && (alarmState === 'WARNING' || alarmState === 'ALARM');

  return (
    <div className="w-full bg-slate-800 p-3 sm:p-4 rounded-t-3xl shadow-[0_-10px_15px_rgba(0,0,0,0.3)] border-t border-slate-700 z-20 relative">
      {/* Radius controls */}
      <div className="mb-3 sm:mb-4 max-w-md mx-auto">
        <div className="flex justify-between items-end mb-2">
          <label className="text-xs sm:text-sm text-slate-400 font-medium">
            {t.safeRadius}
            {sectorEnabled && (
              <span id="sector-badge" className="ml-1 sm:ml-2 text-[9px] sm:text-[10px] bg-blue-900 text-blue-300 px-1.5 sm:px-2 py-0.5 rounded-full">
                {t.sectorBadge}
              </span>
            )}
          </label>
          <div className="flex items-baseline gap-1">
            <input
              type="number"
              id="radius-number"
              value={displayRadius}
              min={unit === 'feet' ? Math.round(10 * M_TO_FT) : 10}
              max={numberMax}
              onChange={handleNumberChange}
              className="bg-slate-700 text-white font-mono text-lg sm:text-xl w-16 sm:w-20 text-right rounded p-1 outline-none focus:ring-2 ring-blue-500"
              aria-label={t.safeRadius}
            />
            <span className="text-slate-400 text-sm">{unitLabel}</span>
          </div>
        </div>
        <input
          type="range"
          id="radius-slider"
          min={10}
          max={sliderMax}
          step={5}
          value={radius}
          onChange={handleSliderChange}
          aria-label={t.safeRadius}
        />
      </div>

      {/* Main button + offset */}
      <div className="flex gap-2 max-w-md mx-auto">
        <button
          id="main-btn"
          onClick={onToggleAnchor}
          disabled={!hasGpsFix && !isAnchored}
          className={`flex-grow py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 ${
            isAnchored
              ? 'bg-slate-600 hover:bg-slate-500 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          } disabled:opacity-50`}
        >
          <Anchor className="w-4 sm:w-5 h-4 sm:h-5" />
          <span id="main-btn-text">{isAnchored ? t.raiseAnchor : t.dropAnchor}</span>
        </button>
        <button
          id="offset-btn"
          onClick={onOffset}
          disabled={!hasGpsFix}
          className="w-12 sm:w-14 py-2.5 sm:py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center bg-slate-700 border border-slate-600 text-slate-300 disabled:opacity-50"
          title={t.offsetBack}
          aria-label={t.offsetBack}
        >
          <MoveDownLeft className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 max-w-md mx-auto mt-2 sm:mt-3">
        {TOOLS.map((tool) => {
          const isAi = tool.id === 'ai';
          const isSync = tool.id === 'sync';
          const Icon = isSync
            ? ({ className }: { className?: string }) => (
                <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />
                </svg>
              )
            : tool.Icon;
          const label = isSync ? tool.label : t[tool.i18nKey];

          return (
            <button
              key={tool.id}
              id={TOOL_IDS[tool.id]}
              data-modal={TOOL_DATA_MODAL[tool.id]}
              onClick={() => onOpenTool(tool.id)}
              className={`py-1.5 sm:py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 sm:gap-1 border transition-colors ${tool.colSpan} ${
                isAi
                  ? 'bg-purple-700 hover:bg-purple-600 text-white border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600'
              }`}
            >
              {Icon && <Icon className={`w-3.5 sm:w-4 h-3.5 sm:h-4${isAi ? ' text-purple-300' : ''}`} />}
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Map layer / center buttons (floating within controls context) */}
      <div className="flex gap-2 max-w-md mx-auto mt-2">
        <button
          onClick={onToggleMapLayer}
          className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 text-xs flex items-center justify-center gap-1"
          aria-label="Toggle map layer"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        {!mapAutoCenter && (
          <button
            onClick={onCenterMap}
            className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-blue-400 border border-slate-600 text-xs flex items-center justify-center gap-1"
            aria-label="Center map on anchor position"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Mute alarm */}
      {showMute && (
        <button
          onClick={onMuteAlarm}
          className="w-full max-w-md mx-auto py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white mt-2 sm:mt-3 border border-slate-600"
        >
          <BellOff className="w-4 sm:w-5 h-4 sm:h-5" />
          <span>{t.muteAlarm}</span>
        </button>
      )}
    </div>
  );
}
