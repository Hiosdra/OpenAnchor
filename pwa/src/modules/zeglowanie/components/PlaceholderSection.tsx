import React from 'react';

interface PlaceholderSectionProps {
  emoji: string;
  title: string;
  description: string;
}

function renderDescription(description: string) {
  return description.split(/<br\s*\/?>/i).map((part, index) => (
    <React.Fragment key={index}>
      {index > 0 && <br />}
      {part}
    </React.Fragment>
  ));
}

export function PlaceholderSection({ emoji, title, description }: PlaceholderSectionProps) {
  return (
    <div className="placeholder-section">
      <div className="text-5xl mb-4 opacity-50">{emoji}</div>
      <h3 className="placeholder-section-title">{title}</h3>
      <p className="text-[0.9rem] leading-[1.6]">{renderDescription(description)}</p>
    </div>
  );
}
