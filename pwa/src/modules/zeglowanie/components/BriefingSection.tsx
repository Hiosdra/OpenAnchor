import React, { useState } from 'react';
import type { BriefingType } from '../data';
import { briefingLists } from '../data';
import { briefingStorageKey, isValidBriefingType, STORAGE_KEYS } from '../storage-keys';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ChecklistItem } from './ChecklistItem';
import { TypeSelector } from './TypeSelector';
import { ResetButton } from './ResetButton';

const briefingOptions = [
  { value: 'zero' as BriefingType, emoji: '🎓', label: 'Briefing zerowy', sublabel: 'Przed rejsem' },
  { value: 'first-day' as BriefingType, emoji: '⚓', label: 'Briefing pierwszy dzień', sublabel: 'Pierwszy dzień' },
];

interface BriefingListProps {
  type: BriefingType;
  title: string;
  emoji: string;
  instruction: string;
  resetKey: number;
  onReset: () => void;
}

function BriefingList({ type, title, emoji, instruction, resetKey, onReset }: BriefingListProps) {
  const items = briefingLists[type];
  return (
    <div className="section-card">
      <h2 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
        <span className="category-icon">{emoji}</span>
        {title}
      </h2>

      <div className="important-note">
        <strong>📋 Instrukcja:</strong> {instruction}
      </div>

      <ul className="list-none p-0 m-0" key={resetKey}>
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            itemId={item.id}
            text={item.text}
            storageKey={briefingStorageKey(type, item.id)}
            isHtml
          />
        ))}
      </ul>

      <ResetButton
        label="Wyczyść checklistę"
        confirmMessage="Czy na pewno chcesz wyczyścić checklistę briefingu?"
        onReset={onReset}
      />
    </div>
  );
}

export function BriefingSection() {
  const [briefingType, setBriefingType] = useLocalStorage<BriefingType>(
    STORAGE_KEYS.BRIEFING_TYPE, 'zero', isValidBriefingType
  );
  const [resetKeys, setResetKeys] = useState({ zero: 0, 'first-day': 0 });

  const handleReset = (type: BriefingType) => {
    briefingLists[type].forEach((item) => {
      localStorage.removeItem(briefingStorageKey(type, item.id));
    });
    setResetKeys((prev) => ({ ...prev, [type]: prev[type] + 1 }));
  };

  return (
    <>
      <TypeSelector options={briefingOptions} current={briefingType} onChange={setBriefingType} />

      <div style={{ display: briefingType === 'zero' ? 'block' : 'none' }}>
        <BriefingList
          type="zero"
          title="Briefing zerowy - Checklista dla prowadzącego"
          emoji="🎓"
          instruction="Zaznaczaj kolejne tematy podczas przeprowadzania briefingu dla nowej załogi przed rejsem."
          resetKey={resetKeys.zero}
          onReset={() => handleReset('zero')}
        />
      </div>

      <div style={{ display: briefingType === 'first-day' ? 'block' : 'none' }}>
        <BriefingList
          type="first-day"
          title="Briefing pierwszy dzień - Checklista dla prowadzącego"
          emoji="⚓"
          instruction="Zaznaczaj kolejne tematy podczas przeprowadzania briefingu pierwszego dnia na wodzie."
          resetKey={resetKeys['first-day']}
          onReset={() => handleReset('first-day')}
        />
      </div>
    </>
  );
}
