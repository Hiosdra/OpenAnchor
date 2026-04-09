import React, { useState } from 'react';
import type { ChecklistType } from '../data';
import { checklistData } from '../data';
import {
  checklistStorageKey,
  isValidChecklistType,
  STORAGE_KEYS,
  crewLabel,
} from '../storage-keys';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ChecklistItem } from './ChecklistItem';
import { TypeSelector } from './TypeSelector';
import { ResetButton } from './ResetButton';

const checklistOptions = [
  {
    value: 'morning' as ChecklistType,
    emoji: '🌅',
    label: 'Codziennie rano',
    sublabel: 'Poranne czynności',
  },
  {
    value: 'departure' as ChecklistType,
    emoji: '⚓',
    label: 'Wyjście z portu',
    sublabel: 'Przed wypłynięciem',
  },
  {
    value: 'mooring' as ChecklistType,
    emoji: '🛟',
    label: 'Cumowanie',
    sublabel: 'Wejście do portu',
  },
  {
    value: 'grabbag' as ChecklistType,
    emoji: '🎒',
    label: 'Grab bag',
    sublabel: 'Torba ratunkowa',
  },
];

export function ChecklistsSection() {
  const [checklistType, setChecklistType] = useLocalStorage<ChecklistType>(
    STORAGE_KEYS.CHECKLIST_TYPE,
    'morning',
    isValidChecklistType,
  );
  const [resetKey, setResetKey] = useState(0);

  const section = checklistData[checklistType];

  const handleReset = () => {
    section.items.forEach((item) => {
      localStorage.removeItem(checklistStorageKey(checklistType, item.id));
    });
    setResetKey((k) => k + 1);
  };

  return (
    <>
      <TypeSelector
        options={checklistOptions}
        current={checklistType}
        onChange={setChecklistType}
      />

      <div className="section-card">
        <h2 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
          <span className="category-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="20"
              height="20"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </span>
          {section.title}
        </h2>

        <ul className="list-none p-0 m-0" key={`${checklistType}-${resetKey}`}>
          {section.items.map((item) => (
            <ChecklistItem
              key={item.id}
              itemId={item.id}
              text={item.text}
              storageKey={checklistStorageKey(checklistType, item.id)}
              crewPrefix={crewLabel(item.crew)}
            />
          ))}
        </ul>

        <ResetButton
          label="Wyczyść obecną checklistę"
          confirmMessage="Czy na pewno chcesz wyczyścić obecną checklistę?"
          onReset={handleReset}
        />
      </div>
    </>
  );
}
