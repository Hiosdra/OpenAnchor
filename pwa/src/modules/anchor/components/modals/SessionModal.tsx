import { History as HistoryIcon, BarChart3, Download, FileSpreadsheet, Trash2, PlayCircle, BookOpen } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';
import type { AnchorSession } from '../../session-db';
import { formatDuration } from '../../../../shared/utils/format';

export interface SessionModalProps {
  open: boolean;
  onClose: () => void;
  sessions: AnchorSession[];
  loading: boolean;
  onReplay: (sessionId: number) => void;
  onExportGPX: (sessionId: number) => void;
  onExportCSV: (sessionId: number) => void;
  onDelete: (sessionId: number) => void;
  replaySession: { session: AnchorSession; points: any[]; logEntries: any[] } | null;
  replayMapRef: React.RefObject<HTMLDivElement | null>;
}

export function SessionModal({
  open,
  onClose,
  sessions,
  loading,
  onReplay,
  onExportGPX,
  onExportCSV,
  onDelete,
  replaySession,
  replayMapRef,
}: SessionModalProps) {
  const { t } = useI18n();

  const renderSessionList = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <HistoryIcon className="text-blue-400" />
          <span>{t.histTitle}</span>
        </h3>
      </div>

      <div className="overflow-y-auto flex-grow space-y-2 pr-1 min-h-[100px]">
        {loading && (
          <div className="text-slate-500 text-sm text-center py-4">{t.histLoading}</div>
        )}
        {!loading && sessions.length === 0 && (
          <div className="text-slate-500 text-sm text-center py-4">{t.histEmpty}</div>
        )}
        {!loading &&
          sessions.map((s) => {
            const duration = s.endTime
              ? formatDuration(s.endTime - s.startTime, 's')
              : t.histActive;
            const date = new Date(s.startTime * 1000).toLocaleDateString();
            const time = new Date(s.startTime * 1000).toLocaleTimeString();

            return (
              <button
                key={s.id}
                onClick={() => s.id != null && onReplay(s.id)}
                className="w-full text-left bg-slate-900 p-3 rounded-xl border border-slate-700 hover:border-blue-500 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm font-medium">{date} {time}</span>
                  {s.alarmCount > 0 && (
                    <span className="text-red-400 text-xs font-bold">⚠ {s.alarmCount}</span>
                  )}
                </div>
                <div className="text-slate-400 text-xs mt-1">
                  {t.histTime} {duration}
                  {!s.endTime && (
                    <span className="ml-2 text-green-400 text-[10px] bg-green-900/50 px-1.5 py-0.5 rounded">
                      {t.histActive}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
      </div>
    </>
  );

  const renderReplay = () => {
    if (!replaySession) return null;
    const { session: s, logEntries } = replaySession;
    const duration = s.endTime
      ? formatDuration(s.endTime - s.startTime, 's')
      : t.histActive;
    const date = new Date(s.startTime * 1000).toLocaleString();

    return (
      <>
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <PlayCircle className="text-blue-400" />
          <span>{t.replayTitle}</span>
        </h3>

        <div className="text-slate-300 text-xs mb-3 space-y-1">
          <div>{t.replayDate} {date}</div>
          <div>{t.replayDuration} {duration}</div>
          <div>{t.replayRadius} {s.radius}m</div>
          <div>{t.replayMaxDev} {s.maxDistance.toFixed(1)}m</div>
          <div>{t.replayAlarms} {s.alarmCount}</div>
          <div>{t.replayPoints} {replaySession.points.length}</div>
        </div>

        <div
          ref={replayMapRef}
          className="w-full h-48 rounded-lg mb-3 bg-slate-900 border border-slate-700"
        />

        {logEntries.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> {t.logTitle}
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {logEntries.map((entry: any, i: number) => (
                <div key={i} className="bg-slate-900 p-2 rounded-lg border border-slate-700 text-xs text-slate-300">
                  {entry.summary || entry.logEntry || JSON.stringify(entry)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => s.id != null && onExportGPX(s.id)}
            className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> {t.replayExport}
          </button>
          <button
            onClick={() => s.id != null && onExportCSV(s.id)}
            className="flex-1 bg-slate-600 hover:bg-slate-500 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => s.id != null && onDelete(s.id)}
            className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-300 py-3 rounded-xl font-bold border border-red-800 text-sm flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> {t.replayDelete}
          </button>
        </div>
      </>
    );
  };

  return (
    <Modal open={open} onClose={onClose} className="flex flex-col max-h-[90vh]">
      {replaySession ? renderReplay() : renderSessionList()}

      <button
        onClick={onClose}
        className="w-full bg-slate-700 hover:bg-slate-600 py-3 mt-4 rounded-xl font-bold border border-slate-600"
      >
        {t.btnClose}
      </button>
    </Modal>
  );
}
