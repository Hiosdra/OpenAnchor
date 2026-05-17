import React, { Suspense, useState } from 'react';
import { shipLightProfiles, type ShipType } from '../../../data/ship-lights-data';

const ShipLightsViewer3D = React.lazy(() => import('./ShipLightsViewer3D'));

interface ShipGroup {
  label: string;
  icon: string;
  types: ShipType[];
}

const shipGroups: ShipGroup[] = [
  {
    label: 'W drodze',
    icon: '📍',
    types: [
      'power-under-50m',
      'power-over-50m',
      'sailing',
      'sailing-tricolor',
      'sailing-motor',
      'hovercraft',
    ],
  },
  {
    label: 'Rybackie',
    icon: '🐟',
    types: ['fishing-trawling', 'fishing-not-trawling'],
  },
  {
    label: 'Holowanie',
    icon: '🔗',
    types: ['towing-under-200m', 'towing-over-200m', 'towed-object'],
  },
  {
    label: 'Postój',
    icon: '⚓',
    types: ['at-anchor-under-50m', 'at-anchor-over-50m', 'aground'],
  },
  {
    label: 'Specjalne',
    icon: '⚠️',
    types: [
      'not-under-command',
      'restricted-maneuver',
      'constrained-by-draft',
      'mine-clearance',
      'pilot-vessel',
    ],
  },
];

function getProfile(type: ShipType) {
  return shipLightProfiles.find((p) => p.type === type)!;
}

function getLightColorDot(color: string) {
  const map: Record<string, string> = {
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#eab308',
    white: '#ffffff',
    blue: '#3b82f6',
  };
  return map[color] ?? '#ffffff';
}

export default function ShipLightsSection() {
  const [shipType, setShipType] = useState<ShipType>('power-under-50m');
  const [isNight, setIsNight] = useState(true);

  const profile = getProfile(shipType);

  return (
    <div>
      {/* Grouped ship type selector */}
      <div className="space-y-3 mb-6">
        {shipGroups.map((group) => (
          <div key={group.label}>
            <div className="text-[0.7rem] uppercase tracking-wider text-white/30 font-semibold mb-1.5 flex items-center gap-1.5">
              <span>{group.icon}</span>
              {group.label}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {group.types.map((type) => {
                const p = getProfile(type);
                const isActive = type === shipType;
                return (
                  <button
                    key={type}
                    onClick={() => setShipType(type)}
                    className={`px-2.5 py-1.5 rounded-lg text-[0.75rem] font-medium transition-all border
                      ${
                        isActive
                          ? 'bg-blue-500/20 border-blue-400/40 text-blue-200 shadow-[0_0_8px_rgba(59,130,246,0.15)]'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70'
                      }`}
                  >
                    <span className="mr-1">{p.emoji}</span>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="section-card relative overflow-hidden">
        {/* Header + toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-blue-300 flex items-center gap-2">
            <span>{profile.emoji}</span>
            {profile.name}
          </h2>
          <button
            onClick={() => setIsNight(!isNight)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all
              bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
          >
            {isNight ? '🌙 Noc' : '☀️ Dzień'}
          </button>
        </div>

        {/* 3D Viewer */}
        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#050a18] border border-white/5">
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/30 text-sm">Ładowanie 3D...</div>
              </div>
            }
          >
            <ShipLightsViewer3D profile={profile} isNight={isNight} />
          </Suspense>
        </div>

        {/* COLREG reference + description */}
        <div className="mt-4 flex items-start gap-3">
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[0.7rem] font-mono whitespace-nowrap border border-blue-500/20">
            {profile.colreg}
          </span>
          <p className="text-sm text-white/60 leading-relaxed">{profile.description}</p>
        </div>

        {/* Notes */}
        {profile.notes && profile.notes.length > 0 && (
          <div className="important-note mt-4">
            <strong>📋 Ważne:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              {profile.notes.map((note, i) => (
                <li key={i} className="text-sm">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Light Legend */}
        {isNight && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {profile.lights.map((light) => (
              <div
                key={light.id}
                className="flex items-center gap-2 p-2 rounded-md bg-white/5 border border-white/5"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: getLightColorDot(light.color),
                    boxShadow: `0 0 6px ${getLightColorDot(light.color)}`,
                  }}
                />
                <div>
                  <div className="text-xs font-semibold text-white/80">{light.name}</div>
                  <div className="text-[0.7rem] text-white/40">
                    {light.arcDeg >= 360 ? '360° dookoła' : `${light.arcDeg}°`}
                    {light.flashing ? ' · błyskowe' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Day marks */}
        {!isNight && profile.dayMarks && profile.dayMarks.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {profile.dayMarks.map((mark) => (
              <div
                key={mark.id}
                className="flex items-center gap-2 p-2 rounded-md bg-white/5 border border-white/5"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-800 border border-white/20" />
                <div>
                  <div className="text-xs font-semibold text-white/80">{mark.name}</div>
                  <div className="text-[0.7rem] text-white/40">{mark.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
