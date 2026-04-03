// @ts-nocheck
// Slim rendering component — all logic lives in ./hooks/*
import React, { useMemo, useEffect } from 'react';
import { ROLES, WATCH_TEMPLATES, t } from './constants';
import { Icon } from './components/Icon';
import { Dropdown, DropdownItem } from './components/Dropdown';
import { ScheduleTableRow } from './components/ScheduleTableRow';
import { useAppSettings } from './hooks/useAppSettings';
import { useCrewManagement } from './hooks/useCrewManagement';
import { useWatchSlots } from './hooks/useWatchSlots';
import { useScheduleEngine } from './hooks/useScheduleEngine';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useDragDrop } from './hooks/useDragDrop';
import { usePersistence } from './hooks/usePersistence';
import { useExportShare } from './hooks/useExportShare';
import { useNotifications, useKeyboardShortcuts } from './hooks/useKeyboardAndNotifications';

function App() {
  // --- Hook composition ---
  const settings = useAppSettings();
  const { isNightMode, setIsNightMode, toggleNightMode, notificationsEnabled, toggleNotifications, userLocale, toggleLanguage, activeTab, setActiveTab } = settings;

  const crewMgmt = useCrewManagement();
  const { crew, setCrew, newCrewName, setNewCrewName, newCrewRole, setNewCrewRole, captainParticipates, setCaptainParticipates, activeCrew, recommendations, addCrew, removeCrew } = crewMgmt;

  const watchSlots = useWatchSlots(userLocale);
  const { slots, setSlots, addSlot, removeSlot, updateSlot, applyDogWatches: applyDogWatchesRaw, applyTemplate: applyTemplateRaw, getCoverage } = watchSlots;

  const engine = useScheduleEngine(crew, slots, captainParticipates);
  const { schedule, setSchedule, isGenerated, setIsGenerated, days, setDays, startDate, setStartDate, currentTime, dashboardData, crewStats } = engine;

  const persistenceSetters = useMemo(() => ({
    setCrew, setSlots, setSchedule, setIsGenerated, setDays, setStartDate, setIsNightMode, setCaptainParticipates, setActiveTab,
  }), [setCrew, setSlots, setSchedule, setIsGenerated, setDays, setStartDate, setIsNightMode, setCaptainParticipates, setActiveTab]);

  const appState = useMemo(() => ({
    crew, slots, days, startDate, schedule, isGenerated, isNightMode, captainParticipates,
  }), [crew, slots, days, startDate, schedule, isGenerated, isNightMode, captainParticipates]);

  const { isLoaded, isReadOnly } = usePersistence(appState, persistenceSetters);

  const undoRedoSetters = useMemo(() => ({ setCrew, setSlots, setSchedule, setIsGenerated }), [setCrew, setSlots, setSchedule, setIsGenerated]);
  const undoRedoState = useMemo(() => ({ crew, slots, schedule }), [crew, slots, schedule]);
  const { undo, redo, canUndo, canRedo } = useUndoRedo(undoRedoState, undoRedoSetters, isLoaded, isReadOnly);

  const { draggedItem, handleDragStart, handleDrop, handleDragOver } = useDragDrop(schedule, setSchedule);

  const exportSetters = useMemo(() => ({ setCrew, setSlots, setCaptainParticipates, setSchedule, setIsGenerated }), [setCrew, setSlots, setCaptainParticipates, setSchedule, setIsGenerated]);
  const exportShare = useExportShare(appState, dashboardData, crewStats, userLocale, isReadOnly, exportSetters);
  const { copyStatus, toastType, showQRModal, setShowQRModal, qrError, qrCodeRef, downloadICS, handlePrint, handleExportPDF, handleExportConfig, handleImportConfig, handleShare, handleShowQR, showToast } = exportShare;

  const applyDogWatches = () => applyDogWatchesRaw(userLocale, showToast);

  const applyTemplate = (templateKey) => {
    applyTemplateRaw(templateKey);
    setIsGenerated(false);
  };

  const generateSchedule = () => {
    engine.generateSchedule();
  };

  useEffect(() => {
    if (engine.isGenerated) {
      setActiveTab('schedule');
    }
  }, [engine.isGenerated]);

  useNotifications(notificationsEnabled, dashboardData, currentTime);

  useKeyboardShortcuts({
    activeTab, canUndo, canRedo, isReadOnly, showQRModal,
    undo, redo, generateSchedule, handlePrint, setShowQRModal,
  });

  if (!isLoaded) return null;

  return (
    <div className={`min-h-screen font-sans pb-10 transition-colors duration-300 print:text-black print:bg-white ${isNightMode ? 'bg-black text-red-600' : 'text-slate-100'}`} data-night-mode={isNightMode}>

      {/* Skip to main content link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Przejdź do głównej treści
      </a>

      <header className={`oa-header print:bg-white print:text-black print:shadow-none print:p-0 print:mb-6 ${isNightMode ? 'bg-zinc-950/90 border-b border-red-900/20' : ''}`}>
        <a href="../../index.html" title={t('title.backToMenu', userLocale)} aria-label={t('aria.backToMenu', userLocale)} className="oa-back-btn print:hidden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span>Menu</span>
        </a>
        <h1 className="oa-header-title">{t('heading.appTitle', userLocale)}</h1>
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 print:hidden">
          {/* Settings Group */}
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className="oa-settings-btn"
            title={t('title.nightMode', userLocale)}
            aria-label={isNightMode ? t('aria.disableNightMode', userLocale) : t('aria.toggleNightMode', userLocale)}
            aria-pressed={isNightMode}
          >
            <Icon name={isNightMode ? "Sun" : "Moon"} className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={toggleLanguage}
              className={`flex items-center space-x-2 px-3 py-2.5 min-h-[44px] rounded-lg transition border ${isNightMode ? 'border-red-800 hover:bg-red-950 text-red-500' : 'bg-sky-600 border-sky-500 hover:bg-sky-500 text-white'}`}
              title={userLocale === 'pl-PL' ? "Switch to English" : "Przełącz na Polski"}
              aria-label={userLocale === 'pl-PL' ? "Switch to English" : "Przełącz na Polski"}
            >
              <Icon name="Globe" className="w-5 h-5" aria-hidden="true" />
              <span className="hidden md:inline text-xs font-mono">{userLocale === 'pl-PL' ? 'EN' : 'PL'}</span>
            </button>

            {/* History Controls - only if not read-only */}
            {!isReadOnly && (
              <>
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className={`flex items-center space-x-2 px-3 py-2.5 min-h-[44px] rounded-lg transition border ${!canUndo ? 'opacity-40 cursor-not-allowed' : ''} ${isNightMode ? 'border-red-800 hover:bg-red-950 text-red-500' : 'bg-sky-600 border-sky-500 hover:bg-sky-500 text-white'}`}
                  title={t('title.undo', userLocale)}
                  aria-label={t('aria.undoLastChange', userLocale)}
                  aria-disabled={!canUndo}
                >
                  <Icon name="Undo" className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className={`flex items-center space-x-2 px-3 py-2.5 min-h-[44px] rounded-lg transition border ${!canRedo ? 'opacity-40 cursor-not-allowed' : ''} ${isNightMode ? 'border-red-800 hover:bg-red-950 text-red-500' : 'bg-sky-600 border-sky-500 hover:bg-sky-500 text-white'}`}
                  title={t('title.redo', userLocale)}
                  aria-label={t('aria.redoLastChange', userLocale)}
                  aria-disabled={!canRedo}
                >
                  <Icon name="Redo" className="w-5 h-5" aria-hidden="true" />
                </button>
              </>
            )}

            {/* Share Dropdown */}
            <Dropdown label="Udostępnij" icon="Share2" isNightMode={isNightMode}>
              <DropdownItem
                onClick={handleShowQR}
                icon="QrCode"
                label="QR Kod"
                isNightMode={isNightMode}
              />
              <DropdownItem
                onClick={() => handleShare(false)}
                icon="Share2"
                label="Link edytowalny"
                isNightMode={isNightMode}
              />
              <DropdownItem
                onClick={() => handleShare(true)}
                icon="Shield"
                label="Link tylko do odczytu"
                isNightMode={isNightMode}
              />
            </Dropdown>

            {/* File Operations Dropdown - only if not read-only */}
            {!isReadOnly && (
              <Dropdown
                label="Plik"
                icon="Save"
                isNightMode={isNightMode}
                buttonClassName={isNightMode ? 'border-red-800 hover:bg-red-950 text-red-500' : 'bg-green-700 border-green-600 hover:bg-green-600'}
              >
                <DropdownItem
                  onClick={handleExportConfig}
                  icon="Save"
                  label="Eksportuj konfigurację"
                  isNightMode={isNightMode}
                />
                <DropdownItem
                  onClick={handleImportConfig}
                  icon="Upload"
                  label="Importuj konfigurację"
                  isNightMode={isNightMode}
                />
              </Dropdown>
            )}

            {/* Export Dropdown */}
            <Dropdown label="Eksport" icon="Download" isNightMode={isNightMode}>
              <DropdownItem
                onClick={handleExportPDF}
                icon="Download"
                label="Eksportuj PDF"
                isNightMode={isNightMode}
              />
              <DropdownItem
                onClick={handlePrint}
                icon="Printer"
                label="Drukuj"
                isNightMode={isNightMode}
              />
            </Dropdown>
          </div>
      </header>

      {/* Toast notification for user feedback */}
      {copyStatus && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 print:hidden">
          <div className={`rounded-lg p-3 px-4 flex items-center space-x-2 shadow-lg ${
            toastType === 'error'
              ? (isNightMode ? 'bg-red-950 border border-red-900 text-red-400' : 'bg-red-50 border border-red-500 text-red-800')
              : (isNightMode ? 'bg-green-950 border border-green-900 text-green-400' : 'bg-green-50 border border-green-500 text-green-800')
          }`}>
            <Icon name={toastType === 'error' ? 'XCircle' : 'CheckCircle'} className="w-5 h-5" />
            <span className="font-medium">{copyStatus}</span>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className={`max-w-7xl mx-auto px-4 mt-4 print:hidden`}>
          <div className={`rounded-lg p-3 flex items-center space-x-2 ${isNightMode ? 'bg-orange-950 border border-orange-900 text-orange-400' : 'bg-orange-50 border border-orange-200 text-orange-800'}`}>
            <Icon name="Shield" className="w-5 h-5" />
            <span className="font-medium">Tryb tylko do odczytu - edycja jest wyłączona</span>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-2 sm:px-4 mt-4 sm:mt-6 print:hidden ${isNightMode ? '' : 'bg-white/80 backdrop-blur-sm rounded-xl py-2'}`}>
        <div className={`flex p-1 space-x-0.5 sm:space-x-1 rounded-xl w-full sm:w-max overflow-x-auto ${isNightMode ? 'bg-zinc-900' : 'bg-slate-200'}`}>
          {!isReadOnly && (
            <button
              onClick={() => setActiveTab('setup')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'setup' ? (isNightMode ? 'bg-black text-red-500 shadow-sm shadow-red-900/20' : 'bg-white text-sky-900 shadow-sm') : (isNightMode ? 'text-red-800 hover:text-red-500 hover:bg-black/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50')}`}
            >
              <Icon name="Settings" className="w-4 h-4" />
              <span>{t('tab.setup', userLocale)}</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('schedule')}
            disabled={!isGenerated}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${!isGenerated ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'schedule' ? (isNightMode ? 'bg-black text-red-500 shadow-sm shadow-red-900/20' : 'bg-white text-sky-900 shadow-sm') : (isNightMode ? 'text-red-800 hover:text-red-500 hover:bg-black/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50')}`}
          >
            <Icon name="CalendarDays" className="w-4 h-4" />
            <span>{t('tab.schedule', userLocale)}</span>
          </button>
          <button
            onClick={() => setActiveTab('gantt')}
            disabled={!isGenerated}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${!isGenerated ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'gantt' ? (isNightMode ? 'bg-black text-red-500 shadow-sm shadow-red-900/20' : 'bg-white text-sky-900 shadow-sm') : (isNightMode ? 'text-red-800 hover:text-red-500 hover:bg-black/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50')}`}
          >
            <Icon name="BarChart3" className="w-4 h-4" />
            <span>{t('tab.gantt', userLocale)}</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            disabled={!isGenerated}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${!isGenerated ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'analytics' ? (isNightMode ? 'bg-black text-red-500 shadow-sm shadow-red-900/20' : 'bg-white text-sky-900 shadow-sm') : (isNightMode ? 'text-red-800 hover:text-red-500 hover:bg-black/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50')}`}
          >
            <Icon name="TrendingUp" className="w-4 h-4" />
            <span>{t('tab.analytics', userLocale)}</span>
          </button>
        </div>
      </div>

      <main id="main-content" className="max-w-7xl mx-auto px-2 sm:px-4 mt-2 space-y-4 sm:space-y-6 pb-8 sm:pb-10">

        {activeTab === 'schedule' && isGenerated && dashboardData && (
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
        )}

        {activeTab === 'setup' && (
          <>
            {/* Quick Help Section */}
            <div className={`p-4 rounded-xl border print:hidden ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start space-x-3">
                <Icon name="HelpCircle" className={`w-5 h-5 shrink-0 mt-0.5 ${isNightMode ? 'text-red-500' : 'text-blue-600'}`} />
                <div className="flex-1">
                  <h3 className={`font-semibold mb-2 ${isNightMode ? 'text-red-400' : 'text-blue-900'}`}>
                    Szybka pomoc
                  </h3>
                  <div className={`text-sm space-y-1 ${isNightMode ? 'text-red-700' : 'text-blue-800'}`}>
                    <p><strong>Krok 1:</strong> Dodaj członków załogi (minimum 3 osoby)</p>
                    <p><strong>Krok 2:</strong> Wybierz lub dostosuj system wacht po prawej stronie</p>
                    <p><strong>Krok 3:</strong> Ustaw datę rozpoczęcia i długość rejsu</p>
                    <p><strong>Krok 4:</strong> Kliknij "Generuj harmonogram wacht"</p>
                    <details className="mt-3">
                      <summary className={`cursor-pointer font-medium ${isNightMode ? 'text-red-500 hover:text-red-400' : 'text-blue-700 hover:text-blue-600'}`}>
                        Skróty klawiszowe
                      </summary>
                      <div className={`mt-2 pl-4 space-y-1 text-xs ${isNightMode ? 'text-red-800' : 'text-blue-700'}`}>
                        <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Ctrl+G</kbd> - Generuj harmonogram</p>
                        <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Ctrl+P</kbd> - Drukuj</p>
                        <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Ctrl+Z</kbd> - Cofnij</p>
                        <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Ctrl+Y</kbd> - Ponów</p>
                        <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Esc</kbd> - Zamknij okno modalne</p>
                        <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Tab</kbd> - Nawigacja po elementach</p>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 print:hidden">

              <div className="lg:col-span-4 space-y-4 sm:space-y-6">
                <div className={`p-4 sm:p-5 rounded-xl shadow-sm border ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}>
                  <div className={`flex items-center space-x-2 mb-3 sm:mb-4 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
                    <Icon name="Users" className="w-5 h-5" />
                    <h2 className="text-base sm:text-lg font-semibold">{t('heading.crewAndRolesWithLimit', userLocale)} ({crew.length}/15)</h2>
                  </div>
                  {recommendations.length > 0 && (() => {
                    const activeCrew = crew.filter(c => c.role !== 'cook');
                    const topRec = recommendations[0];
                    const optimalCrew = topRec.template.optimalCrew;
                    const minCrew = topRec.template.minCrew;
                    const crewSize = activeCrew.length;
                    let status = 'optimal';
                    let statusColor = isNightMode ? 'bg-emerald-900' : 'bg-emerald-500';
                    let statusText = 'Optymalna';
                    let percentage = 100;

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
                        <div className={`flex justify-between text-xs font-medium mb-1 ${isNightMode ? 'text-red-700' : 'text-slate-600'}`}>
                          <span>{t('label.crewSize', userLocale)}: {statusText}</span>
                          <span>{crewSize} {t('common.people', userLocale)} ({t('label.optimal', userLocale)}: {optimalCrew})</span>
                        </div>
                        <div className={`w-full rounded-full h-2 ${isNightMode ? 'bg-zinc-900' : 'bg-slate-200'}`}>
                          <div className={`h-2 rounded-full transition-all ${statusColor}`} style={{ width: `${percentage}%` }}></div>
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
                      const isExcluded = normalizedRole === 'cook' || (normalizedRole === 'captain' && !captainParticipates);
                      return (
                        <div key={person.id} className={`flex items-center justify-between p-2 rounded border ${isNightMode ? 'bg-black border-red-900' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex items-center space-x-3">
                            <Icon name={roleIcon} className={`w-4 h-4 ${isNightMode ? 'text-red-600' : roleColor}`} />
                            <span className={`text-sm font-medium ${isNightMode ? '' : 'text-slate-800'} ${isExcluded ? 'line-through opacity-70' : ''}`} title={isExcluded ? t('label.exemptFromWatches', userLocale) : ''}>
                              {person.name}
                            </span>
                          </div>
                          <button onClick={() => removeCrew(person.id)} className={`p-1 ${isNightMode ? 'text-red-800 hover:text-red-500' : 'text-red-400 hover:text-red-600'}`}>
                            <Icon name="Trash2" className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className={`mb-4 p-3 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-sky-50 border-sky-200'}`}>
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <Icon name="Shield" className={`w-4 h-4 ${isNightMode ? 'text-red-500' : 'text-sky-700'}`} />
                        <span className={`text-sm font-medium ${isNightMode ? 'text-red-400' : 'text-sky-900'}`}>
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
                        <div className={`w-11 h-6 rounded-full peer transition-colors ${captainParticipates ? (isNightMode ? 'bg-red-700' : 'bg-sky-600') : (isNightMode ? 'bg-zinc-700' : 'bg-slate-300')}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${captainParticipates ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                    </label>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text" placeholder="Imię..." value={newCrewName}
                        onChange={(e) => setNewCrewName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCrew()}
                        className={`flex-1 rounded-md shadow-sm text-sm p-2 border ${isNightMode ? 'bg-zinc-900 border-red-800 text-red-400 placeholder-red-900 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-sky-500'}`}
                      />
                      <select
                        value={newCrewRole} onChange={(e) => setNewCrewRole(e.target.value)}
                        className={`w-28 rounded-md shadow-sm text-sm p-2 border ${isNightMode ? 'bg-zinc-900 border-red-800 text-red-400' : 'border-slate-300 text-slate-900'}`}
                      >
                        {Object.values(ROLES).map(r => <option key={r.id} value={r.id}>{t('role.' + r.id, userLocale)}</option>)}
                      </select>
                    </div>
                    <button onClick={addCrew} disabled={crew.length >= 15} className={`w-full py-2 rounded-md flex justify-center items-center space-x-2 transition ${isNightMode ? 'bg-red-900 hover:bg-red-800 text-black' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                      <Icon name="Plus" className="w-4 h-4" /> <span>{t('btn.addPerson', userLocale)}</span>
                    </button>
                  </div>
                </div>


                <div className={`p-5 rounded-xl shadow-sm border ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}>
                  <div className={`flex items-center space-x-2 mb-4 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
                    <Icon name="Settings" className="w-5 h-5" /> <h2 className="text-lg font-semibold">{t('heading.cruiseSettings', userLocale)}</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 flex items-center space-x-2 ${isNightMode ? '' : 'text-slate-800'}`}>
                        <Icon name="CalendarDays" className="w-4 h-4" /> <span>{t('label.startDate', userLocale)}</span>
                      </label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`w-full rounded-md shadow-sm p-2 border text-sm ${isNightMode ? 'bg-zinc-900 border-red-800 text-red-400' : 'border-slate-300 text-slate-900'}`} style={isNightMode ? {colorScheme: 'dark'} : {}} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isNightMode ? '' : 'text-slate-800'}`}>{t('label.duration', userLocale)}</label>
                      <input type="number" min="1" max="60" value={days} onChange={(e) => setDays(Number(e.target.value))} className={`w-full rounded-md shadow-sm p-2 border text-sm ${isNightMode ? 'bg-zinc-900 border-red-800 text-red-400' : 'border-slate-300 text-slate-900'}`} />
                      <p className={`text-xs mt-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}>{t('label.maxDuration', userLocale)}</p>
                    </div>
                  </div>
                </div>
              </div>

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
            </div>

            <div className="flex justify-center py-6 print:hidden">
              <button
                onClick={generateSchedule}
                className={`flex items-center space-x-2 px-8 py-3 rounded-full text-lg font-bold shadow-lg transition-all transform hover:-translate-y-0.5 border ${isNightMode ? 'bg-red-900 hover:bg-red-800 border-red-700 text-black shadow-red-900/20' : 'bg-sky-600 hover:bg-sky-700 border-sky-600 text-white shadow-sky-900/20'}`}
              >
                <Icon name="RefreshCw" className="w-6 h-6" /> <span>{t('btn.generate', userLocale)}</span>
              </button>
            </div>
          </>
        )}

        {isGenerated && schedule.length > 0 && (
          <div id="print-schedule-section" style={{display: activeTab === 'schedule' ? undefined : 'none'}} className={`p-3 sm:p-4 md:p-6 rounded-xl shadow-sm border print:border-none print:shadow-none print:p-0 ${isNightMode ? 'bg-zinc-950 border-red-900 text-red-600' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 md:mb-6 gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center print:text-black">{t('heading.fullSchedule', userLocale)}</h2>
              <span className={`text-xs italic print:hidden hidden sm:block ${isNightMode ? 'text-red-800' : 'text-slate-400'}`}>
                {t('tip.dragDrop', userLocale)}
              </span>
            </div>

            {/* Mobile Card View - Hidden, using table instead */}
            <div className="hidden print:hidden space-y-3 sm:space-y-4">
              {schedule.map((daySchedule, dayIndex) => {
                const rowDate = new Date(startDate);
                rowDate.setDate(rowDate.getDate() + dayIndex);

                return (
                  <div key={dayIndex} className={`rounded-lg border overflow-hidden ${isNightMode ? 'border-red-900/50 bg-zinc-900' : 'border-slate-200 bg-white'}`}>
                    {/* Day Header */}
                    <div className={`px-4 py-3 font-bold sticky top-0 z-10 ${isNightMode ? 'bg-black text-red-500 border-b border-red-900' : 'bg-sky-900 text-white border-b border-sky-800'}`}>
                      <div className="flex justify-between items-center">
                        <span>{t('label.day', userLocale)} {daySchedule.day}</span>
                        <span className="text-sm font-normal">{rowDate.toLocaleDateString(userLocale, {day:'2-digit', month:'2-digit', year:'numeric'})}</span>
                      </div>
                    </div>

                    {/* Watch Slots */}
                    <div className="divide-y" style={{borderColor: isNightMode ? '#7f1d1d33' : '#e2e8f033'}}>
                      {daySchedule.slots.map((slot, slotIndex) => (
                        <div key={slotIndex} className={`p-4 ${isNightMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50/50'} transition-colors`}>
                          {/* Slot Header */}
                          <div className="flex justify-between items-center mb-3">
                            <span className={`font-semibold text-base ${isNightMode ? 'text-red-400' : 'text-sky-800'}`}>
                              {slot.start} - {slot.end}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${isNightMode ? 'bg-black text-red-700 border border-red-900' : 'bg-sky-50 text-sky-700 border border-sky-200'}`}>
                              Osoby: {slot.reqCrew}
                            </span>
                          </div>

                          {/* Assigned Crew */}
                          <div className="space-y-2 mb-3">
                            {slot.assigned.map((person, personIndex) => {
                              const roleIcon = ROLES[person.role.toUpperCase()]?.icon || 'User';
                              return (
                                <div
                                  key={personIndex}
                                  className={`px-4 py-3 min-h-[44px] rounded-lg border flex items-center space-x-3 mobile-touch-target ${isNightMode ? 'bg-black border-red-800' : 'bg-slate-50 border-slate-300'}`}
                                >
                                  <Icon name={roleIcon} className={`w-5 h-5 shrink-0 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`} />
                                  <span className={`font-medium text-base ${isNightMode ? 'text-red-300' : 'text-slate-800'}`}>{person.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View - Now visible on all screen sizes with horizontal scroll */}
            <div className={`rounded-lg p-4 print:p-0 print:shadow-none print:rounded-none print:bg-transparent ${isNightMode ? 'bg-black text-red-600' : 'bg-white text-slate-800 shadow-lg'}`}>
              <div id="print-schedule-table" className="block print:block overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                <thead className={`print:bg-slate-200 print:text-black ${isNightMode ? 'bg-black border-red-900 text-red-600' : 'bg-sky-900 border-sky-800 text-white'}`}>
                  <tr>
                    <th className={`px-4 py-3 border whitespace-nowrap w-24 sticky-date-column ${isNightMode ? 'border-red-900 bg-black' : 'border-sky-800 bg-sky-900'} print:border-slate-400 print:static`}>Data</th>
                    {schedule[0]?.slots.map((slot, i) => (
                      <th key={i} className={`px-4 py-3 border text-center min-w-[140px] ${isNightMode ? 'border-red-900' : 'border-sky-800'} print:border-slate-400`}>
                        <div className="font-bold">{slot.start} - {slot.end}</div>
                        <div className={`text-xs font-normal mt-0.5 ${isNightMode ? 'text-red-800' : 'text-sky-200'} print:text-slate-600`}>Osoby: {slot.reqCrew}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((daySchedule, dayIndex) => (
                    <ScheduleTableRow
                      key={dayIndex}
                      daySchedule={daySchedule}
                      dayIndex={dayIndex}
                      startDate={startDate}
                      isNightMode={isNightMode}
                      isReadOnly={isReadOnly}
                      draggedItem={draggedItem}
                      onDragStart={handleDragStart}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      t={t}
                      userLocale={userLocale}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && isGenerated && crewStats.length > 0 && (
          <div className={`p-6 rounded-xl shadow-sm border print:hidden ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}>
            <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
              <Icon name="Shield" className="w-5 h-5" /> <span>{t('heading.summaryAndExport', userLocale)}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {crewStats.map(c => {
                const normalizedRole = (c.role || '').toLowerCase();
                const isExcluded = normalizedRole === 'cook' || (normalizedRole === 'captain' && !captainParticipates);
                return (
                  <div key={c.id} className={`p-4 rounded-lg border flex justify-between items-center ${isNightMode ? 'bg-black border-red-900' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <div className="font-bold flex items-center space-x-2">
                        <span className={`${isNightMode ? '' : 'text-slate-800'} ${isExcluded ? 'line-through opacity-50' : ''}`}>{c.name}</span>
                        {normalizedRole === 'cook' && <Icon name="ChefHat" className="w-4 h-4 text-emerald-500" />}
                        {normalizedRole === 'captain' && !captainParticipates && <Icon name="Shield" className="w-4 h-4 text-amber-500" />}
                      </div>
                      {!isExcluded ? (
                        <div className={`text-xs mt-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}>
                          Godzin: <span className={`font-semibold ${isNightMode ? 'text-red-400' : 'text-slate-800'}`}>{c.totalHours}h</span> |
                          Trudne wachty: <span className={`font-semibold ${isNightMode ? 'text-red-400' : 'text-slate-800'}`}>{c.hardWatches}</span>
                        </div>
                      ) : (
                        <div className={`text-xs mt-1 ${isNightMode ? 'text-red-800' : 'text-slate-500'}`}>{t('label.exemptFromWatches', userLocale)}</div>
                      )}
                    </div>
                    {!isExcluded && (
                      <button
                        onClick={() => downloadICS(c)} title="Pobierz kalendarz do telefonu"
                        className={`p-2 rounded-full transition ${isNightMode ? 'bg-red-900 text-black hover:bg-red-800' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}
                      >
                        <Icon name="Download" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gantt Chart View */}
        {activeTab === 'gantt' && isGenerated && schedule.length > 0 && (
          <div className={`p-6 rounded-xl shadow-sm border ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}>
            <h2 className={`text-2xl font-bold mb-6 flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
              <Icon name="BarChart3" className="w-6 h-6" />
              <span>{t('heading.ganttChart', userLocale)}</span>
            </h2>

            {(() => {
              // Compute crew members once for all days
              const allCrewMembers = [...new Set(schedule.flatMap(day =>
                day.slots.flatMap(slot => slot.assigned.map(p => p.name))
              ))];

              return schedule.map((daySchedule, dayIndex) => {
                const dayDate = new Date(startDate);
                dayDate.setDate(dayDate.getDate() + dayIndex);

                return (
                  <div key={dayIndex} className="mb-8 last:mb-0">
                    {/* Day header */}
                    <div className={`mb-3 pb-2 border-b-2 ${isNightMode ? 'border-red-900' : 'border-slate-300'}`}>
                      <h3 className={`text-lg font-bold ${isNightMode ? 'text-red-400' : 'text-sky-800'}`}>
                        {t('common.day', userLocale)} {daySchedule.day}
                        <span className={`ml-2 text-sm font-normal ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}>
                          ({dayDate.toLocaleDateString(userLocale, {weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'})})
                        </span>
                      </h3>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[800px]">
                        {/* Time axis */}
                        <div className="flex mb-4">
                          <div className={`w-32 font-bold text-sm ${isNightMode ? 'text-red-700' : 'text-slate-600'}`}>{t('label.crewMember', userLocale)}</div>
                          <div className="flex-1 flex border-l border-r" style={{borderColor: isNightMode ? '#7f1d1d' : '#cbd5e1'}}>
                            {Array.from({length: 24}, (_, hour) => (
                              <div key={hour} className={`flex-1 text-center text-xs border-r ${isNightMode ? 'border-red-900/30 text-red-800' : 'border-slate-200 text-slate-500'}`}>
                                {String(hour).padStart(2, '0')}:00
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Crew rows with watches */}
                        {allCrewMembers.map(crewName => (
                          <div key={crewName} className="mb-2">
                            <div className="flex items-stretch">
                              <div className={`w-32 font-medium text-sm flex items-center ${isNightMode ? 'text-red-400' : 'text-slate-700'}`}>
                                {crewName}
                              </div>
                              <div className="flex-1 relative h-8 border-l border-r" style={{borderColor: isNightMode ? '#7f1d1d' : '#cbd5e1'}}>
                                {/* 24-hour grid lines */}
                                {Array.from({length: 24}, (_, i) => (
                                  <div key={i} className="absolute h-full border-r" style={{
                                    left: `${(i / 24) * 100}%`,
                                    borderColor: isNightMode ? '#7f1d1d33' : '#e2e8f0'
                                  }}></div>
                                ))}

                                {/* Watch bars for current day */}
                                {daySchedule.slots.map((slot, idx) => {
                                  if (!slot.assigned.some(p => p.name === crewName)) return null;

                                  const [startH, startM] = slot.start.split(':').map(Number);
                                  const [endH, endM] = slot.end === '24:00' ? [24, 0] : slot.end.split(':').map(Number);
                                  const startPercent = ((startH + startM / 60) / 24) * 100;
                                  const endPercent = ((endH + endM / 60) / 24) * 100;
                                  const width = endPercent - startPercent;

                                  const colors = [
                                    {bg: isNightMode ? 'bg-blue-900' : 'bg-blue-500', text: 'text-white'},
                                    {bg: isNightMode ? 'bg-green-900' : 'bg-green-500', text: 'text-white'},
                                    {bg: isNightMode ? 'bg-purple-900' : 'bg-purple-500', text: 'text-white'},
                                    {bg: isNightMode ? 'bg-orange-900' : 'bg-orange-500', text: 'text-white'},
                                    {bg: isNightMode ? 'bg-pink-900' : 'bg-pink-500', text: 'text-white'},
                                    {bg: isNightMode ? 'bg-teal-900' : 'bg-teal-500', text: 'text-white'}
                                  ];
                                  const color = colors[idx % colors.length];

                                  return (
                                    <div
                                      key={idx}
                                      className={`absolute top-0 h-full ${color.bg} ${color.text} rounded px-1 text-xs flex items-center justify-center font-medium shadow`}
                                      style={{
                                        left: `${startPercent}%`,
                                        width: `${width}%`
                                      }}
                                      title={`${slot.start} - ${slot.end}`}
                                    >
                                      {width > 8 && `${slot.start}-${slot.end}`}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}

            <div className={`mt-6 p-4 rounded-lg ${isNightMode ? 'bg-black border border-red-900' : 'bg-slate-50 border border-slate-200'}`}>
              <p className={`text-sm font-medium ${isNightMode ? 'text-red-600' : 'text-slate-700'}`}>
                <strong>{t('label.info', userLocale)}:</strong> {t('msg.ganttInfo', userLocale)}
              </p>
            </div>
          </div>
        )}

        {/* Analytics Dashboard */}
        {activeTab === 'analytics' && isGenerated && crewStats.length > 0 && (
          <div className="space-y-6">
            <div className={`p-6 rounded-xl shadow-sm border ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}>
              <h2 className={`text-2xl font-bold mb-6 flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
                <Icon name="TrendingUp" className="w-6 h-6" />
                <span>{t('heading.analytics', userLocale)}</span>
              </h2>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-sky-50 border-sky-200'}`}>
                  <div className={`text-xs uppercase tracking-wider mb-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}>{t('analytics.totalWatches', userLocale)}</div>
                  <div className={`text-3xl font-bold ${isNightMode ? 'text-red-400' : 'text-sky-900'}`}>
                    {schedule.reduce((sum, day) => sum + day.slots.length, 0)}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className={`text-xs uppercase tracking-wider mb-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}>{t('analytics.activeCrew', userLocale)}</div>
                  <div className={`text-3xl font-bold ${isNightMode ? 'text-red-400' : 'text-emerald-900'}`}>
                    {crewStats.filter(c => {
                      const norm = (c.role || '').toLowerCase();
                      return norm !== 'cook' && !(norm === 'captain' && !captainParticipates);
                    }).length}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-purple-50 border-purple-200'}`}>
                  <div className={`text-xs uppercase tracking-wider mb-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}>{t('analytics.totalDays', userLocale)}</div>
                  <div className={`text-3xl font-bold ${isNightMode ? 'text-red-400' : 'text-purple-900'}`}>
                    {schedule.length}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-orange-50 border-orange-200'}`}>
                  <div className={`text-xs uppercase tracking-wider mb-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}>{t('analytics.avgHours', userLocale)}</div>
                  <div className={`text-3xl font-bold ${isNightMode ? 'text-red-400' : 'text-orange-900'}`}>
                    {(() => {
                      const activeStats = crewStats.filter(c => {
                        const norm = (c.role || '').toLowerCase();
                        return norm !== 'cook' && !(norm === 'captain' && !captainParticipates);
                      });
                      const avg = activeStats.reduce((sum, c) => sum + c.totalHours, 0) / activeStats.length;
                      return Math.round(avg * 10) / 10;
                    })()}h
                  </div>
                </div>
              </div>

              {/* Workload Distribution Chart */}
              <div className="mb-8">
                <h3 className={`text-lg font-bold mb-4 ${isNightMode ? 'text-red-500' : 'text-slate-900'}`}>{t('analytics.workloadDistribution', userLocale)}</h3>
                <div className="space-y-3">
                  {crewStats
                    .filter(c => {
                      const norm = (c.role || '').toLowerCase();
                      return norm !== 'cook' && !(norm === 'captain' && !captainParticipates);
                    })
                    .sort((a, b) => b.totalHours - a.totalHours)
                    .map((member, idx) => {
                      const maxHours = Math.max(...crewStats.map(c => c.totalHours));
                      const percentage = (member.totalHours / maxHours) * 100;

                      return (
                        <div key={member.id}>
                          <div className="flex justify-between mb-1">
                            <span className={`text-sm font-medium ${isNightMode ? 'text-red-400' : 'text-slate-700'}`}>
                              {idx + 1}. {member.name}
                            </span>
                            <span className={`text-sm font-bold ${isNightMode ? 'text-red-500' : 'text-slate-900'}`}>
                              {member.totalHours}h
                            </span>
                          </div>
                          <div className={`h-6 rounded-full overflow-hidden ${isNightMode ? 'bg-zinc-900' : 'bg-slate-200'}`}>
                            <div
                              className={`h-full transition-all duration-500 flex items-center justify-end pr-2 text-xs font-bold text-white ${
                                idx === 0 ? (isNightMode ? 'bg-red-700' : 'bg-sky-600') :
                                idx === 1 ? (isNightMode ? 'bg-red-600' : 'bg-sky-500') :
                                (isNightMode ? 'bg-red-800' : 'bg-sky-400')
                              }`}
                              style={{width: `${percentage}%`}}
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
                  <h3 className={`text-lg font-bold mb-4 flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-slate-900'}`}>
                    <span>🏆</span>
                    <span>{t('analytics.mostHours', userLocale)}</span>
                  </h3>
                  <div className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-gradient-to-br from-sky-50 to-emerald-50 border-sky-200'}`}>
                    {(() => {
                      const topByHours = [...crewStats]
                        .filter(c => {
                          const norm = (c.role || '').toLowerCase();
                          return norm !== 'cook' && !(norm === 'captain' && !captainParticipates);
                        })
                        .sort((a, b) => b.totalHours - a.totalHours)
                        .slice(0, 3);

                      return topByHours.map((member, idx) => (
                        <div key={member.id} className={`flex items-center justify-between py-2 ${idx > 0 ? 'border-t' : ''}`} style={{borderColor: isNightMode ? '#7f1d1d33' : '#e2e8f033'}}>
                          <div className="flex items-center space-x-3">
                            <span className={`text-2xl font-bold ${isNightMode ? 'text-red-700' : 'text-slate-400'}`}>
                              {idx + 1}
                            </span>
                            <span className={`font-bold ${isNightMode ? 'text-red-400' : 'text-slate-900'}`}>
                              {member.name}
                            </span>
                          </div>
                          <span className={`text-xl font-bold ${isNightMode ? 'text-red-500' : 'text-sky-600'}`}>
                            {member.totalHours}h
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div>
                  <h3 className={`text-lg font-bold mb-4 flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-slate-900'}`}>
                    <span>🌙</span>
                    <span>{t('analytics.mostNightWatches', userLocale)}</span>
                  </h3>
                  <div className={`p-4 rounded-lg border ${isNightMode ? 'bg-black border-red-900' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'}`}>
                    {(() => {
                      const topByNight = [...crewStats]
                        .filter(c => {
                          const norm = (c.role || '').toLowerCase();
                          return norm !== 'cook' && !(norm === 'captain' && !captainParticipates);
                        })
                        .sort((a, b) => b.hardWatches - a.hardWatches)
                        .slice(0, 3);

                      return topByNight.map((member, idx) => (
                        <div key={member.id} className={`flex items-center justify-between py-2 ${idx > 0 ? 'border-t' : ''}`} style={{borderColor: isNightMode ? '#7f1d1d33' : '#e2e8f033'}}>
                          <div className="flex items-center space-x-3">
                            <span className={`text-2xl font-bold ${isNightMode ? 'text-red-700' : 'text-slate-400'}`}>
                              {idx + 1}
                            </span>
                            <span className={`font-bold ${isNightMode ? 'text-red-400' : 'text-slate-900'}`}>
                              {member.name}
                            </span>
                          </div>
                          <span className={`text-xl font-bold ${isNightMode ? 'text-red-500' : 'text-purple-600'}`}>
                            {member.hardWatches}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {showQRModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 print:hidden"
          onClick={() => setShowQRModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
              setShowQRModal(false);
            }
          }}
        >
          <div
            className={`rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 ${isNightMode ? 'bg-zinc-950 border border-red-900' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
            tabIndex="-1"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 id="qr-modal-title" className={`text-xl font-bold ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
                Udostępnij przez QR kod
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className={`p-3 min-h-[44px] min-w-[44px] rounded-full transition ${isNightMode ? 'hover:bg-red-950 text-red-500' : 'hover:bg-slate-100 text-slate-500'}`}
                aria-label="Zamknij okno (Escape)"
                autoFocus
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {qrError ? (
              <div className={`p-4 rounded-lg mb-4 text-center ${isNightMode ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <p className="text-sm font-medium">{qrError}</p>
              </div>
            ) : (
              <div className={`flex justify-center items-center p-4 rounded-lg mb-4 ${isNightMode ? 'bg-black' : 'bg-slate-50'}`}>
                <div ref={qrCodeRef} className="flex justify-center"></div>
              </div>
            )}
            <p className={`text-sm text-center ${isNightMode ? 'text-red-700' : 'text-slate-600'}`}>
              {qrError ? 'Użyj przycisku "Udostępnij" aby skopiować link do schowka.' : 'Zeskanuj ten kod QR, aby udostępnić swój grafik wacht'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
