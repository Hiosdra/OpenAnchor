import React from 'react';
import { Icon } from './Icon';
import { t } from '../constants';
import type { DaySchedule, CrewStat, Locale } from '../types';

interface AnalyticsPanelProps {
  isNightMode: boolean;
  userLocale: Locale;
  schedule: DaySchedule[];
  crewStats: CrewStat[];
  captainParticipates: boolean;
}

function isActiveCrewMember(role: string, captainParticipates: boolean): boolean {
  const norm = (role || '').toLowerCase();
  return norm !== 'cook' && !(norm === 'captain' && !captainParticipates);
}

export function AnalyticsPanel({
  isNightMode,
  userLocale,
  schedule,
  crewStats,
  captainParticipates,
}: AnalyticsPanelProps) {
  const activeStats = crewStats.filter((c) => isActiveCrewMember(c.role, captainParticipates));

  return (
    <div className="space-y-6">
      <div
        className={`p-6 rounded-xl shadow-sm border ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}
      >
        <h2
          className={`text-2xl font-bold mb-6 flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}
        >
          <Icon name="TrendingUp" className="w-6 h-6" />
          <span>{t('heading.analytics', userLocale)}</span>
        </h2>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div
            className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-sky-50 border-sky-200'}`}
          >
            <div
              className={`text-xs uppercase tracking-wider mb-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}
            >
              {t('analytics.totalWatches', userLocale)}
            </div>
            <div className={`text-3xl font-bold ${isNightMode ? 'text-red-400' : 'text-sky-900'}`}>
              {schedule.reduce((sum, day) => sum + day.slots.length, 0)}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-emerald-50 border-emerald-200'}`}
          >
            <div
              className={`text-xs uppercase tracking-wider mb-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}
            >
              {t('analytics.activeCrew', userLocale)}
            </div>
            <div
              className={`text-3xl font-bold ${isNightMode ? 'text-red-400' : 'text-emerald-900'}`}
            >
              {activeStats.length}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-purple-50 border-purple-200'}`}
          >
            <div
              className={`text-xs uppercase tracking-wider mb-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}
            >
              {t('analytics.totalDays', userLocale)}
            </div>
            <div
              className={`text-3xl font-bold ${isNightMode ? 'text-red-400' : 'text-purple-900'}`}
            >
              {schedule.length}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-orange-50 border-orange-200'}`}
          >
            <div
              className={`text-xs uppercase tracking-wider mb-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}
            >
              {t('analytics.avgHours', userLocale)}
            </div>
            <div
              className={`text-3xl font-bold ${isNightMode ? 'text-red-400' : 'text-orange-900'}`}
            >
              {(() => {
                const avg =
                  activeStats.reduce((sum, c) => sum + c.totalHours, 0) / activeStats.length;
                return Math.round(avg * 10) / 10;
              })()}
              h
            </div>
          </div>
        </div>

        {/* Workload Distribution Chart */}
        <div className="mb-8">
          <h3
            className={`text-lg font-bold mb-4 ${isNightMode ? 'text-red-500' : 'text-slate-900'}`}
          >
            {t('analytics.workloadDistribution', userLocale)}
          </h3>
          <div className="space-y-3">
            {activeStats
              .sort((a, b) => b.totalHours - a.totalHours)
              .map((member, idx) => {
                const maxHours = Math.max(...crewStats.map((c) => c.totalHours));
                const percentage = (member.totalHours / maxHours) * 100;

                return (
                  <div key={member.id}>
                    <div className="flex justify-between mb-1">
                      <span
                        className={`text-sm font-medium ${isNightMode ? 'text-red-400' : 'text-slate-700'}`}
                      >
                        {idx + 1}. {member.name}
                      </span>
                      <span
                        className={`text-sm font-bold ${isNightMode ? 'text-red-500' : 'text-slate-900'}`}
                      >
                        {member.totalHours}h
                      </span>
                    </div>
                    <div
                      className={`h-6 rounded-full overflow-hidden ${isNightMode ? 'bg-zinc-900' : 'bg-slate-200'}`}
                    >
                      <div
                        className={`h-full transition-all duration-500 flex items-center justify-end pr-2 text-xs font-bold text-white ${
                          idx === 0
                            ? isNightMode
                              ? 'bg-red-700'
                              : 'bg-sky-600'
                            : idx === 1
                              ? isNightMode
                                ? 'bg-red-600'
                                : 'bg-sky-500'
                              : isNightMode
                                ? 'bg-red-800'
                                : 'bg-sky-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      >
                        {percentage > 20 && `${Math.round(percentage)}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3
              className={`text-lg font-bold mb-4 flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-slate-900'}`}
            >
              <span>🏆</span>
              <span>{t('analytics.mostHours', userLocale)}</span>
            </h3>
            <div
              className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-gradient-to-br from-sky-50 to-emerald-50 border-sky-200'}`}
            >
              {[...activeStats]
                .sort((a, b) => b.totalHours - a.totalHours)
                .slice(0, 3)
                .map((member, idx) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between py-2 ${idx > 0 ? 'border-t' : ''}`}
                    style={{ borderColor: isNightMode ? '#7f1d1d33' : '#e2e8f033' }}
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-2xl font-bold ${isNightMode ? 'text-red-700' : 'text-slate-400'}`}
                      >
                        {idx + 1}
                      </span>
                      <span
                        className={`font-bold ${isNightMode ? 'text-red-400' : 'text-slate-900'}`}
                      >
                        {member.name}
                      </span>
                    </div>
                    <span
                      className={`text-xl font-bold ${isNightMode ? 'text-red-500' : 'text-sky-600'}`}
                    >
                      {member.totalHours}h
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h3
              className={`text-lg font-bold mb-4 flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-slate-900'}`}
            >
              <span>🌙</span>
              <span>{t('analytics.mostNightWatches', userLocale)}</span>
            </h3>
            <div
              className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'}`}
            >
              {[...activeStats]
                .sort((a, b) => b.hardWatches - a.hardWatches)
                .slice(0, 3)
                .map((member, idx) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between py-2 ${idx > 0 ? 'border-t' : ''}`}
                    style={{ borderColor: isNightMode ? '#7f1d1d33' : '#e2e8f033' }}
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-2xl font-bold ${isNightMode ? 'text-red-700' : 'text-slate-400'}`}
                      >
                        {idx + 1}
                      </span>
                      <span
                        className={`font-bold ${isNightMode ? 'text-red-400' : 'text-slate-900'}`}
                      >
                        {member.name}
                      </span>
                    </div>
                    <span
                      className={`text-xl font-bold ${isNightMode ? 'text-red-500' : 'text-purple-600'}`}
                    >
                      {member.hardWatches}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
