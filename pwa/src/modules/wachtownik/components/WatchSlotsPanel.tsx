import React from 'react';
import { Icon } from './Icon';
import { WATCH_TEMPLATES, t } from '../constants';
import type { WatchSlot, Recommendation, CoverageResult, Locale } from '../types';

interface WatchSlotsPanelProps {
  isNightMode: boolean;
  userLocale: Locale;
  slots: WatchSlot[];
  recommendations: Recommendation[];
  addSlot: () => void;
  removeSlot: (id: string) => void;
  updateSlot: (id: string, field: string, value: any) => void;
  applyDogWatches: () => void;
  applyTemplate: (key: string) => void;
  getCoverage: () => CoverageResult;
}

export function WatchSlotsPanel({
  isNightMode, userLocale, slots, recommendations,
  addSlot, removeSlot, updateSlot,
  applyDogWatches, applyTemplate, getCoverage,
}: WatchSlotsPanelProps) {
  return (
    <div className={`lg:col-span-8 p-4 sm:p-5 rounded-xl shadow-sm border ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2">
        <div className={`flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
          <Icon name="Clock" className="w-5 h-5" /> <h2 className="text-base sm:text-lg font-semibold">{t('heading.watchSystem', userLocale)}</h2>
        </div>
        <button onClick={applyDogWatches} className={`px-3 py-1.5 rounded-md text-xs font-medium transition border ${isNightMode ? 'bg-red-950 border-red-800 text-red-500 hover:bg-red-900' : 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200'}`}>
          {t('btn.dogWatches', userLocale)}
        </button>
      </div>

      {recommendations.length > 0 && (
        <div className={`mb-6 p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-emerald-50 border-emerald-200'}`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isNightMode ? 'text-red-400' : 'text-emerald-800'}`}>
            <Icon name="CheckCircle" className="w-4 h-4" />
            <span>{t('heading.recommendedSystems', userLocale)}</span>
          </h3>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <button
                key={rec.templateKey}
                onClick={() => applyTemplate(rec.templateKey)}
                className={`w-full text-left p-3 rounded-md border transition-all ${
                  idx === 0
                    ? (isNightMode ? 'bg-red-950 border-red-700' : 'bg-white border-emerald-300 shadow-sm')
                    : (isNightMode ? 'bg-zinc-900 border-red-800 hover:bg-zinc-800' : 'bg-white border-emerald-100 hover:border-emerald-200')
                }`}
              >
                <div className="flex items-start justify-between pointer-events-none">
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${isNightMode ? 'text-red-400' : 'text-emerald-700'}`}>
                      {idx === 0 && '⭐ '}{t(rec.template.nameKey, userLocale)}
                    </div>
                    <div className={`text-xs mt-1 ${isNightMode ? 'text-red-700' : 'text-emerald-600'}`}>
                      {rec.reason}
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full ml-2 ${isNightMode ? 'bg-red-900 text-black' : 'bg-emerald-200 text-emerald-800'}`}>
                      {t('msg.best', userLocale)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`mb-6 p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-slate-50 border-slate-200'}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isNightMode ? 'text-red-400' : 'text-sky-800'}`}>
          <Icon name="BookOpen" className="w-4 h-4" />
          <span>{t('heading.allWatchTemplates', userLocale)}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(WATCH_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              onClick={() => applyTemplate(key)}
              className={`text-left p-3 rounded-md border transition-all ${isNightMode ? 'bg-zinc-900 border-red-800 hover:bg-zinc-800 hover:border-red-600' : 'bg-white border-slate-200 hover:border-sky-400 hover:shadow-sm'}`}
            >
              <div className={`text-sm font-semibold mb-1 ${isNightMode ? 'text-red-400' : 'text-sky-700'}`}>
                {t(template.nameKey, userLocale)}
              </div>
              <div className={`text-xs ${isNightMode ? 'text-red-800' : 'text-slate-500'}`}>
                {t(template.descKey, userLocale)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {slots.length > 0 && (() => {
        const coverage = getCoverage();
        const coveragePercent = Math.round((coverage.totalMinutes / 1440) * 100);

        return (
          <div className={`mb-6 p-4 rounded-lg border ${
            coverage.hasFull24h
              ? (isNightMode ? 'bg-green-950/20 border-green-900' : 'bg-green-50 border-green-200')
              : (isNightMode ? 'bg-orange-950/20 border-orange-900' : 'bg-orange-50 border-orange-200')
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold flex items-center space-x-2 ${
                coverage.hasFull24h
                  ? (isNightMode ? 'text-green-400' : 'text-green-800')
                  : (isNightMode ? 'text-orange-400' : 'text-orange-800')
              }`}>
                <Icon name={coverage.hasFull24h ? 'CheckCircle' : 'XCircle'} className="w-4 h-4" />
                <span>{coverage.hasFull24h ? t('msg.coverage24h', userLocale) : t('msg.coverageGap', userLocale)}</span>
              </h3>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                coverage.hasFull24h
                  ? (isNightMode ? 'bg-green-900 text-green-300' : 'bg-green-200 text-green-800')
                  : (isNightMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-200 text-orange-800')
              }`}>
                {coveragePercent}%
              </span>
            </div>

            {/* Visual 24-hour timeline */}
            <div className="mb-3">
              <div className={`h-8 rounded overflow-hidden flex ${isNightMode ? 'bg-black' : 'bg-slate-200'}`}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourStart = hour * 60;
                  const hourEnd = (hour + 1) * 60;
                  let coveredMinutes = 0;

                  slots.forEach(slot => {
                    const slotStart = parseInt(slot.start.split(':')[0]) * 60 + parseInt(slot.start.split(':')[1]);
                    const slotEnd = slot.end === '24:00' ? 1440 : parseInt(slot.end.split(':')[0]) * 60 + parseInt(slot.end.split(':')[1]);

                    const overlapStart = Math.max(hourStart, slotStart);
                    const overlapEnd = Math.min(hourEnd, slotEnd);

                    if (overlapStart < overlapEnd) {
                      coveredMinutes += overlapEnd - overlapStart;
                    }
                  });

                  const clampedCoveredMinutes = Math.min(Math.max(coveredMinutes, 0), 60);
                  const hourCoveragePercent = (clampedCoveredMinutes / 60) * 100;

                  return (
                    <div
                      key={hour}
                      className={`flex-1 flex items-center justify-center text-xs font-medium transition-all ${
                        hourCoveragePercent === 100
                          ? (isNightMode ? 'bg-green-900 text-green-300' : 'bg-green-500 text-white')
                          : hourCoveragePercent > 0
                          ? (isNightMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-400 text-white')
                          : (isNightMode ? 'bg-black text-red-800' : 'bg-slate-200 text-slate-400')
                      }`}
                      title={`${hour}:00-${hour + 1}:00 (${Math.round(hourCoveragePercent)}%)`}
                    >
                      {hour}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gap details */}
            {coverage.gaps.length > 0 && (
              <div className={`text-xs ${isNightMode ? 'text-orange-600' : 'text-orange-700'}`}>
                <strong>{t('msg.coverageGap', userLocale)}:</strong>{' '}
                {coverage.gaps.map((gap, i) => (
                  <span key={i}>
                    {gap.start}-{gap.end} ({Math.round(gap.minutes / 60 * 10) / 10}h){i < coverage.gaps.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Mobile card view for slots */}
      <div className="sm:hidden space-y-3 mb-4" id="slots-configuration">
        {slots.map((slot) => (
          <div key={slot.id} className={`p-4 rounded-lg border ${isNightMode ? 'bg-zinc-900 border-red-800' : 'bg-white border-slate-300'}`}>
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isNightMode ? 'text-red-600' : 'text-slate-600'}`}>
                  {t('label.start', userLocale)}
                </label>
                <input
                  type="time"
                  value={slot.start}
                  onChange={(e) => updateSlot(slot.id, 'start', e.target.value)}
                  className={`w-full border p-2 rounded text-base ${isNightMode ? 'bg-black border-red-800 text-red-400' : 'bg-white border-slate-300'}`}
                  style={isNightMode ? {colorScheme: 'dark'} : {}}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isNightMode ? 'text-red-600' : 'text-slate-600'}`}>
                  {t('label.end', userLocale)}
                </label>
                <input
                  type="time"
                  value={slot.end}
                  onChange={(e) => updateSlot(slot.id, 'end', e.target.value)}
                  className={`w-full border p-2 rounded text-base ${isNightMode ? 'bg-black border-red-800 text-red-400' : 'bg-white border-slate-300'}`}
                  style={isNightMode ? {colorScheme: 'dark'} : {}}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isNightMode ? 'text-red-600' : 'text-slate-600'}`}>
                  {t('label.requiredCrew', userLocale)}
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={slot.reqCrew}
                  onChange={(e) => updateSlot(slot.id, 'reqCrew', Number(e.target.value))}
                  className={`w-full border p-2 rounded text-base ${isNightMode ? 'bg-black border-red-800 text-red-400' : 'bg-white border-slate-300'}`}
                />
              </div>
              <button
                onClick={() => removeSlot(slot.id)}
                className={`w-full flex items-center justify-center space-x-2 py-2 rounded border transition ${isNightMode ? 'border-red-800 text-red-500 hover:bg-red-950' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
              >
                <Icon name="Trash2" className="w-4 h-4" />
                <span className="text-sm font-medium">{t('btn.delete', userLocale)}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view for slots */}
      <div className="hidden sm:block overflow-x-auto" id="slots-configuration-desktop">
        <table className="w-full text-sm text-left">
          <thead className={`text-xs uppercase ${isNightMode ? 'bg-zinc-900 text-red-700' : 'bg-slate-50 text-slate-500'}`}>
            <tr>
              <th className="px-4 py-3 rounded-tl-lg">{t('label.start', userLocale)}</th><th className="px-4 py-3">{t('label.end', userLocale)}</th>
              <th className="px-4 py-3">{t('label.requiredCrew', userLocale)}</th><th className="px-4 py-3 rounded-tr-lg text-right">{t('label.action', userLocale)}</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id} className={`border-b last:border-0 ${isNightMode ? 'border-red-900/50' : 'border-slate-100'}`}>
                <td className="px-4 py-2"><input type="time" value={slot.start} onChange={(e) => updateSlot(slot.id, 'start', e.target.value)} className={`border p-1 rounded ${isNightMode ? 'bg-black border-red-800 text-red-400' : 'bg-white border-slate-300'}`} style={isNightMode ? {colorScheme: 'dark'} : {}} /></td>
                <td className="px-4 py-2"><input type="time" value={slot.end} onChange={(e) => updateSlot(slot.id, 'end', e.target.value)} className={`border p-1 rounded ${isNightMode ? 'bg-black border-red-800 text-red-400' : 'bg-white border-slate-300'}`} style={isNightMode ? {colorScheme: 'dark'} : {}} /></td>
                <td className="px-4 py-2"><input type="number" min="1" max="10" value={slot.reqCrew} onChange={(e) => updateSlot(slot.id, 'reqCrew', Number(e.target.value))} className={`border p-1 rounded w-16 ${isNightMode ? 'bg-black border-red-800 text-red-400' : 'bg-white border-slate-300'}`} /></td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => removeSlot(slot.id)} className={`p-1 ${isNightMode ? 'text-red-800 hover:text-red-500' : 'text-red-400 hover:text-red-600'}`}><Icon name="Trash2" className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addSlot} className={`mt-4 flex items-center space-x-2 text-sm font-medium ${isNightMode ? 'text-red-500 hover:text-red-400' : 'text-sky-600 hover:text-sky-800'}`}>
        <Icon name="Plus" className="w-4 h-4" /> <span>{t('btn.addSlot', userLocale)}</span>
      </button>
    </div>
  );
}
