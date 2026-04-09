import React from 'react';
import { CATEGORIES, getCategoryColors } from '../constants';

interface CategoryBadgeProps {
  categoryId: string;
}

export function CategoryBadge({ categoryId }: CategoryBadgeProps) {
  const cat = Object.values(CATEGORIES).find((c) => c.id === categoryId);
  if (!cat) return null;
  const colors = getCategoryColors(cat.color);
  return (
    <span
      className="inline-flex items-center gap-[0.3rem] text-xs font-semibold tracking-wider uppercase py-1 px-[0.6rem] rounded-full"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: colors.dot,
          display: 'inline-block',
        }}
      ></span>
      {cat.name}
    </span>
  );
}
