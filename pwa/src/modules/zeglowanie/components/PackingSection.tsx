import React, { useState } from 'react';
import type { CruiseType } from '../data';
import { packingLists } from '../data';
import { packingStorageKey, isValidCruiseType, STORAGE_KEYS } from '../storage-keys';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ChecklistItem } from './ChecklistItem';
import { TypeSelector } from './TypeSelector';
import { ResetButton } from './ResetButton';

const cruiseOptions = [
  { value: 'baltic-autumn' as CruiseType, emoji: '🍂', label: 'Bałtyk', sublabel: 'Rejs jesienny' },
  { value: 'croatia-summer' as CruiseType, emoji: '☀️', label: 'Chorwacja', sublabel: 'Rejs wakacyjny' },
];

export function PackingSection() {
  const [cruiseType, setCruiseType] = useLocalStorage<CruiseType>(
    STORAGE_KEYS.CRUISE_TYPE, 'baltic-autumn', isValidCruiseType
  );
  const [resetKey, setResetKey] = useState(0);

  const items = packingLists[cruiseType];

  const handleReset = () => {
    items.forEach((item) => {
      localStorage.removeItem(packingStorageKey(cruiseType, item.id));
    });
    setResetKey((k) => k + 1);
  };

  return (
    <>
      <TypeSelector options={cruiseOptions} current={cruiseType} onChange={setCruiseType} />

      <div className="section-card">
        <h2 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
          <span className="category-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </span>
          Co spakować na rejs?
        </h2>

        <div className="important-note">
          <strong>⚓ Ważne:</strong> Wszystko spakowane w miękką, składaną do płaskiego torbę/plecak - na łódce nie ma miejsca gdzie trzymać twarde lub trzymające kształt torby.
        </div>

        <ul className="list-none p-0 m-0" key={`${cruiseType}-${resetKey}`}>
          {items.map((item) => (
            <ChecklistItem
              key={item.id}
              itemId={item.id}
              text={item.text}
              storageKey={packingStorageKey(cruiseType, item.id)}
              isHtml
            />
          ))}
        </ul>

        <ResetButton
          label="Wyczyść obecną listę"
          confirmMessage="Czy na pewno chcesz wyczyścić obecną listę?"
          onReset={handleReset}
        />
      </div>
    </>
  );
}
