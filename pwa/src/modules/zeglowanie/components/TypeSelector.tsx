import React from 'react';

interface TypeOption<T extends string> {
  value: T;
  emoji: string;
  label: string;
  sublabel: string;
}

interface TypeSelectorProps<T extends string> {
  options: TypeOption<T>[];
  current: T;
  onChange: (value: T) => void;
}

export function TypeSelector<T extends string>({
  options,
  current,
  onChange,
}: TypeSelectorProps<T>) {
  return (
    <div className="flex gap-3 mb-6 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`cruise-btn${current === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          <div className="text-base font-bold mb-1">
            {opt.emoji} {opt.label}
          </div>
          <div className="text-[0.8rem] opacity-70">{opt.sublabel}</div>
        </button>
      ))}
    </div>
  );
}
