import { CloudSun, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export interface WeatherModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  windSpeed: number | null;
  windGust: number | null;
  windDir: number | null;
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDir: number | null;
  windForecast: number[];
  waveForecast: number[];
  gustForecast: number[];
  assessment: { level: string; text: string } | null;
  onFetch: () => void;
}

function ForecastChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const barWidth = 100 / Math.max(data.length, 1);

  return (
    <div>
      <svg viewBox="0 0 100 40" className="w-full h-24" preserveAspectRatio="none" role="img" aria-label={label}>
        {data.map((val, i) => {
          const h = (val / max) * 36;
          return (
            <rect
              key={i}
              x={i * barWidth + barWidth * 0.1}
              y={40 - h}
              width={barWidth * 0.8}
              height={h}
              fill={color}
              rx="0.5"
              className="weather-bar"
            />
          );
        })}
      </svg>
    </div>
  );
}

const ASSESS_COLORS: Record<string, string> = {
  danger: 'text-red-400 border-red-700',
  caution: 'text-yellow-400 border-yellow-700',
  moderate: 'text-orange-400 border-orange-700',
  good: 'text-green-400 border-green-700',
};

export function WeatherModal({
  open,
  onClose,
  loading,
  error,
  windSpeed,
  windGust,
  windDir,
  waveHeight,
  wavePeriod,
  waveDir,
  windForecast,
  waveForecast,
  gustForecast,
  assessment,
  onFetch,
}: WeatherModalProps) {
  const { t } = useI18n();

  return (
    <Modal open={open} onClose={onClose} className="flex flex-col max-h-[90vh] max-w-md border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
      <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
        <CloudSun className="text-cyan-400" />
        <span>{t.wxTitle}</span>
      </h3>

      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="animate-spin w-8 h-8 text-cyan-400" />
          <span className="text-slate-400 text-sm">{t.wxLoading}</span>
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm text-center py-4">{error}</div>
      )}

      {!loading && !error && (
        <div className="overflow-y-auto flex-grow space-y-3 pr-1">
          {/* Current conditions */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">{t.wxNow}</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{windSpeed ?? '--'}</div>
                <div className="text-[10px] text-slate-400">{t.wxWind}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">{windGust ?? '--'}</div>
                <div className="text-[10px] text-slate-400">{t.wxGusts}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-300">{windDir !== null ? `${windDir}°` : '--'}</div>
                <div className="text-[10px] text-slate-400">{t.wxDir}</div>
              </div>
            </div>
          </div>

          {/* Waves */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">{t.wxWaves}</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{waveHeight !== null ? waveHeight.toFixed(1) : '--'}</div>
                <div className="text-[10px] text-slate-400">{t.wxHeight}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-300">{wavePeriod ?? '--'}</div>
                <div className="text-[10px] text-slate-400">{t.wxPeriod}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-300">{waveDir !== null ? `${waveDir}°` : '--'}</div>
                <div className="text-[10px] text-slate-400">{t.wxDir}</div>
              </div>
            </div>
          </div>

          {/* Wind 12h chart */}
          {windForecast.length > 0 && (
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
              <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">{t.wxWind12h}</h4>
              <ForecastChart data={windForecast} color="#3b82f6" label={t.wxWind12h} />
              {gustForecast.length > 0 && (
                <ForecastChart data={gustForecast} color="#f97316" label={t.wxGusts} />
              )}
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span>{t.wxNow}</span>
                <span>+6h</span>
                <span>+12h</span>
              </div>
            </div>
          )}

          {/* Wave 12h chart */}
          {waveForecast.length > 0 && (
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">{t.wxWaves12h}</h4>
              <ForecastChart data={waveForecast} color="#06b6d4" label={t.wxWaves12h} />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span>{t.wxNow}</span>
                <span>+6h</span>
                <span>+12h</span>
              </div>
            </div>
          )}

          {/* Assessment */}
          {assessment && (
            <div className={`bg-slate-900 p-3 rounded-xl border ${ASSESS_COLORS[assessment.level] ?? 'border-slate-700'}`}>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">{t.wxAssess}</h4>
              <div className="text-sm text-slate-300">{assessment.text}</div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full bg-slate-700 hover:bg-slate-600 py-3 mt-3 rounded-xl font-bold border border-slate-600"
      >
        {t.btnClose}
      </button>
    </Modal>
  );
}
