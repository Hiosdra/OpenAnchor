import React from 'react';
import { Icon } from './Icon';
import { ROLES, t } from '../constants';
import type { CrewMember, Recommendation, Locale } from '../types';

interface CrewPanelProps {
  isNightMode: boolean;
  userLocale: Locale;
  crew: CrewMember[];
  newCrewName: string;
  setNewCrewName: (v: string) => void;
  newCrewRole: string;
  setNewCrewRole: (v: string) => void;
  captainParticipates: boolean;
  setCaptainParticipates: (v: boolean) => void;
  recommendations: Recommendation[];
  addCrew: () => void;
  removeCrew: (id: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  days: number;
  setDays: (v: number) => void;
}

export function CrewPanel({
  isNightMode,
  userLocale,
  crew,
  newCrewName,
  setNewCrewName,
  newCrewRole,
  setNewCrewRole,
  captainParticipates,
  setCaptainParticipates,
  recommendations,
  addCrew,
  removeCrew,
  startDate,
  setStartDate,
  days,
  setDays,
}: CrewPanelProps) {
  return (
    <div className="lg:col-span-4 space-y-4 sm:space-y-6">
      <div
        className={`p-4 sm:p-5 rounded-xl shadow-sm border ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}
      >
        <div
          className={`flex items-center space-x-2 mb-3 sm:mb-4 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}
        >
          <Icon name="Users" className="w-5 h-5" />
          <h2 className="text-base sm:text-lg font-semibold">
            {t('heading.crewAndRolesWithLimit', userLocale)} ({crew.length}/15)
          </h2>
        </div>
        {recommendations.length > 0 &&
          (() => {
            const activeCrew = crew.filter((c) => c.role !== 'cook');
            const topRec = recommendations[0];
            const optimalCrew = topRec.template.optimalCrew;
            const minCrew = topRec.template.minCrew;
            const crewSize = activeCrew.length;
            let status = 'optimal';
            let statusColor = isNightMode ? 'bg-emerald-900' : 'bg-emerald-500';
            let statusText = 'Optymalna';
            let percentage: number;

            if (crewSize < minCrew) {
              status = 'low';
              statusColor = isNightMode ? 'bg-red-900' : 'bg-red-500';
              statusText = 'Za mała';
              percentage = (crewSize / minCrew) * 100;
            } else if (crewSize > optimalCrew + 2) {
              status = 'high';
              statusColor = isNightMode ? 'bg-orange-900' : 'bg-orange-500';
              statusText = 'Za duża';
              percentage = Math.min(100, (crewSize / (optimalCrew + 2)) * 100);
            } else {
              percentage = Math.min(100, (crewSize / optimalCrew) * 100);
            }

            return (
              <div className="mb-4">
                <div
                  className={`flex justify-between text-xs font-medium mb-1 ${isNightMode ? 'text-red-700' : 'text-slate-600'}`}
                >
                  <span>
                    {t('label.crewSize', userLocale)}: {statusText}
                  </span>
                  <span>
                    {crewSize} {t('common.people', userLocale)} ({t('label.optimal', userLocale)}:{' '}
                    {optimalCrew})
                  </span>
                </div>
                <div
                  className={`w-full rounded-full h-2 ${isNightMode ? 'bg-zinc-900' : 'bg-slate-200'}`}
                >
                  <div
                    className={`h-2 rounded-full transition-all ${statusColor}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })()}
        <div className="space-y-3 mb-4">
          {crew.map((person) => {
            const roleData = ROLES[person.role?.toUpperCase?.()] || {};
            const roleIcon = roleData.icon || 'User';
            const roleColor = roleData.color || 'text-slate-500';
            const normalizedRole = (person.role || '').toLowerCase();
            const isExcluded =
              normalizedRole === 'cook' || (normalizedRole === 'captain' && !captainParticipates);
            return (
              <div
                key={person.id}
                className={`flex items-center justify-between p-2 rounded border ${isNightMode ? 'bg-black border-red-900' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    name={roleIcon}
                    className={`w-4 h-4 ${isNightMode ? 'text-red-600' : roleColor}`}
                  />
                  <span
                    className={`text-sm font-medium ${isNightMode ? '' : 'text-slate-800'} ${isExcluded ? 'line-through opacity-70' : ''}`}
                    title={isExcluded ? t('label.exemptFromWatches', userLocale) : ''}
                  >
                    {person.name}
                  </span>
                </div>
                <button
                  onClick={() => removeCrew(person.id)}
                  className={`p-1 ${isNightMode ? 'text-red-800 hover:text-red-500' : 'text-red-400 hover:text-red-600'}`}
                >
                  <Icon name="Trash2" className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
        <div
          className={`mb-4 p-3 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-sky-50 border-sky-200'}`}
        >
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center space-x-2">
              <Icon
                name="Shield"
                className={`w-4 h-4 ${isNightMode ? 'text-red-500' : 'text-sky-700'}`}
              />
              <span
                className={`text-sm font-medium ${isNightMode ? 'text-red-400' : 'text-sky-900'}`}
              >
                Kapitan uczestniczy w wachtach
              </span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={captainParticipates}
                onChange={(e) => setCaptainParticipates(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-11 h-6 rounded-full peer transition-colors ${captainParticipates ? (isNightMode ? 'bg-red-700' : 'bg-sky-600') : isNightMode ? 'bg-zinc-700' : 'bg-slate-300'}`}
              ></div>
              <div
                className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${captainParticipates ? 'translate-x-5' : 'translate-x-0'}`}
              ></div>
            </div>
          </label>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Imię..."
              value={newCrewName}
              onChange={(e) => setNewCrewName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCrew()}
              className={`flex-1 rounded-md shadow-sm text-sm p-2 border ${isNightMode ? 'bg-zinc-900 border-red-800 text-red-400 placeholder-red-900 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-sky-500'}`}
            />
            <select
              value={newCrewRole}
              onChange={(e) => setNewCrewRole(e.target.value)}
              className={`w-28 rounded-md shadow-sm text-sm p-2 border ${isNightMode ? 'bg-zinc-900 border-red-800 text-red-400' : 'border-slate-300 text-slate-900'}`}
            >
              {Object.values(ROLES).map((r) => (
                <option key={r.id} value={r.id}>
                  {t('role.' + r.id, userLocale)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={addCrew}
            disabled={crew.length >= 15}
            className={`w-full py-2 rounded-md flex justify-center items-center space-x-2 transition ${isNightMode ? 'bg-red-900 hover:bg-red-800 text-black' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            <Icon name="Plus" className="w-4 h-4" /> <span>{t('btn.addPerson', userLocale)}</span>
          </button>
        </div>
      </div>

      <div
        className={`p-5 rounded-xl shadow-sm border ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}
      >
        <div
          className={`flex items-center space-x-2 mb-4 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}
        >
          <Icon name="Settings" className="w-5 h-5" />{' '}
          <h2 className="text-lg font-semibold">{t('heading.cruiseSettings', userLocale)}</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label
              className={`block text-sm font-medium mb-1 flex items-center space-x-2 ${isNightMode ? '' : 'text-slate-800'}`}
            >
              <Icon name="CalendarDays" className="w-4 h-4" />{' '}
              <span>{t('label.startDate', userLocale)}</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full rounded-md shadow-sm p-2 border text-sm ${isNightMode ? 'bg-zinc-900 border-red-800 text-red-400' : 'border-slate-300 text-slate-900'}`}
              style={isNightMode ? { colorScheme: 'dark' } : {}}
            />
          </div>
          <div>
            <label
              className={`block text-sm font-medium mb-1 ${isNightMode ? '' : 'text-slate-800'}`}
            >
              {t('label.duration', userLocale)}
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className={`w-full rounded-md shadow-sm p-2 border text-sm ${isNightMode ? 'bg-zinc-900 border-red-800 text-red-400' : 'border-slate-300 text-slate-900'}`}
            />
            <p className={`text-xs mt-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}>
              {t('label.maxDuration', userLocale)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
