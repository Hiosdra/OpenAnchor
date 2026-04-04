import React from 'react';
import { Icon } from './Icon';
import { t } from '../constants';
import type { DashboardData, Locale } from '../types';

interface LiveDashboardProps {
  isNightMode: boolean;
  userLocale: Locale;
  dashboardData: DashboardData;
  currentTime: Date;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
}

export function LiveDashboard({
  isNightMode, userLocale, dashboardData, currentTime,
  notificationsEnabled, toggleNotifications,
}: LiveDashboardProps) {
  return (
    <div className={`rounded-xl shadow-md overflow-hidden print:hidden border-l-4 ${isNightMode ? 'bg-zinc-950 border-red-800' : 'bg-white border-sky-500 text-slate-800'}`}>
      <div className={`p-4 border-b flex justify-between items-center ${isNightMode ? 'bg-zinc-900 border-red-900' : 'bg-sky-50 border-sky-100'}`}>
        <div className={`flex items-center space-x-2 font-bold ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
          <Icon name="Navigation" className="w-5 h-5" /> <span>{t('tab.livePanel', userLocale)}</span>
        </div>
        <div className={`text-sm font-mono px-3 py-1 rounded-full ${isNightMode ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-sky-100 text-sky-800'}`}>
          {currentTime.toLocaleTimeString(userLocale, {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>

      <div className="p-3 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4">
          <h3 className={`text-sm sm:text-xs uppercase tracking-wider font-semibold ${isNightMode ? 'text-red-800' : 'text-slate-500'}`}>
            Status Rejsu
          </h3>
          {dashboardData.status === 'W TRAKCIE' && dashboardData.currentSlot ? (
            <div className={`border rounded-lg p-4 ${isNightMode ? 'bg-black border-red-900' : 'bg-sky-50 border-sky-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-white text-xs font-bold px-2 py-1 rounded ${isNightMode ? 'bg-red-800' : 'bg-sky-500'}`}>
                  TERAZ NA WACHCIE
                </span>
                <span className={`text-sm font-bold ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
                  {dashboardData.currentSlot.start} - {dashboardData.currentSlot.end}
                </span>
              </div>
              <ul className="space-y-2">
                {dashboardData.currentSlot.assigned.map((p, i) => (
                  <li key={i} className={`flex items-center space-x-2 font-medium text-lg ${isNightMode ? 'text-red-400' : 'text-slate-800'}`}>
                    <Icon name="CheckCircle" className={`w-5 h-5 ${isNightMode ? 'text-red-600' : 'text-emerald-500'}`} />
                    <span>{p.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={`border rounded-lg p-4 text-center font-medium ${isNightMode ? 'bg-zinc-900 border-red-900 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              {dashboardData.status === 'PRZED REJSEM' ? 'Oczekujemy na wypłynięcie.' : 'Rejs zakończony. Bezpiecznego powrotu!'}
            </div>
          )}
        </div>

        <div className="space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className={`text-sm sm:text-xs uppercase tracking-wider font-semibold ${isNightMode ? 'text-red-800' : 'text-slate-500'}`}>
                {t('label.upcomingWatch', userLocale)}
              </h3>
              <button onClick={toggleNotifications} className={`flex items-center space-x-1 text-xs px-2 py-1 rounded border transition ${notificationsEnabled ? (isNightMode ? 'bg-red-900 text-black border-red-700' : 'bg-emerald-100 text-emerald-800 border-emerald-200') : (isNightMode ? 'border-red-900 text-red-800 hover:text-red-500' : 'border-slate-200 text-slate-500 hover:bg-slate-100')}`}>
                <Icon name="Bell" className="w-3 h-3" />
                <span>{notificationsEnabled ? t('msg.alarmOn', userLocale) : t('msg.alarmOff', userLocale)}</span>
              </button>
            </div>
            {dashboardData.nextSlot ? (
              <div className={`flex items-start space-x-4 rounded-lg p-3 border ${isNightMode ? 'bg-black border-red-900' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`px-2 py-1 rounded text-sm font-bold shrink-0 ${isNightMode ? 'bg-red-950 text-red-500' : 'bg-slate-200 text-slate-700'}`}>
                  {dashboardData.nextSlot.start}
                </div>
                <div className={`flex-1 text-sm font-medium ${isNightMode ? 'text-red-400' : 'text-slate-700'}`}>
                  {dashboardData.nextSlot.assigned.map(p => p.name).join(', ')}
                </div>
                <Icon name="ArrowRight" className={`w-4 h-4 shrink-0 mt-0.5 ${isNightMode ? 'text-red-800' : 'text-slate-400'}`} />
              </div>
            ) : (
              <span className={`text-sm italic ${isNightMode ? 'text-red-800' : 'text-slate-500'}`}>{t('msg.noUpcomingWatches', userLocale)}</span>
            )}
          </div>

          <div>
            <div className={`flex justify-between text-xs font-medium mb-1 ${isNightMode ? 'text-red-800' : 'text-slate-500'}`}>
              <span>{t('label.cruiseProgress', userLocale)}</span>
              <span>{Math.round(dashboardData.progress)}%</span>
            </div>
            <div className={`w-full rounded-full h-2.5 ${isNightMode ? 'bg-zinc-900' : 'bg-slate-200'}`}>
              <div className={`h-2.5 rounded-full transition-all duration-1000 ease-in-out ${isNightMode ? 'bg-red-700' : 'bg-sky-500'}`} style={{ width: `${dashboardData.progress}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
