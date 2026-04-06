import React from 'react';

interface PlaceholderSectionProps {
  emoji: string;
  title: string;
  description: string;
}

export function PlaceholderSection({ emoji, title, description }: PlaceholderSectionProps) {
  return (
    <div className="placeholder-section">
      <div className="text-5xl mb-4 opacity-50">{emoji}</div>
      <h3 className="placeholder-section-title">{title}</h3>
      <p className="text-[0.9rem] leading-[1.6]" dangerouslySetInnerHTML={{ __html: description }} />
    </div>
  );
}
