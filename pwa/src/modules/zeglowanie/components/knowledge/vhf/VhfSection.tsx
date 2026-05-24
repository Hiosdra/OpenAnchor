import { vhfGroups } from '../../../data/vhf-data';

export default function VhfSection() {
  return (
    <div className="space-y-4">
      <div className="section-card">
        <h2 className="text-lg font-bold text-blue-300 flex items-center gap-2 mb-4">
          <span>📻</span>
          Kanały VHF – Polskie wybrzeże
        </h2>

        <div className="space-y-5">
          {vhfGroups.map((group) => (
            <div key={group.label}>
              <div className="text-[0.7rem] uppercase tracking-wider text-white/30 font-semibold mb-2 flex items-center gap-1.5">
                <span>{group.icon}</span>
                {group.label}
              </div>
              <div className="space-y-1.5">
                {group.channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-white/5 border border-white/5"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-white/80">{ch.name}</span>
                      {ch.note && (
                        <span className="text-[0.7rem] text-white/40">{ch.note}</span>
                      )}
                    </div>
                    <span className="text-sm font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 whitespace-nowrap flex-shrink-0">
                      {ch.channels}
                    </span>
                  </div>
                ))}
              </div>
              {group.footnotes && group.footnotes.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {group.footnotes.map((note, i) => (
                    <p key={i} className="text-[0.65rem] text-white/30 italic">
                      {note}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
