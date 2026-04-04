/**
 * Anchor module — Controls panel template
 *
 * Radius slider, main action button, toolbar grid, and alarm mute button.
 */

export function controlsPanelHTML(): string {
  return `
<div class="w-full bg-slate-800 p-3 sm:p-4 rounded-t-3xl shadow-[0_-10px_15px_rgba(0,0,0,0.3)] border-t border-slate-700 z-20 relative">
    <div class="mb-3 sm:mb-4 max-w-md mx-auto">
        <div class="flex justify-between items-end mb-2">
            <label class="text-xs sm:text-sm text-slate-400 font-medium"><span data-i18n="safeRadius">Bezpieczny promień</span> <span id="sector-badge" class="ml-1 sm:ml-2 hidden text-[9px] sm:text-[10px] bg-blue-900 text-blue-300 px-1.5 sm:px-2 py-0.5 rounded-full" data-i18n="sectorBadge">SEKTOR</span></label>
            <div class="flex items-baseline gap-1">
                <input type="number" id="radius-number" value="50" min="10" max="1000" class="bg-slate-700 text-white font-mono text-lg sm:text-xl w-16 sm:w-20 text-right rounded p-1 outline-none focus:ring-2 ring-blue-500">
                <span class="text-slate-400 unit-label text-sm">m</span>
            </div>
        </div>
        <input type="range" id="radius-slider" min="10" max="500" value="50" step="5">
    </div>

    <div class="flex gap-2 max-w-md mx-auto">
        <button id="main-btn" class="flex-grow py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50" disabled>
            <i data-lucide="anchor" class="w-4 sm:w-5 h-4 sm:h-5"></i>
            <span id="main-btn-text" data-i18n="dropAnchor">Rzuć Kotwicę</span>
        </button>
        <button id="offset-btn" class="w-12 sm:w-14 py-2.5 sm:py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center bg-slate-700 border border-slate-600 text-slate-300 disabled:opacity-50" disabled data-i18n-title="offsetBack" title="Odłóż pozycję w tył" aria-label="Offset position backward">
            <i data-lucide="move-down-left" class="w-4 sm:w-5 h-4 sm:h-5"></i>
        </button>
    </div>

    ${toolbarGridHTML()}

    <button id="stop-alarm-btn" class="w-full max-w-md mx-auto py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white mt-2 sm:mt-3 hidden border border-slate-600">
        <i data-lucide="bell-off" class="w-4 sm:w-5 h-4 sm:h-5"></i>
        <span data-i18n="muteAlarm">Wycisz Alarm</span>
    </button>
</div>`;
}

function toolbarGridHTML(): string {
  return `
    <div class="grid grid-cols-4 gap-1.5 sm:gap-2 max-w-md mx-auto mt-2 sm:mt-3">
        <button data-modal="calc-modal" class="tool-btn py-1.5 sm:py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex flex-col items-center justify-center gap-0.5 sm:gap-1 border border-slate-600 transition-colors">
            <i data-lucide="ruler" class="w-3.5 sm:w-4 h-3.5 sm:h-4"></i><span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" data-i18n="toolChain">Łańcuch</span>
        </button>
        <button data-modal="sector-modal" class="tool-btn py-1.5 sm:py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex flex-col items-center justify-center gap-0.5 sm:gap-1 border border-slate-600 transition-colors">
            <i data-lucide="pie-chart" class="w-3.5 sm:w-4 h-3.5 sm:h-4"></i><span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" data-i18n="toolSector">Sektor</span>
        </button>
        <button data-modal="watch-setup-modal" class="tool-btn py-1.5 sm:py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex flex-col items-center justify-center gap-0.5 sm:gap-1 border border-slate-600 transition-colors relative">
            <i data-lucide="timer" class="w-3.5 sm:w-4 h-3.5 sm:h-4"></i><span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" data-i18n="toolWatch">Wachta</span>
            <span id="watch-badge" class="absolute top-1.5 right-2 w-2 h-2 bg-green-500 rounded-full hidden shadow-[0_0_5px_#22c55e]"></span>
        </button>
        <button id="open-weather-btn" class="tool-btn py-1.5 sm:py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex flex-col items-center justify-center gap-0.5 sm:gap-1 border border-slate-600 transition-colors">
            <i data-lucide="cloud-sun" class="w-3.5 sm:w-4 h-3.5 sm:h-4"></i><span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" data-i18n="toolWeather">Pogoda</span>
        </button>

        <button id="simple-monitor-btn" class="py-1.5 sm:py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex flex-col items-center justify-center gap-0.5 sm:gap-1 border border-slate-600 transition-colors">
            <i data-lucide="monitor" class="w-3.5 sm:w-4 h-3.5 sm:h-4"></i><span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" data-i18n="toolMonitor">Monitor</span>
        </button>
        <button data-modal="ws-sync-modal" class="tool-btn py-1.5 sm:py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex flex-col items-center justify-center gap-0.5 sm:gap-1 border border-slate-600 transition-colors">
            <i data-lucide="smartphone" class="w-3.5 sm:w-4 h-3.5 sm:h-4"></i><span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">Android</span>
        </button>
        <button id="open-history-btn" class="py-1.5 sm:py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex flex-col items-center justify-center gap-0.5 sm:gap-1 border border-slate-600 transition-colors">
            <i data-lucide="history" class="w-3.5 sm:w-4 h-3.5 sm:h-4"></i><span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" data-i18n="toolHistory">Historia</span>
        </button>
        <button id="open-ai-btn" class="py-1.5 sm:py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white flex flex-col items-center justify-center gap-0.5 sm:gap-1 border border-purple-500 transition-colors shadow-[0_0_10px_rgba(147,51,234,0.3)]">
            <i data-lucide="sparkles" class="w-3.5 sm:w-4 h-3.5 sm:h-4 text-purple-300"></i><span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" data-i18n="toolAssistant">Asystent</span>
        </button>

        <button id="share-pos-btn" class="py-1.5 sm:py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex flex-col items-center justify-center gap-0.5 sm:gap-1 border border-slate-600 transition-colors col-span-2">
            <i data-lucide="share-2" class="w-3.5 sm:w-4 h-3.5 sm:h-4"></i><span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" data-i18n="toolShare">Udostępnij Pozycję</span>
        </button>
        <button id="open-qr-scan-btn" class="py-1.5 sm:py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex flex-col items-center justify-center gap-0.5 sm:gap-1 border border-slate-600 transition-colors col-span-2">
            <i data-lucide="qr-code" class="w-3.5 sm:w-4 h-3.5 sm:h-4"></i><span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" data-i18n="toolQr">Skanuj QR</span>
        </button>
    </div>`;
}
