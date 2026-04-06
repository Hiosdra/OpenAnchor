import React from 'react';

export function Header() {
  return (
    <>
      <header className="oa-header">
        <a href={import.meta.env.BASE_URL || '/'} className="oa-back-btn" aria-label="Wróć do menu głównego">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span>Wróć</span>
        </a>
        <h1 className="oa-header-title">Informacje o Żeglarstwie</h1>
      </header>
      <div className="text-center px-4 pb-8">
        <p className="header-subtitle">Przygotowanie do rejsu morskiego</p>
      </div>
    </>
  );
}
