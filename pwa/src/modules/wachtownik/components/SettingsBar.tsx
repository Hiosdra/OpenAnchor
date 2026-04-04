import React from 'react';
import { Icon } from './Icon';
import { Dropdown, DropdownItem } from './Dropdown';
import { t } from '../constants';
import type { Locale } from '../types';

interface SettingsBarProps {
  isNightMode: boolean;
  setIsNightMode: (v: boolean) => void;
  userLocale: Locale;
  toggleLanguage: () => void;
  isReadOnly: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  handleShowQR: () => void;
  handleShare: (readOnly: boolean) => void;
  handleExportConfig: () => void;
  handleImportConfig: () => void;
  handleExportPDF: () => void;
  handlePrint: () => void;
}

export function SettingsBar({
  isNightMode, setIsNightMode, userLocale, toggleLanguage,
  isReadOnly, canUndo, canRedo, undo, redo,
  handleShowQR, handleShare,
  handleExportConfig, handleImportConfig,
  handleExportPDF, handlePrint,
}: SettingsBarProps) {
  return (
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
  );
}
