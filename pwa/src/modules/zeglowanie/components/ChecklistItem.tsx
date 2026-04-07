import React, { useState } from 'react';

interface ChecklistItemProps {
  itemId: string;
  text: string;
  storageKey: string;
  isHtml?: boolean;
  crewPrefix?: string;
}

export function ChecklistItem({
  itemId,
  text,
  storageKey,
  isHtml = false,
  crewPrefix,
}: ChecklistItemProps) {
  const [checked, setChecked] = useState(() => localStorage.getItem(storageKey) === 'true');

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    localStorage.setItem(storageKey, String(next));
  };

  return (
    <li
      className={`checklist-item${checked ? ' checked' : ''}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      tabIndex={0}
      role="checkbox"
      aria-checked={checked}
    >
      <div className={`checklist-checkbox${checked ? ' checked' : ''}`} />
      {isHtml ? (
        <div className="checklist-text" dangerouslySetInnerHTML={{ __html: text }} />
      ) : (
        <div className="checklist-text">
          {crewPrefix}
          {text}
        </div>
      )}
    </li>
  );
}
