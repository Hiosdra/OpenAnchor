/**
 * Anchor module — Layout templates
 *
 * Structural UI sections: connection banner, background effects,
 * header bar, navigation dashboard, map widget, and alarm indicators.
 */

export function connectionBannerHTML(): string {
  return `
<div id="ws-connection-banner" class="hidden fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center text-xs py-1 px-4 font-bold transition-all">
    ⚠ Połączenie utracone — próba ponownego połączenia...
</div>`;
}

export function backgroundHTML(): string {
  return `
<div class="ocean-bg">
    <div class="wave wave-1"></div>
    <div class="wave wave-2"></div>
    <div class="wave wave-3"></div>
</div>
<div class="stars"></div>`;
}

export function headerHTML(): string {
  return `
<header class="oa-header">
    <a href="../../index.html" title="OpenAnchor Superapp" class="oa-back-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        <span>Menu</span>
    </a>
    <h1 class="oa-header-title" data-i18n="appTitle">Alert Kotwiczny</h1>
    <div class="flex items-center gap-2 sm:gap-3">
        <span id="connection-status" class="connection-status" role="status" aria-live="polite">
            <span class="connection-status__dot"></span>
            <span id="connection-status-text">Online</span>
        </span>
        <button id="night-mode-btn" class="oa-settings-btn" data-i18n-title="nightMode" title="Tryb nocny" aria-label="Tryb nocny">
            <i data-lucide="moon" class="w-4 sm:w-5 h-4 sm:h-5"></i>
        </button>
        <button id="unit-toggle" class="bg-slate-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-bold text-slate-300 border border-slate-600" data-i18n="unitMeters">
            METRY
        </button>
        <button id="lang-toggle" class="bg-slate-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold text-slate-300 border border-slate-600" title="Language / Język">
            EN
        </button>
        <div class="flex items-center gap-1 sm:gap-1.5 bg-slate-900 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-slate-700">
            <i data-lucide="smartphone" id="ws-status-icon" class="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-600" data-i18n-title="wsStatus" title="Status połączenia z Androidem"></i>
            <span id="peer-battery" class="text-[10px] text-slate-500 hidden" data-i18n-title="peerBatteryTitle" title="Bateria telefonu Android">--</span>
            <div id="gps-status" class="flex items-center gap-0.5 sm:gap-1 text-xs text-yellow-500 ml-0.5 sm:ml-1">
                <i data-lucide="satellite" class="w-3 sm:w-3.5 h-3 sm:h-3.5"></i>
                <span id="gps-status-text" data-i18n="gpsSearching">Szukam...</span>
            </div>
            <span id="battery-saver-badge" class="hidden text-[9px] bg-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded-full ml-1">🔋 Eco</span>
        </div>
    </div>
</header>`;
}

export function dashboardHTML(): string {
  return `
<div class="grid grid-cols-4 bg-slate-800 border-b border-slate-700 divide-x divide-slate-700 text-center z-20 shadow-lg" role="region" aria-label="Navigation metrics" aria-live="polite">
    <div class="p-1.5 sm:p-2">
        <div class="text-[9px] sm:text-[10px] text-slate-400 uppercase" data-i18n="dashDistance">Dystans</div>
        <div class="font-mono font-bold text-lg sm:text-xl text-white" id="val-dist">--</div>
    </div>
    <div class="p-1.5 sm:p-2">
        <div class="text-[9px] sm:text-[10px] text-slate-400 uppercase">SOG <span class="text-[7px] sm:text-[8px]" data-i18n="dashSog">(węzły)</span></div>
        <div class="font-mono font-bold text-lg sm:text-xl text-blue-400" id="val-sog">0.0</div>
    </div>
    <div class="p-1.5 sm:p-2">
        <div class="text-[9px] sm:text-[10px] text-slate-400 uppercase">COG <span class="text-[7px] sm:text-[8px]" data-i18n="dashCogUnit">(st)</span></div>
        <div class="font-mono font-bold text-lg sm:text-xl text-blue-400" id="val-cog">---</div>
    </div>
    <div class="p-1.5 sm:p-2">
        <div class="text-[9px] sm:text-[10px] text-slate-400 uppercase" data-i18n="dashGpsAcc">Dokł GPS</div>
        <div class="font-mono font-bold text-lg sm:text-xl text-slate-300" id="val-acc">--</div>
    </div>
</div>`;
}

export function peerDriftBannerHTML(): string {
  return `
<div id="peer-drift-banner" class="hidden bg-red-900/90 border-b border-red-700 px-3 py-1.5 text-xs text-red-200 flex items-center gap-2 z-20">
    <i data-lucide="alert-triangle" class="w-4 h-4 text-red-400 flex-shrink-0"></i>
    <span id="peer-drift-text" data-i18n="peerDriftDefault">Android: dryf kotwicy wykryty!</span>
</div>`;
}

export function mapWidgetHTML(): string {
  return `
<div id="map" class="flex-grow w-full relative min-h-[200px] max-h-[50vh]" role="application" aria-label="Anchor position map">
    <div id="no-signal-overlay" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-[1000]">
        <i data-lucide="map-pin-off" class="w-10 h-10 text-slate-500 mb-2"></i>
        <p class="text-slate-400 text-sm font-medium" data-i18n="noGpsSignal">Brak sygnału GPS</p>
    </div>

    <div id="active-watch-banner" class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600/90 backdrop-blur-sm text-white text-xs font-bold py-1.5 px-4 rounded-full shadow-lg hidden z-[1000] flex items-center gap-2 border border-indigo-400 transition-all">
        <i data-lucide="user" class="w-3.5 h-3.5"></i>
        <span data-i18n="watchLabel">Wachta:</span> <span id="active-watch-name">--</span>
    </div>

    <button id="toggle-map-layer-btn" class="absolute top-4 right-4 bg-slate-800 p-2.5 rounded-full shadow-lg border border-slate-600 z-[1000] text-slate-300 hover:text-white transition-colors" data-i18n-title="changeMap" title="Zmień mapę" aria-label="Toggle map layer">
        <i data-lucide="layers"></i>
    </button>

    <button id="center-map-btn" class="absolute bottom-4 right-4 bg-slate-800 p-3 rounded-full shadow-lg border border-slate-600 z-[1000] text-blue-400 hidden" aria-label="Center map on anchor position">
        <i data-lucide="crosshair"></i>
    </button>
</div>`;
}

export function alarmStateBarHTML(): string {
  return `
<div id="alarm-state-bar" class="w-full py-1 text-center text-xs font-bold uppercase tracking-widest z-20 hidden transition-all" role="alert" aria-live="assertive">
    <span id="alarm-state-text"></span>
</div>

<div id="sr-alarm-announce" class="sr-only" aria-live="assertive" aria-atomic="true"></div>`;
}
