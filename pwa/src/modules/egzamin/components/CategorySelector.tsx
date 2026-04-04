import React from 'react';
import type { CategoryInfo } from '../types';
import { getCategoryColors } from '../constants';

interface CategorySelectorProps {
  categories: Record<string, CategoryInfo>;
  selectedCategories: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function CategorySelector({ categories, selectedCategories, onToggle, onSelectAll, onDeselectAll }: CategorySelectorProps) {
  return (
    <div className="space-y-2 mb-4">
      <div className="flex gap-2 mb-2">
        <button onClick={onSelectAll} className="text-sm text-amber-400 hover:text-amber-300">Zaznacz wszystkie</button>
        <span className="text-sm text-white/20">|</span>
        <button onClick={onDeselectAll} className="text-sm text-white/40 hover:text-white/60">Odznacz</button>
      </div>
      {Object.values(categories).map(cat => {
        const colors = getCategoryColors(cat.color);
        const isSelected = selectedCategories.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
              isSelected ? 'bg-white/10 border-white/20' : 'bg-white/3 border-white/5 opacity-50'
            }`}
          >
            <span style={{
              width: 20, height: 20, borderRadius: 6,
              background: isSelected ? colors.dot : 'transparent',
              border: `2px solid ${isSelected ? colors.dot : 'rgba(255,255,255,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: 'white', fontWeight: 'bold'
            }}>
              {isSelected ? '\u2713' : ''}
            </span>
            <span className="text-base">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
