/**
 * Anchor module — Modal dialog templates
 *
 * All modal/popup UI: tool modals, alert modals, AI modals, etc.
 * Each function returns the HTML string for one modal dialog,
 * preserving every id, class, data-* and aria attribute.
 */

export function allModalsHTML(): string {
  return [
    dragWarningModalHTML(),
    watchSetupModalHTML(),
    watchAlertModalHTML(),
    calcModalHTML(),
    sectorModalHTML(),
    offsetModalHTML(),
    batteryModalHTML(),
    warningModalHTML(),
    wsSyncModalHTML(),
    apiKeyModalHTML(),
    aiModalHTML(),
    aiSummaryModalHTML(),
    gpsLostModalHTML(),
    historyModalHTML(),
    statsModalHTML(),
    replayModalHTML(),
    weatherModalHTML(),
    qrScanModalHTML(),
  ].join('\n');
}

function dragWarningModalHTML(): string {
  return `
<div id="drag-warning-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[4000] hidden p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="drag-warning-title">
    <div class="bg-slate-800 p-4 sm:p-6 rounded-2xl max-w-sm w-full border-2 border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.3)]">
        <h3 id="drag-warning-title" class="text-lg sm:text-xl font-bold text-orange-500 mb-2 flex items-center gap-2"><i data-lucide="alert-circle"></i> <span data-i18n="dragTitle">Uwaga: Pełzanie?</span></h3>
        <p class="text-slate-300 text-sm mb-4 sm:mb-6 leading-relaxed" data-i18n="dragBody">Algorytm wykrył, że jacht powoli, ale stabilnie oddala się od środka. Sprawdź, czy kotwica nie pełznie!</p>
        <div class="flex gap-2 sm:gap-3">
            <button class="modal-close-btn flex-1 bg-slate-700 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base border border-slate-600" data-i18n="dragIgnore">Zignoruj</button>
            <button id="check-drag-btn" class="flex-1 bg-orange-600 hover:bg-orange-500 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-white transition-colors" data-i18n="dragCheck">Sprawdzę to</button>
        </div>
    </div>
</div>`;
}

function watchSetupModalHTML(): string {
  return `
<div id="watch-setup-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="watch-setup-title">
    <div class="bg-slate-800 p-5 rounded-2xl max-w-sm w-full border border-slate-700 flex flex-col max-h-[90vh]">
        <h3 id="watch-setup-title" class="text-xl font-bold text-white mb-4 flex items-center gap-2"><i data-lucide="clipboard-list" class="text-blue-400"></i> <span data-i18n="watchTitle">System Wacht</span></h3>
        <div class="overflow-y-auto flex-grow space-y-4 pr-1">
            <div class="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <h4 class="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2"><i data-lucide="timer" class="w-4 h-4 text-blue-400"></i> <span data-i18n="watchTimer">Minutnik</span></h4>
                <div class="flex gap-2">
                    <input type="number" id="watch-minutes-input" value="10" min="1" max="120" class="w-16 bg-slate-700 text-white p-2 rounded-lg border border-slate-600 outline-none text-center font-mono">
                    <button id="start-watch-btn" class="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-bold text-white text-sm">Start</button>
                    <button id="cancel-watch-btn" class="bg-slate-700 hover:bg-slate-600 py-2 px-3 rounded-lg font-bold border border-slate-600 text-sm">Stop</button>
                </div>
            </div>
            <div class="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <h4 class="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2"><i data-lucide="calendar-clock" class="w-4 h-4 text-purple-400"></i> <span data-i18n="watchSchedule">Grafik Wacht</span></h4>
                <div class="flex gap-1 mb-2">
                    <input type="time" id="schedule-start" class="w-[30%] bg-slate-700 text-white p-1.5 rounded border border-slate-600 text-xs outline-none">
                    <input type="time" id="schedule-end" class="w-[30%] bg-slate-700 text-white p-1.5 rounded border border-slate-600 text-xs outline-none">
                    <input type="text" id="schedule-name" data-i18n-placeholder="watchName" placeholder="Imię" class="w-[40%] bg-slate-700 text-white p-1.5 rounded border border-slate-600 text-xs outline-none">
                </div>
                <button id="add-schedule-btn" class="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-bold border border-slate-600 text-xs mb-3 text-slate-200"><i data-lucide="plus" class="w-3.5 h-3.5 inline"></i> <span data-i18n="watchAdd">Dodaj</span></button>
                <div id="schedule-list" class="space-y-1.5 max-h-32 overflow-y-auto"></div>
            </div>
        </div>
        <button class="modal-close-btn w-full bg-slate-700 hover:bg-slate-600 py-3 mt-4 rounded-xl font-bold border border-slate-600" data-i18n="btnClose">Zamknij</button>
    </div>
</div>`;
}

function watchAlertModalHTML(): string {
  return `
<div id="watch-alert-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[5000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="watch-alert-title">
    <div class="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border-2 border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.3)] text-center">
        <i data-lucide="timer" class="w-16 h-16 text-blue-500 mx-auto mb-4 animate-bounce"></i>
        <h3 id="watch-alert-title" class="text-2xl font-bold text-white mb-2" data-i18n="watchAlertTitle">Czas na wachtę!</h3>
        <p class="text-slate-300 text-sm mb-6 leading-relaxed" data-i18n="watchAlertBody">Sprawdź pozycję jachtu na mapie.</p>
        <button id="watch-alert-ok-btn" class="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white" data-i18n="watchAlertOk">Wszystko OK (Resetuj)</button>
    </div>
</div>`;
}

function calcModalHTML(): string {
  return `
<div id="calc-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="calc-title">
    <div class="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-slate-700">
        <h3 id="calc-title" class="text-xl font-bold text-white mb-4 flex items-center gap-2"><i data-lucide="ruler" class="text-blue-400"></i> <span data-i18n="calcTitle">Kalkulator</span></h3>
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div><label class="block text-slate-300 text-xs mb-1"><span data-i18n="calcDepth">Głębokość + Dziób</span> (<span class="unit-label">m</span>)</label><input type="number" id="calc-depth" value="5" class="w-full bg-slate-700 text-white p-2 rounded-lg border border-slate-600 outline-none"></div>
            <div><label class="block text-slate-300 text-xs mb-1" data-i18n="calcMulti">Mnożnik</label><select id="calc-ratio" class="w-full bg-slate-700 text-white p-2.5 rounded-lg border border-slate-600 outline-none"><option value="3">3:1</option><option value="5" selected>5:1</option><option value="7">7:1</option></select></div>
        </div>
        <div class="bg-slate-900 p-3 rounded-xl mb-4 text-center border border-slate-700"><div class="text-slate-400 text-xs" data-i18n="calcResult">Bezpieczny promień (catenary):</div><div class="text-2xl font-bold text-blue-400"><span id="calc-chain-result">25</span> <span class="unit-label text-sm">m</span></div><div class="text-[10px] text-slate-500 mt-1">sqrt(L²-D²) + 20% marginesu</div></div>
        <div class="flex gap-3"><button class="modal-close-btn flex-1 bg-slate-700 py-3 rounded-xl font-bold border border-slate-600" data-i18n="btnClose">Zamknij</button><button id="apply-calc-btn" class="flex-1 bg-blue-600 py-3 rounded-xl font-bold" data-i18n="btnApply">Zastosuj</button></div>
    </div>
</div>`;
}

function sectorModalHTML(): string {
  return `
<div id="sector-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="sector-title">
    <div class="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-slate-700">
        <h3 id="sector-title" class="text-xl font-bold text-white mb-4 flex items-center gap-2"><i data-lucide="pie-chart" class="text-blue-400"></i> <span data-i18n="sectorTitle">Sektor</span></h3>
        <label class="flex items-center gap-3 bg-slate-700 p-3 rounded-xl mb-4 border border-slate-600 cursor-pointer"><input type="checkbox" id="sector-enable" class="w-5 h-5 accent-blue-500 rounded"><span class="text-white font-medium" data-i18n="sectorEnable">Aktywuj Sektor</span></label>
        <div class="grid grid-cols-2 gap-4 mb-6 opacity-50 transition-opacity" id="sector-inputs">
            <div><label class="block text-slate-300 text-xs mb-1" data-i18n="sectorCenter">Centrum (st)</label><input type="number" id="sector-bearing" value="0" min="0" max="360" class="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-600 outline-none"></div>
            <div><label class="block text-slate-300 text-xs mb-1" data-i18n="sectorWidth">Szerokość (st)</label><input type="number" id="sector-width" value="90" min="10" max="360" class="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-600 outline-none"></div>
        </div>
        <div class="flex gap-3"><button class="modal-close-btn flex-1 bg-slate-700 py-3 rounded-xl font-bold border border-slate-600" data-i18n="btnCancel">Anuluj</button><button id="save-sector-btn" class="flex-1 bg-blue-600 py-3 rounded-xl font-bold" data-i18n="btnSave">Zapisz</button></div>
    </div>
</div>`;
}

function offsetModalHTML(): string {
  return `
<div id="offset-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="offset-title">
    <div class="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-slate-700">
        <h3 id="offset-title" class="text-xl font-bold text-white mb-4 flex items-center gap-2"><i data-lucide="move-down-left" class="text-blue-400"></i> <span data-i18n="offsetTitle">Rzut wsteczny</span></h3>
        <div class="mb-4"><label class="block text-slate-300 text-sm mb-1"><span data-i18n="offsetDist">Dystans</span> (<span class="unit-label">m</span>)</label><input type="number" id="offset-dist" value="30" class="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 outline-none"></div>
        <div class="mb-6"><label class="block text-slate-300 text-sm mb-1" data-i18n="offsetBearing">Namiar (st)</label><div class="flex gap-2"><input type="number" id="offset-bearing" value="0" class="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 outline-none"><button id="set-bearing-behind-btn" class="bg-slate-600 px-3 rounded-lg text-xs font-bold text-slate-300" data-i18n="offsetBehind">Z tyłu</button></div></div>
        <div class="flex gap-3"><button class="modal-close-btn flex-1 bg-slate-700 py-3 rounded-xl font-bold border border-slate-600" data-i18n="btnCancel">Anuluj</button><button id="confirm-offset-btn" class="flex-1 bg-blue-600 py-3 rounded-xl font-bold" data-i18n="btnSet">Ustaw</button></div>
    </div>
</div>`;
}

function batteryModalHTML(): string {
  return `
<div id="battery-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[3000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="battery-title">
    <div class="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border-2 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]">
        <h3 id="battery-title" class="text-xl font-bold text-red-500 mb-2 flex items-center gap-2"><i data-lucide="battery-warning"></i> <span data-i18n="battLowTitle">Niski stan baterii!</span></h3>
        <p class="text-slate-300 text-sm mb-6 leading-relaxed" data-i18n="battLowBody">Poziom naładowania spadł poniżej 15%. <strong>Podłącz ładowanie</strong>!</p>
        <button class="modal-close-btn w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-bold text-white" data-i18n="btnUnderstood">Zrozumiałem</button>
    </div>
</div>`;
}

function warningModalHTML(): string {
  return `
<div id="warning-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="warning-title">
    <div class="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-slate-700">
        <h3 class="text-xl font-bold text-white mb-2 flex items-center gap-2" id="warning-title"><i data-lucide="alert-triangle" class="text-yellow-500"></i> <span data-i18n="infoTitle">Informacja</span></h3>
        <p class="text-slate-300 text-sm mb-6 leading-relaxed" id="warning-text"></p>
        <button class="modal-close-btn w-full bg-blue-600 py-3 rounded-xl font-bold" data-i18n="btnUnderstood">Zrozumiałem</button>
    </div>
</div>`;
}

function wsSyncModalHTML(): string {
  return `
<div id="ws-sync-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[4000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="ws-sync-title">
    <div class="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
        <h3 id="ws-sync-title" class="text-xl font-bold text-white mb-2 flex items-center gap-2"><i data-lucide="smartphone" class="text-blue-400"></i> <span data-i18n="wsTitle">Zewnętrzny Monitor</span></h3>
        <p class="text-slate-300 text-xs mb-4" data-i18n="wsDesc">Połącz się z telefonem z Androidem w koi przez lokalne Wi-Fi (Hotspot), aby działał jako zapasowy alarm.</p>
        <label class="block text-slate-300 text-xs mb-1" data-i18n="wsInputLabel">Adres IP z aplikacji Android (WebSocket)</label>
        <input type="text" id="ws-url-input" placeholder="ws://192.168.43.1:8080" class="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 outline-none mb-4 font-mono text-sm">
        <div class="flex gap-3">
            <button id="ws-disconnect-btn" class="flex-1 bg-red-900/50 hover:bg-red-900 text-red-300 py-3 rounded-xl font-bold border border-red-800 transition-colors" data-i18n="btnDisconnect">Rozłącz</button>
            <button id="ws-connect-btn" class="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white transition-colors" data-i18n="btnConnect">Połącz</button>
        </div>
        <button class="modal-close-btn w-full mt-3 bg-slate-700 py-2 rounded-xl text-sm font-bold border border-slate-600" data-i18n="wsCloseWindow">Zamknij okno</button>
    </div>
</div>`;
}

function apiKeyModalHTML(): string {
  return `
<div id="api-key-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[4000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="api-key-title">
    <div class="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
        <h3 id="api-key-title" class="text-xl font-bold text-white mb-2 flex items-center gap-2"><i data-lucide="key" class="text-purple-400"></i> <span data-i18n="apiTitle">Klucz API</span></h3>
        <p class="text-slate-300 text-sm mb-3" data-i18n="apiDesc">Podaj darmowy klucz API od Google AI Studio.</p>
        <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-4">
            <p class="text-slate-400 text-xs mb-2 font-bold" data-i18n="apiHow">Jak uzyskać klucz API:</p>
            <ol class="text-slate-400 text-xs space-y-1 list-decimal list-inside">
                <li><span data-i18n="apiStep1">Otwórz</span> <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">Google AI Studio</a></li>
                <li data-i18n="apiStep2">Zaloguj się kontem Google</li>
                <li data-i18n="apiStep3">Kliknij "Get API key" lub "Create API key"</li>
                <li data-i18n="apiStep4">Skopiuj wygenerowany klucz i wklej poniżej</li>
            </ol>
        </div>
        <input type="password" id="api-key-input" placeholder="AIzaSy..." class="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 outline-none mb-4 font-mono text-sm">
        <div class="flex gap-3"><button class="modal-close-btn flex-1 bg-slate-700 py-3 rounded-xl font-bold" data-i18n="btnCancel">Anuluj</button><button id="save-api-key-btn" class="flex-1 bg-purple-600 py-3 rounded-xl font-bold text-white" data-i18n="btnSave">Zapisz</button></div>
        <button id="clear-api-key-btn" class="w-full mt-3 text-xs text-red-400 underline hidden" data-i18n="apiDelete">Usuń zapisany klucz</button>
    </div>
</div>`;
}

function aiModalHTML(): string {
  return `
<div id="ai-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[3000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title">
    <div class="bg-slate-800 p-5 rounded-2xl max-w-sm w-full border border-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.3)] flex flex-col max-h-[90vh]">
        <div class="flex justify-between items-start mb-2">
            <h3 id="ai-modal-title" class="text-xl font-bold text-white flex items-center gap-2"><i data-lucide="sparkles" class="text-purple-400"></i> <span data-i18n="aiTitle">AI Asystent</span></h3>
            <div class="flex items-center gap-2">
                <button id="ai-clear-chat-btn" class="text-slate-500 hover:text-red-400 transition-colors hidden" title="Clear chat"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                <button id="edit-api-key-btn" class="text-slate-400"><i data-lucide="key" class="w-5 h-5"></i></button>
            </div>
        </div>

        <div id="ai-context-badge" class="hidden mb-2 text-[10px] bg-purple-900/50 text-purple-300 px-2 py-1 rounded-lg flex items-center gap-1">
            <i data-lucide="anchor" class="w-3 h-3"></i> <span data-i18n="aiContextActive">Kontekst sesji aktywny</span>
        </div>

        <div id="ai-chat-area" class="flex-grow overflow-y-auto mb-3 space-y-2 min-h-[120px] max-h-[45vh]">
            <div id="ai-chat-placeholder" class="text-slate-500 text-xs text-center py-6">
                <i data-lucide="message-circle" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                <p data-i18n="aiChatPlaceholder">Zadaj pytanie o kotwiczeniu...</p>
            </div>
        </div>

        <details id="ai-form-details" class="mb-3">
            <summary class="text-xs text-slate-400 cursor-pointer hover:text-slate-300 flex items-center gap-1 mb-2"><i data-lucide="settings-2" class="w-3 h-3"></i> <span data-i18n="aiFormToggle">Parametry kotwicowiska</span></summary>
            <div id="ai-form" class="space-y-2">
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-slate-300 text-[10px] mb-0.5" data-i18n="aiDepth">Głębokość (m)</label><input type="number" id="ai-depth" value="5" min="1" class="w-full bg-slate-700 text-white p-1.5 rounded-lg outline-none text-sm"></div>
                    <div><label class="block text-slate-300 text-[10px] mb-0.5" data-i18n="aiChain">Łańcuch (m)</label><input type="number" id="ai-chain" value="25" min="1" class="w-full bg-slate-700 text-white p-1.5 rounded-lg outline-none text-sm"></div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-slate-300 text-[10px] mb-0.5" data-i18n="aiWind">Wiatr (w)</label><input type="number" id="ai-wind" value="15" min="0" class="w-full bg-slate-700 text-white p-1.5 rounded-lg outline-none text-sm"></div>
                    <div><label class="block text-slate-300 text-[10px] mb-0.5" data-i18n="aiBottom">Rodzaj dna</label><select id="ai-bottom" class="w-full bg-slate-700 text-white p-2 rounded-lg outline-none text-sm"><option data-i18n="aiSand">Piasek</option><option data-i18n="aiMud">Muł</option><option data-i18n="aiRocks">Skały</option><option data-i18n="aiSeaweed">Wodorosty</option><option data-i18n="aiCite">Glina</option></select></div>
                </div>
            </div>
        </details>

        <div class="flex gap-2 shrink-0">
            <input type="text" id="ai-chat-input" class="flex-grow bg-slate-700 text-white p-2.5 rounded-xl outline-none text-sm border border-slate-600 focus:border-purple-500" data-i18n-placeholder="aiInputPlaceholder" placeholder="Zapytaj eksperta...">
            <button id="ai-ask-btn" class="bg-purple-600 hover:bg-purple-500 px-4 rounded-xl font-bold text-white transition-colors shrink-0 flex items-center justify-center">
                <i data-lucide="send" class="w-4 h-4"></i>
            </button>
        </div>
        <div class="text-[10px] text-blue-400 mt-1.5 flex items-center gap-1"><i data-lucide="cloud-lightning" class="w-3 h-3"></i> <span data-i18n="aiInfo">Oceniane uwzględniając prognozę z nadchodzącą falą.</span></div>
        <button class="modal-close-btn w-full bg-slate-700 py-2.5 rounded-xl font-bold shrink-0 mt-2 text-sm" data-i18n="btnClose">Zamknij</button>
    </div>
</div>`;
}

function aiSummaryModalHTML(): string {
  return `
<div id="ai-summary-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[3000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="ai-summary-title">
    <div class="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
        <h3 id="ai-summary-title" class="text-xl font-bold text-white mb-4 flex items-center gap-2"><i data-lucide="book-open" class="text-blue-400"></i> <span data-i18n="logTitle">Dziennik Pokładowy</span></h3>
        <div id="ai-summary-loader" class="flex flex-col items-center justify-center text-blue-400 py-6 gap-3"><i data-lucide="loader-2" class="animate-spin w-8 h-8"></i><span class="text-sm" data-i18n="logWriting">Pisanie...</span></div>
        <div id="ai-summary-content" class="hidden space-y-3">
            <div id="ai-summary-summary" class="text-white text-sm font-bold border-l-4 border-blue-500 pl-3 py-1"></div>
            <div id="ai-summary-log" class="text-slate-200 text-sm leading-relaxed italic bg-slate-900/50 p-3 rounded-lg"></div>
            <div id="ai-summary-safety" class="text-xs flex items-start gap-2 bg-slate-900/50 p-2 rounded-lg">
                <i data-lucide="shield-check" class="w-4 h-4 text-green-400 shrink-0 mt-0.5"></i>
                <span id="ai-summary-safety-text" class="text-slate-300"></span>
            </div>
        </div>
        <div id="ai-summary-raw" class="hidden text-slate-200 text-sm mb-4 leading-relaxed italic border-l-4 border-blue-500 pl-4 bg-slate-900/50 p-3 rounded-r-lg"></div>
        <div class="flex gap-2 mt-4">
            <button id="ai-summary-save-btn" class="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2">
                <i data-lucide="save" class="w-4 h-4"></i> <span data-i18n="logSave">Zapisz</span>
            </button>
            <button class="modal-close-btn flex-1 bg-slate-700 py-3 rounded-xl font-bold text-sm" data-i18n="btnClose">Zamknij</button>
        </div>
    </div>
</div>`;
}

function gpsLostModalHTML(): string {
  return `
<div id="gps-lost-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[3500] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="gps-lost-title">
    <div class="bg-slate-800 p-6 rounded-2xl max-w-sm w-full border-2 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.3)]">
        <h3 id="gps-lost-title" class="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2"><i data-lucide="satellite-dish"></i> <span data-i18n="gpsLostTitle">Utrata sygnału GPS!</span></h3>
        <p class="text-slate-300 text-sm mb-2 leading-relaxed" data-i18n="gpsLostBody">Brak odczytu GPS przez ponad 60 sekund. Monitoring kotwicy jest zagrożony!</p>
        <p class="text-slate-400 text-xs mb-6" data-i18n="gpsLostHint">Sprawdź, czy urządzenie ma widoczność nieba. Upewnij się, że aplikacja nie została zminimalizowana.</p>
        <button class="modal-close-btn w-full bg-yellow-600 hover:bg-yellow-500 py-3 rounded-xl font-bold text-white" data-i18n="btnUnderstood">Zrozumiałem</button>
    </div>
</div>`;
}

function historyModalHTML(): string {
  return `
<div id="history-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="history-title">
    <div class="bg-slate-800 p-5 rounded-2xl max-w-sm w-full border border-slate-700 flex flex-col max-h-[90vh]">
        <div class="flex justify-between items-center mb-4">
            <h3 id="history-title" class="text-xl font-bold text-white flex items-center gap-2"><i data-lucide="history" class="text-blue-400"></i> <span data-i18n="histTitle">Historia Sesji</span></h3>
            <button id="open-stats-btn" class="text-slate-400 hover:text-cyan-400 transition-colors" title="Statistics"><i data-lucide="bar-chart-3" class="w-5 h-5"></i></button>
        </div>
        <div id="history-list" class="overflow-y-auto flex-grow space-y-2 pr-1 min-h-[100px]">
            <div class="text-slate-500 text-sm text-center py-4" data-i18n="histLoading">Ładowanie...</div>
        </div>
        <button class="modal-close-btn w-full bg-slate-700 hover:bg-slate-600 py-3 mt-4 rounded-xl font-bold border border-slate-600" data-i18n="btnClose">Zamknij</button>
    </div>
</div>`;
}

function statsModalHTML(): string {
  return `
<div id="stats-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2500] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="stats-title">
    <div class="bg-slate-800 p-5 rounded-2xl max-w-sm w-full border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
        <h3 id="stats-title" class="text-xl font-bold text-white mb-4 flex items-center gap-2"><i data-lucide="bar-chart-3" class="text-cyan-400"></i> <span data-i18n="statsTitle">Statystyki</span></h3>
        <div id="stats-content" class="space-y-2 text-sm">
            <div class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-700"><span class="text-slate-400" data-i18n="statsSessions">Sesje</span><span id="stats-sessions" class="text-white font-mono">0</span></div>
            <div class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-700"><span class="text-slate-400" data-i18n="statsAlarms">Alarmy</span><span id="stats-alarms" class="text-white font-mono">0</span></div>
            <div class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-700"><span class="text-slate-400" data-i18n="statsTotalTime">Czas na kotwicy</span><span id="stats-duration" class="text-white font-mono">0h</span></div>
            <div class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-700"><span class="text-slate-400" data-i18n="statsAvgTime">Śr. czas sesji</span><span id="stats-avg-duration" class="text-white font-mono">0h</span></div>
            <div class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-700"><span class="text-slate-400" data-i18n="statsMaxDist">Max odchylenie</span><span id="stats-max-dist" class="text-white font-mono">0m</span></div>
            <div class="flex justify-between bg-slate-900 p-3 rounded-lg border border-slate-700"><span class="text-slate-400" data-i18n="statsMaxSog">Max SOG</span><span id="stats-max-sog" class="text-white font-mono">0 kn</span></div>
        </div>
        <button class="modal-close-btn w-full bg-slate-700 hover:bg-slate-600 py-3 mt-4 rounded-xl font-bold border border-slate-600" data-i18n="btnClose">Zamknij</button>
    </div>
</div>`;
}

function replayModalHTML(): string {
  return `
<div id="replay-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2500] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="replay-title">
    <div class="bg-slate-800 p-5 rounded-2xl max-w-sm w-full border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)] flex flex-col max-h-[90vh]">
        <h3 id="replay-title" class="text-xl font-bold text-white mb-2 flex items-center gap-2"><i data-lucide="play-circle" class="text-blue-400"></i> <span data-i18n="replayTitle">Sesja</span></h3>
        <div id="replay-info" class="text-slate-300 text-xs mb-3 space-y-1"></div>
        <div id="replay-map" class="w-full h-48 rounded-lg mb-3 bg-slate-900 border border-slate-700"></div>
        <div id="replay-logbook" class="hidden mb-3">
            <h4 class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="book-open" class="w-3 h-3"></i> <span data-i18n="logTitle">Dziennik Pokładowy</span></h4>
            <div id="replay-logbook-entries" class="space-y-1.5 max-h-32 overflow-y-auto"></div>
        </div>
        <div class="flex gap-2">
            <button id="replay-export-btn" class="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2">
                <i data-lucide="download" class="w-4 h-4"></i> <span data-i18n="replayExport">Eksport GPX</span>
            </button>
            <button id="replay-export-csv-btn" class="flex-1 bg-slate-600 hover:bg-slate-500 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2">
                <i data-lucide="file-spreadsheet" class="w-4 h-4"></i> CSV
            </button>
            <button id="replay-delete-btn" class="flex-1 bg-red-900/50 hover:bg-red-900 text-red-300 py-3 rounded-xl font-bold border border-red-800 text-sm flex items-center justify-center gap-2">
                <i data-lucide="trash-2" class="w-4 h-4"></i> <span data-i18n="replayDelete">Usuń</span>
            </button>
        </div>
        <button class="modal-close-btn w-full mt-3 bg-slate-700 py-2 rounded-xl text-sm font-bold border border-slate-600" data-i18n="btnClose">Zamknij</button>
    </div>
</div>`;
}

function weatherModalHTML(): string {
  return `
<div id="weather-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="weather-title">
    <div class="bg-slate-800 p-5 rounded-2xl max-w-md w-full border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)] flex flex-col max-h-[90vh]">
        <h3 id="weather-title" class="text-xl font-bold text-white mb-3 flex items-center gap-2"><i data-lucide="cloud-sun" class="text-cyan-400"></i> <span data-i18n="wxTitle">Prognoza Morska</span></h3>
        <div id="weather-loading" class="flex flex-col items-center justify-center py-8 gap-3">
            <i data-lucide="loader-2" class="animate-spin w-8 h-8 text-cyan-400"></i>
            <span class="text-slate-400 text-sm" data-i18n="wxLoading">Pobieram dane pogodowe...</span>
        </div>
        <div id="weather-content" class="hidden overflow-y-auto flex-grow space-y-3 pr-1">
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-700">
                <h4 class="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2" data-i18n="wxNow">Teraz</h4>
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <div class="text-2xl font-bold text-white" id="wx-wind-speed">--</div>
                        <div class="text-[10px] text-slate-400" data-i18n="wxWind">Wiatr (kn)</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-orange-400" id="wx-wind-gust">--</div>
                        <div class="text-[10px] text-slate-400" data-i18n="wxGusts">Porywy (kn)</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-cyan-300" id="wx-wind-dir">--</div>
                        <div class="text-[10px] text-slate-400" data-i18n="wxDir">Kierunek</div>
                    </div>
                </div>
            </div>
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-700">
                <h4 class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2" data-i18n="wxWaves">Fale</h4>
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <div class="text-2xl font-bold text-white" id="wx-wave-height">--</div>
                        <div class="text-[10px] text-slate-400" data-i18n="wxHeight">Wys. (m)</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-blue-300" id="wx-wave-period">--</div>
                        <div class="text-[10px] text-slate-400" data-i18n="wxPeriod">Okres (s)</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-blue-300" id="wx-wave-dir">--</div>
                        <div class="text-[10px] text-slate-400" data-i18n="wxDir">Kierunek</div>
                    </div>
                </div>
            </div>
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-700">
                <h4 class="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2" data-i18n="wxWind12h">Wiatr 12h</h4>
                <div id="wx-wind-chart" class="flex items-end gap-0.5 h-24"></div>
                <div class="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span data-i18n="wxNow">Teraz</span>
                    <span>+6h</span>
                    <span>+12h</span>
                </div>
            </div>
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-700">
                <h4 class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2" data-i18n="wxWaves12h">Fale 12h</h4>
                <div id="wx-wave-chart" class="flex items-end gap-0.5 h-24"></div>
                <div class="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span data-i18n="wxNow">Teraz</span>
                    <span>+6h</span>
                    <span>+12h</span>
                </div>
            </div>
            <div id="wx-assessment" class="bg-slate-900 p-3 rounded-xl border border-slate-700">
                <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2" data-i18n="wxAssess">Ocena</h4>
                <div id="wx-assessment-text" class="text-sm text-slate-300"></div>
            </div>
        </div>
        <div id="weather-error" class="hidden text-red-400 text-sm text-center py-4"></div>
        <button class="modal-close-btn w-full bg-slate-700 hover:bg-slate-600 py-3 mt-3 rounded-xl font-bold border border-slate-600" data-i18n="btnClose">Zamknij</button>
    </div>
</div>`;
}

function qrScanModalHTML(): string {
  return `
<div id="qr-scan-modal" class="modal fixed inset-0 bg-black/80 flex items-center justify-center z-[4000] hidden p-4" role="dialog" aria-modal="true" aria-labelledby="qr-scan-title">
    <div class="bg-slate-800 p-5 rounded-2xl max-w-sm w-full border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
        <h3 id="qr-scan-title" class="text-xl font-bold text-white mb-2 flex items-center gap-2"><i data-lucide="qr-code" class="text-emerald-400"></i> <span data-i18n="qrTitle">Skanuj kod QR</span></h3>
        <p class="text-slate-400 text-xs mb-3" data-i18n="qrDesc">Zeskanuj kod QR wyświetlony na telefonie z Androidem, aby nawiązać połączenie.</p>
        <div id="qr-reader" class="w-full rounded-xl overflow-hidden mb-3 bg-slate-900" style="min-height: 250px;"></div>
        <div id="qr-scan-result" class="hidden bg-emerald-900/50 p-3 rounded-xl border border-emerald-700 mb-3">
            <div class="text-emerald-400 text-sm font-bold mb-1" data-i18n="qrFound">Znaleziono!</div>
            <div id="qr-scan-url" class="text-white font-mono text-xs break-all"></div>
        </div>
        <div id="qr-scan-error" class="hidden text-red-400 text-sm mb-3"></div>
        <div class="flex gap-3">
            <button id="qr-scan-close" class="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-bold border border-slate-600" data-i18n="btnClose">Zamknij</button>
            <button id="qr-scan-connect" class="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold text-white hidden" data-i18n="btnConnect">Połącz</button>
        </div>
    </div>
</div>`;
}
