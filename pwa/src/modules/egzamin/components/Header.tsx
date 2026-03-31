import React from 'react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightContent?: React.ReactNode;
}

export function Header({ title, onBack, rightContent }: HeaderProps) {
  const isMainMenu = !onBack;
  return (
    <div className="oa-header">
      {isMainMenu ? (
        <a href="../../index.html" className="oa-back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span>Menu</span>
        </a>
      ) : (
        <button
          onClick={onBack}
          className="oa-back-btn"
          aria-label="Wróć"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span>Wróć</span>
        </button>
      )}
      <h1 className="oa-header-title">{title}</h1>
      {rightContent || <div style={{width: '40px'}}></div>}
    </div>
  );
}
