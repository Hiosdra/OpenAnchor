// Slim rendering component — all logic lives in ./hooks/*
import React, { useMemo, useEffect } from 'react';
import { t } from './constants';
import { Icon } from './components/Icon';
import { SettingsBar } from './components/SettingsBar';
import { HelpPanel } from './components/HelpPanel';
import { CrewPanel } from './components/CrewPanel';
import { WatchSlotsPanel } from './components/WatchSlotsPanel';
import { LiveDashboard } from './components/LiveDashboard';
import { ScheduleTable } from './components/ScheduleTable';
import { GanttChart } from './components/GanttChart';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { QRModal } from './components/QRModal';
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
  const {
    isNightMode,
    setIsNightMode,
    toggleNightMode,
    notificationsEnabled,
    toggleNotifications,
    userLocale,
    toggleLanguage,
    activeTab,
    setActiveTab,
  } = settings;

  const crewMgmt = useCrewManagement();
  const {
    crew,
    setCrew,
    newCrewName,
    setNewCrewName,
    newCrewRole,
    setNewCrewRole,
    captainParticipates,
    setCaptainParticipates,
    activeCrew,
    recommendations,
    addCrew,
    removeCrew,
  } = crewMgmt;

  const watchSlots = useWatchSlots(userLocale);
  const {
    slots,
    setSlots,
    addSlot,
    removeSlot,
    updateSlot,
    applyDogWatches: applyDogWatchesRaw,
    applyTemplate: applyTemplateRaw,
    getCoverage,
  } = watchSlots;

  const engine = useScheduleEngine(crew, slots, captainParticipates);
  const {
    schedule,
    setSchedule,
    isGenerated,
    setIsGenerated,
    days,
    setDays,
    startDate,
    setStartDate,
    currentTime,
    dashboardData,
    crewStats,
  } = engine;

  const persistenceSetters = useMemo(
    () => ({
      setCrew,
      setSlots,
      setSchedule,
      setIsGenerated,
      setDays,
      setStartDate,
      setIsNightMode,
      setCaptainParticipates,
      setActiveTab,
    }),
    [
      setCrew,
      setSlots,
      setSchedule,
      setIsGenerated,
      setDays,
      setStartDate,
      setIsNightMode,
      setCaptainParticipates,
      setActiveTab,
    ],
  );

  const appState = useMemo(
    () => ({
      crew,
      slots,
      days,
      startDate,
      schedule,
      isGenerated,
      isNightMode,
      captainParticipates,
    }),
    [crew, slots, days, startDate, schedule, isGenerated, isNightMode, captainParticipates],
  );

  const { isLoaded, isReadOnly } = usePersistence(appState, persistenceSetters);

  const undoRedoSetters = useMemo(
    () => ({ setCrew, setSlots, setSchedule, setIsGenerated }),
    [setCrew, setSlots, setSchedule, setIsGenerated],
  );
  const undoRedoState = useMemo(() => ({ crew, slots, schedule }), [crew, slots, schedule]);
  const { undo, redo, canUndo, canRedo } = useUndoRedo(
    undoRedoState,
    undoRedoSetters,
    isLoaded,
    isReadOnly,
  );

  const { draggedItem, handleDragStart, handleDrop, handleDragOver } = useDragDrop(
    schedule,
    setSchedule,
  );

  const exportSetters = useMemo(
    () => ({ setCrew, setSlots, setCaptainParticipates, setSchedule, setIsGenerated }),
    [setCrew, setSlots, setCaptainParticipates, setSchedule, setIsGenerated],
  );
  const exportShare = useExportShare(
    appState,
    dashboardData,
    crewStats,
    userLocale,
    isReadOnly,
    exportSetters,
  );
  const {
    copyStatus,
    toastType,
    showQRModal,
    setShowQRModal,
    qrError,
    qrCodeRef,
    downloadICS,
    handlePrint,
    handleExportPDF,
    handleExportConfig,
    handleImportConfig,
    handleShare,
    handleShowQR,
    showToast,
  } = exportShare;

  const applyDogWatches = () => applyDogWatchesRaw(userLocale, showToast);

  const applyTemplate = (templateKey: string) => {
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
    activeTab,
    canUndo,
    canRedo,
    isReadOnly,
    showQRModal,
    undo,
    redo,
    generateSchedule,
    handlePrint,
    setShowQRModal,
  });

  if (!isLoaded) return null;

  return (
    <div
      className={`min-h-screen font-sans pb-10 transition-colors duration-300 print:text-black print:bg-white ${isNightMode ? 'bg-black text-red-600' : 'text-slate-100'}`}
      data-night-mode={isNightMode}
    >
      {/* Skip to main content link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Przejdź do głównej treści
      </a>

      <SettingsBar
        isNightMode={isNightMode}
        setIsNightMode={setIsNightMode}
        userLocale={userLocale}
        toggleLanguage={toggleLanguage}
        isReadOnly={isReadOnly}
        canUndo={canUndo}
        canRedo={canRedo}
        undo={undo}
        redo={redo}
        handleShowQR={handleShowQR}
        handleShare={handleShare}
        handleExportConfig={handleExportConfig}
        handleImportConfig={handleImportConfig}
        handleExportPDF={handleExportPDF}
        handlePrint={handlePrint}
      />

      {/* Toast notification for user feedback */}
      {copyStatus && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 print:hidden">
          <div
            className={`rounded-lg p-3 px-4 flex items-center space-x-2 shadow-lg ${
              toastType === 'error'
                ? isNightMode
                  ? 'bg-red-950 border border-red-900 text-red-400'
                  : 'bg-red-50 border border-red-500 text-red-800'
                : isNightMode
                  ? 'bg-green-950 border border-green-900 text-green-400'
                  : 'bg-green-50 border border-green-500 text-green-800'
            }`}
          >
            <Icon name={toastType === 'error' ? 'XCircle' : 'CheckCircle'} className="w-5 h-5" />
            <span className="font-medium">{copyStatus}</span>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className={`max-w-7xl mx-auto px-4 mt-4 print:hidden`}>
          <div
            className={`rounded-lg p-3 flex items-center space-x-2 ${isNightMode ? 'bg-orange-950 border border-orange-900 text-orange-400' : 'bg-orange-50 border border-orange-200 text-orange-800'}`}
          >
            <Icon name="Shield" className="w-5 h-5" />
            <span className="font-medium">Tryb tylko do odczytu - edycja jest wyłączona</span>
          </div>
        </div>
      )}

      <div
        className={`max-w-7xl mx-auto px-2 sm:px-4 mt-4 sm:mt-6 print:hidden ${isNightMode ? '' : 'bg-white/80 backdrop-blur-sm rounded-xl py-2'}`}
      >
        <div
          className={`flex p-1 space-x-0.5 sm:space-x-1 rounded-xl w-full sm:w-max overflow-x-auto ${isNightMode ? 'bg-zinc-900' : 'bg-slate-200'}`}
        >
          {!isReadOnly && (
            <button
              onClick={() => setActiveTab('setup')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'setup' ? (isNightMode ? 'bg-black text-red-500 shadow-sm shadow-red-900/20' : 'bg-white text-sky-900 shadow-sm') : isNightMode ? 'text-red-800 hover:text-red-500 hover:bg-black/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
            >
              <Icon name="Settings" className="w-4 h-4" />
              <span>{t('tab.setup', userLocale)}</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('schedule')}
            disabled={!isGenerated}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${!isGenerated ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'schedule' ? (isNightMode ? 'bg-black text-red-500 shadow-sm shadow-red-900/20' : 'bg-white text-sky-900 shadow-sm') : isNightMode ? 'text-red-800 hover:text-red-500 hover:bg-black/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
          >
            <Icon name="CalendarDays" className="w-4 h-4" />
            <span>{t('tab.schedule', userLocale)}</span>
          </button>
          <button
            onClick={() => setActiveTab('gantt')}
            disabled={!isGenerated}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${!isGenerated ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'gantt' ? (isNightMode ? 'bg-black text-red-500 shadow-sm shadow-red-900/20' : 'bg-white text-sky-900 shadow-sm') : isNightMode ? 'text-red-800 hover:text-red-500 hover:bg-black/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
          >
            <Icon name="BarChart3" className="w-4 h-4" />
            <span>{t('tab.gantt', userLocale)}</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            disabled={!isGenerated}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${!isGenerated ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'analytics' ? (isNightMode ? 'bg-black text-red-500 shadow-sm shadow-red-900/20' : 'bg-white text-sky-900 shadow-sm') : isNightMode ? 'text-red-800 hover:text-red-500 hover:bg-black/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
          >
            <Icon name="TrendingUp" className="w-4 h-4" />
            <span>{t('tab.analytics', userLocale)}</span>
          </button>
        </div>
      </div>

      <main
        id="main-content"
        className="max-w-7xl mx-auto px-2 sm:px-4 mt-2 space-y-4 sm:space-y-6 pb-8 sm:pb-10"
      >
        {activeTab === 'schedule' && isGenerated && dashboardData && (
          <LiveDashboard
            isNightMode={isNightMode}
            userLocale={userLocale}
            dashboardData={dashboardData}
            currentTime={currentTime}
            notificationsEnabled={notificationsEnabled}
            toggleNotifications={toggleNotifications}
          />
        )}

        {activeTab === 'setup' && (
          <>
            <HelpPanel isNightMode={isNightMode} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 print:hidden">
              <CrewPanel
                isNightMode={isNightMode}
                userLocale={userLocale}
                crew={crew}
                newCrewName={newCrewName}
                setNewCrewName={setNewCrewName}
                newCrewRole={newCrewRole}
                setNewCrewRole={setNewCrewRole}
                captainParticipates={captainParticipates}
                setCaptainParticipates={setCaptainParticipates}
                recommendations={recommendations}
                addCrew={addCrew}
                removeCrew={removeCrew}
                startDate={startDate}
                setStartDate={setStartDate}
                days={days}
                setDays={setDays}
              />

              <WatchSlotsPanel
                isNightMode={isNightMode}
                userLocale={userLocale}
                slots={slots}
                recommendations={recommendations}
                addSlot={addSlot}
                removeSlot={removeSlot}
                updateSlot={updateSlot}
                applyDogWatches={applyDogWatches}
                applyTemplate={applyTemplate}
                getCoverage={getCoverage}
              />
            </div>

            <div className="flex justify-center py-6 print:hidden">
              <button
                onClick={generateSchedule}
                className={`flex items-center space-x-2 px-8 py-3 rounded-full text-lg font-bold shadow-lg transition-all transform hover:-translate-y-0.5 border ${isNightMode ? 'bg-red-900 hover:bg-red-800 border-red-700 text-black shadow-red-900/20' : 'bg-sky-600 hover:bg-sky-700 border-sky-600 text-white shadow-sky-900/20'}`}
              >
                <Icon name="RefreshCw" className="w-6 h-6" />{' '}
                <span>{t('btn.generate', userLocale)}</span>
              </button>
            </div>
          </>
        )}

        {isGenerated && schedule.length > 0 && (
          <div style={{ display: activeTab === 'schedule' ? undefined : 'none' }}>
            <ScheduleTable
              isNightMode={isNightMode}
              userLocale={userLocale}
              schedule={schedule}
              startDate={startDate}
              isReadOnly={isReadOnly}
              draggedItem={draggedItem}
              handleDragStart={handleDragStart}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              crewStats={activeTab === 'schedule' ? crewStats : []}
              captainParticipates={captainParticipates}
              downloadICS={downloadICS}
            />
          </div>
        )}

        {/* Gantt Chart View */}
        {activeTab === 'gantt' && isGenerated && schedule.length > 0 && (
          <GanttChart
            isNightMode={isNightMode}
            userLocale={userLocale}
            schedule={schedule}
            startDate={startDate}
          />
        )}

        {/* Analytics Dashboard */}
        {activeTab === 'analytics' && isGenerated && crewStats.length > 0 && (
          <AnalyticsPanel
            isNightMode={isNightMode}
            userLocale={userLocale}
            schedule={schedule}
            crewStats={crewStats}
            captainParticipates={captainParticipates}
          />
        )}
      </main>

      <QRModal
        isNightMode={isNightMode}
        showQRModal={showQRModal}
        setShowQRModal={setShowQRModal}
        qrError={qrError}
        qrCodeRef={qrCodeRef}
      />
    </div>
  );
}

export default App;
