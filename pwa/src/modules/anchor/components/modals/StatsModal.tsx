import { BarChart3 } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';
import { formatDuration } from '../../../../shared/utils/format';

export interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  stats: {
    totalSessions: number;
    totalAlarms: number;
    totalTime: number;
    avgTime: number;
    maxDistance: number;
    maxSog: number;
  } | null;
}

export function StatsModal({ open, onClose, stats }: StatsModalProps) {
  const { t } = useI18n();

  const items = stats
    ? [
        { label: t.statsSessions, value: String(stats.totalSessions) },
        { label: t.statsAlarms, value: String(stats.totalAlarms) },
        { label: t.statsTotalTime, value: formatDuration(stats.totalTime) },
        { label: t.statsAvgTime, value: formatDuration(stats.avgTime) },
        { label: t.statsMaxDist, value: `${stats.maxDistance.toFixed(1)}m` },
        { label: t.statsMaxSog, value: `${stats.maxSog.toFixed(1)} kn` },
      ]
    : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
    >
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <BarChart3 className="text-cyan-400" />
        <span>{t.statsTitle}</span>
      </h3>

      <div className="space-y-2 text-sm">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-700"
          >
            <span className="text-slate-400">{item.label}</span>
            <span className="text-white font-mono">{item.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full bg-slate-700 hover:bg-slate-600 py-3 mt-4 rounded-xl font-bold border border-slate-600"
      >
        {t.btnClose}
      </button>
    </Modal>
  );
}
