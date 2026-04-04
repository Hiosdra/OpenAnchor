/**
 * Anchor module — Overlay templates
 *
 * Full-screen overlays: Simple Monitor (night view) and Onboarding wizard.
 */

export function simpleMonitorHTML(): string {
  return `
<div id="simple-monitor-overlay" class="fixed inset-0 z-[5500] hidden flex-col simple-monitor-bg-safe">
    <div class="flex-grow flex flex-col items-center justify-center p-8 text-center select-none" id="simple-monitor-touch">
        <div id="sm-alarm-label" class="text-lg font-bold uppercase tracking-widest mb-2 text-green-500">SAFE</div>

        <div id="sm-gps-lost" class="text-red-500 text-sm font-bold mb-2 hidden" data-i18n="smGpsLost">UTRATA GPS!</div>

        <div class="mb-1">
            <span id="sm-distance" class="text-[120px] leading-none font-bold tabular-nums text-green-500">--</span>
        </div>
        <div id="sm-unit-label" class="text-xl text-slate-500 font-medium mb-6" data-i18n="smUnit">metrów</div>

        <div class="flex gap-8 mb-6">
            <div class="text-center">
                <div id="sm-sog" class="text-3xl font-bold text-blue-400 tabular-nums">0.0</div>
                <div class="text-xs text-slate-500">SOG (kn)</div>
            </div>
            <div class="text-center">
                <div id="sm-cog" class="text-3xl font-bold text-blue-400 tabular-nums">---</div>
                <div class="text-xs text-slate-500">COG</div>
            </div>
        </div>

        <div class="text-xs text-slate-600 mb-8">
            GPS: <span id="sm-accuracy">--</span> <span class="sm-unit">m</span>
        </div>

        <button id="sm-dismiss-alarm" class="w-full max-w-xs py-4 rounded-2xl text-lg font-bold bg-red-600 text-white hidden mb-4" data-i18n="muteAlarm">Wycisz Alarm</button>
    </div>

    <div class="p-4 bg-black/50 flex justify-between items-center">
        <button id="sm-close-btn" class="text-slate-400 font-medium text-sm px-4 py-2 bg-slate-800 rounded-xl border border-slate-700">
            <i data-lucide="map" class="w-4 h-4 inline mr-1"></i> <span data-i18n="smMap">Mapa</span>
        </button>
        <div id="sm-time" class="text-slate-500 text-sm font-mono"></div>
        <button id="sm-toggle-nightred" class="text-slate-400 font-medium text-sm px-4 py-2 bg-slate-800 rounded-xl border border-slate-700">
            <i data-lucide="sun-dim" class="w-4 h-4 inline mr-1"></i> <span data-i18n="smRedFilter">Czerwony</span>
        </button>
    </div>
</div>`;
}

export function onboardingHTML(): string {
  return `
<div id="onboarding-overlay" class="fixed inset-0 bg-slate-900 z-[6000] hidden flex-col">
    <div class="flex-grow relative overflow-hidden">
        <div class="onboarding-step absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-300 opacity-100 z-10">
            <i data-lucide="anchor" class="w-24 h-24 text-blue-500 mb-6"></i>
            <h2 class="text-3xl font-bold text-white mb-4" data-i18n="obWelcome">Witaj na pokładzie!</h2>
            <p class="text-slate-300 text-sm leading-relaxed max-w-sm" data-i18n="obWelcomeBody">Alert Kotwiczny to Twoja osobista wachta nawigacyjna. Zobacz jak to działa, by bezpiecznie spać na kotwicy.</p>
        </div>
        <div class="onboarding-step absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-300 opacity-0 z-0 pointer-events-none">
            <i data-lucide="crosshair" class="w-20 h-20 text-green-500 mb-6"></i>
            <h2 class="text-2xl font-bold text-white mb-4" data-i18n="obZone">Ustaw Strefę</h2>
            <p class="text-slate-300 text-sm leading-relaxed max-w-sm" data-i18n="obZoneBody">Dostosuj bezpieczny promień. Naciśnij "Rzuć Kotwicę", a aplikacja zacznie monitorować dryf jachtu ostrzegając Cię o jego pełzaniu.</p>
        </div>
        <div class="onboarding-step absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-300 opacity-0 z-0 pointer-events-none">
            <i data-lucide="battery-warning" class="w-20 h-20 text-orange-500 mb-6"></i>
            <h2 class="text-2xl font-bold text-white mb-4" data-i18n="obRules">Ważne zasady!</h2>
            <p class="text-slate-300 text-sm leading-relaxed max-w-sm" data-i18n-html="obRulesBody">Telefony usypiają aplikacje w tle. <strong>Nie blokuj ekranu!</strong> Nasz system zapobiega wygaszaniu, ale dla pewności użyj <strong>Trybu Nocnego</strong> i <strong>podłącz ładowarkę</strong>.</p>
        </div>
        <div class="onboarding-step absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-300 opacity-0 z-0 pointer-events-none">
            <i data-lucide="smartphone" class="w-20 h-20 text-purple-400 mb-6"></i>
            <h2 class="text-2xl font-bold text-white mb-4" data-i18n="obExpand">Rozbuduj System</h2>
            <p class="text-slate-300 text-sm leading-relaxed max-w-sm" data-i18n="obExpandBody">Używaj narzędzi takich jak AI Asystent, Harmonogram Wacht czy połączenie WebSocket z zapasowym telefonem z Androidem. Pomyślnych wiatrów!</p>
        </div>
    </div>
    <div class="p-6 bg-slate-800 border-t border-slate-700 flex justify-between items-center">
        <button id="ob-skip-btn" class="text-slate-400 font-medium text-sm px-4 py-2 hover:text-white transition-colors" data-i18n="obSkip">Pomiń</button>
        <div class="flex gap-2" id="ob-dots">
            <span class="w-2 h-2 rounded-full bg-blue-500 transition-colors duration-300"></span>
            <span class="w-2 h-2 rounded-full bg-slate-600 transition-colors duration-300"></span>
            <span class="w-2 h-2 rounded-full bg-slate-600 transition-colors duration-300"></span>
            <span class="w-2 h-2 rounded-full bg-slate-600 transition-colors duration-300"></span>
        </div>
        <button id="ob-next-btn" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl transition-colors">Dalej</button>
    </div>
</div>`;
}
