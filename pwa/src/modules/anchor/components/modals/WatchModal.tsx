import { useState } from 'react';
import { ClipboardList, Timer, CalendarClock, Plus, X } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export interface ScheduleItem {
  name: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
}

export interface WatchModalProps {
  open: boolean;
  onClose: () => void;
  watchActive: boolean;
  watchMinutes: number;
  schedule: ScheduleItem[];
  onStartWatch: (minutes: number) => void;
  onCancelWatch: () => void;
  onAddScheduleItem: (item: ScheduleItem) => void;
  onRemoveScheduleItem: (index: number) => void;
  onWatchMinutesChange: (minutes: number) => void;
}

export function WatchModal({
  open,
  onClose,
  watchActive,
  watchMinutes,
  schedule,
  onStartWatch,
  onCancelWatch,
  onAddScheduleItem,
  onRemoveScheduleItem,
  onWatchMinutesChange,
}: WatchModalProps) {
  const { t } = useI18n();
  const [schedName, setSchedName] = useState('');
  const [schedStart, setSchedStart] = useState('');
  const [schedEnd, setSchedEnd] = useState('');

  const handleAddSchedule = () => {
    if (!schedStart || !schedEnd) return;
    const [sh, sm] = schedStart.split(':').map(Number);
    const [eh, em] = schedEnd.split(':').map(Number);
    onAddScheduleItem({ name: schedName || '?', startHour: sh, startMin: sm, endHour: eh, endMin: em });
    setSchedName('');
    setSchedStart('');
    setSchedEnd('');
  };

  return (
    <Modal open={open} onClose={onClose} className="flex flex-col max-h-[90vh]">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <ClipboardList className="text-blue-400" />
        <span>{t.watchTitle}</span>
      </h3>

      <div className="overflow-y-auto flex-grow space-y-4 pr-1">
        {/* Timer section */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
            <Timer className="w-4 h-4 text-blue-400" />
            <span>{t.watchTimer}</span>
          </h4>
          <div className="flex gap-2">
            <input
              type="number"
              value={watchMinutes}
              min={1}
              max={120}
              onChange={(e) => onWatchMinutesChange(Number(e.target.value))}
              className="w-16 bg-slate-700 text-white p-2 rounded-lg border border-slate-600 outline-none text-center font-mono"
              aria-label={t.watchTimer}
            />
            <button
              onClick={() => onStartWatch(watchMinutes)}
              disabled={watchActive}
              className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50"
            >
              Start
            </button>
            <button
              onClick={onCancelWatch}
              disabled={!watchActive}
              className="bg-slate-700 hover:bg-slate-600 py-2 px-3 rounded-lg font-bold border border-slate-600 text-sm disabled:opacity-50"
            >
              Stop
            </button>
          </div>
        </div>

        {/* Schedule section */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-purple-400" />
            <span>{t.watchSchedule}</span>
          </h4>
          <div className="flex gap-1 mb-2">
            <input
              type="time"
              value={schedStart}
              onChange={(e) => setSchedStart(e.target.value)}
              className="w-[30%] bg-slate-700 text-white p-1.5 rounded border border-slate-600 text-xs outline-none"
            />
            <input
              type="time"
              value={schedEnd}
              onChange={(e) => setSchedEnd(e.target.value)}
              className="w-[30%] bg-slate-700 text-white p-1.5 rounded border border-slate-600 text-xs outline-none"
            />
            <input
              type="text"
              value={schedName}
              onChange={(e) => setSchedName(e.target.value)}
              placeholder={t.watchName}
              className="w-[40%] bg-slate-700 text-white p-1.5 rounded border border-slate-600 text-xs outline-none"
            />
          </div>
          <button
            onClick={handleAddSchedule}
            className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-bold border border-slate-600 text-xs mb-3 text-slate-200"
          >
            <Plus className="w-3.5 h-3.5 inline" /> {t.watchAdd}
          </button>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {schedule.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700 text-xs"
              >
                <span className="text-white font-medium">{item.name}</span>
                <span className="text-slate-400">
                  {String(item.startHour).padStart(2, '0')}:{String(item.startMin).padStart(2, '0')} –{' '}
                  {String(item.endHour).padStart(2, '0')}:{String(item.endMin).padStart(2, '0')}
                </span>
                <button
                  onClick={() => onRemoveScheduleItem(i)}
                  className="text-red-400 hover:text-red-300 ml-2"
                  aria-label="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
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
