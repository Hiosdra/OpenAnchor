/**
 * AILogbookController — AI chat, logbook generation and saving.
 */

import { marked } from 'marked';
import { createIcons, icons } from 'lucide';
import type { AppState } from '../anchor-app';
import type { SessionDB } from '../session-db';
import type { AIController } from '../ai-controller';
import { I18N } from '../i18n';
import { UI } from '../ui-utils';
import { formatDuration, parseLogbookResponse } from '../anchor-utils';

export class AILogbookController {
  private _lastLogbookResponse: string | null = null;
  private _lastLogbookParsed: { summary: string; logEntry: string; safetyNote: string } | null = null;

  constructor(
    private state: AppState,
    private db: SessionDB,
    private aiCtrl: AIController,
  ) {}

  async handleAskAI() {
    const input = document.getElementById('ai-chat-input') as HTMLInputElement;
    const question = input.value.trim();
    if (!question) return;

    const chatArea = document.getElementById('ai-chat-area')!;
    const placeholder = document.getElementById('ai-chat-placeholder');
    const clearBtn = document.getElementById('ai-clear-chat-btn')!;
    const askBtn = document.getElementById('ai-ask-btn') as HTMLButtonElement;

    if (placeholder) placeholder.classList.add('hidden');
    clearBtn.classList.remove('hidden');

    const userBubble = document.createElement('div');
    userBubble.className = 'flex justify-end';
    userBubble.innerHTML = `<div class="bg-purple-700 text-white text-sm px-3 py-2 rounded-xl rounded-br-sm max-w-[85%] break-words">${this._escapeHtml(question)}</div>`;
    chatArea.appendChild(userBubble);

    const loadBubble = document.createElement('div');
    loadBubble.className = 'flex justify-start';
    loadBubble.innerHTML = `<div class="bg-slate-700 text-slate-300 text-sm px-3 py-2 rounded-xl rounded-bl-sm max-w-[85%] flex items-center gap-2"><i data-lucide="loader-2" class="animate-spin w-4 h-4 text-purple-400"></i> <span class="text-xs">${I18N.t.aiAnalyzing}</span></div>`;
    chatArea.appendChild(loadBubble);
    createIcons({ icons });
    input.value = '';
    askBtn.disabled = true;
    chatArea.scrollTop = chatArea.scrollHeight;

    const contextPrompt = this.aiCtrl.buildContextPrompt(this.state as any);
    const depth = (document.getElementById('ai-depth') as HTMLInputElement).value;
    const chain = (document.getElementById('ai-chain') as HTMLInputElement).value;
    const wind = (document.getElementById('ai-wind') as HTMLInputElement).value;
    const bottom = (document.getElementById('ai-bottom') as HTMLSelectElement).value;
    let formContext = '';
    if (depth && chain) formContext = `\nUser-provided anchoring parameters: depth=${depth}m, chain=${chain}m, wind=${wind}kn, bottom type=${bottom}`;

    let weatherContext = '';
    if (this.state.currentPos) weatherContext = await this.aiCtrl.fetchWeather(this.state.currentPos.lat, this.state.currentPos.lng);

    let statsContext = '';
    if (this.db.db) { try { const stats = await this.db.getStats(); if (stats.totalSessions > 0) statsContext = `\n- Sailing history: ${stats.totalSessions} completed anchoring sessions, ${stats.totalAlarms} total alarms`; } catch (_) { /* ignore */ } }

    let recentDistances = '';
    if (this.state.isAnchored && this.state.sessionId && this.db.db) { try { const points = await this.db.getTrackPoints(this.state.sessionId); const recent = points.slice(-10); if (recent.length > 0) recentDistances = `\n- Recent distances from anchor (last ${recent.length} readings): ${recent.map((p) => Math.round(p.distance) + 'm').join(', ')}`; } catch (_) { /* ignore */ } }

    const fullContext = contextPrompt + formContext + statsContext + recentDistances;
    const systemPrompt = `You are an expert sailing advisor specializing in anchoring safety.\nYou provide concise, actionable advice for sailors.\nAlways consider safety as the top priority.\nIf you don't know something, say so — never make up navigational data.\nKeep answers under 300 words unless detailed analysis is needed.\nAnswer in the same language the sailor uses.`;

    const response = await this.aiCtrl.askWithContext(question, systemPrompt, fullContext, weatherContext);
    loadBubble.innerHTML = `<div class="bg-slate-700 text-slate-300 text-sm px-3 py-2 rounded-xl rounded-bl-sm max-w-[85%] prose prose-sm prose-invert max-w-none leading-relaxed">${marked.parse(response)}<div class="text-[9px] text-slate-500 mt-1 italic">${I18N.t.aiDisclaimer}</div></div>`;
    createIcons({ icons });
    askBtn.disabled = false;
    chatArea.scrollTop = chatArea.scrollHeight;
    document.getElementById('ai-context-badge')!.classList.toggle('hidden', !this.state.isAnchored);
  }

  clearAIChat() {
    this.aiCtrl.clearChat();
    const chatArea = document.getElementById('ai-chat-area')!;
    chatArea.innerHTML = `<div id="ai-chat-placeholder" class="text-slate-500 text-xs text-center py-6"><i data-lucide="message-circle" class="w-8 h-8 mx-auto mb-2 opacity-50"></i><p data-i18n="aiChatPlaceholder">${I18N.t.aiChatPlaceholder || 'Ask a question...'}</p></div>`;
    document.getElementById('ai-clear-chat-btn')!.classList.add('hidden');
    createIcons({ icons });
  }

  async generateLogbookEntry() {
    if (!this.state.anchorStartTime || !this.aiCtrl.apiKey) return;
    UI.showModal('ai-summary-modal');
    document.getElementById('ai-summary-loader')!.classList.remove('hidden');
    document.getElementById('ai-summary-content')!.classList.add('hidden');
    document.getElementById('ai-summary-raw')!.classList.add('hidden');

    const dMs = Date.now() - this.state.anchorStartTime;
    const h = Math.floor(dMs / 3600000), m = Math.floor((dMs % 3600000) / 60000);
    const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

    let weatherSummary = '';
    if (this.state.currentPos) { try { weatherSummary = await this.aiCtrl.fetchWeather(this.state.currentPos.lat, this.state.currentPos.lng); } catch (_) { /* ignore */ } }

    let alarmPointCount = 0, trackPointCount = 0, avgDistance = 0;
    if (this.db.db && this.state.sessionId) { try { const points = await this.db.getTrackPoints(this.state.sessionId); trackPointCount = points.length; alarmPointCount = points.filter((p) => p.alarmState === 'ALARM').length; if (points.length > 0) avgDistance = points.reduce((s, p) => s + (p.distance || 0), 0) / points.length; } catch (_) { /* ignore */ } }

    let alarmCount = 0;
    if (this.db.db && this.state.sessionId) { try { const s = await this.db.getSession(this.state.sessionId); if (s) alarmCount = s.alarmCount || 0; } catch (_) { /* ignore */ } }

    const anchorLat = this.state.anchorPos ? this.state.anchorPos.lat.toFixed(6) : '?';
    const anchorLng = this.state.anchorPos ? this.state.anchorPos.lng.toFixed(6) : '?';

    const prompt = `Generate a concise nautical logbook entry for this anchoring session.\nWrite it in a professional maritime log style.\n\nSession data:\n- Anchor position: ${anchorLat}, ${anchorLng}\n- Duration: ${durStr}\n- Safe zone radius: ${this.state.radius}m\n- Alarms triggered: ${alarmCount}\n- Max distance from anchor: ${Math.round(this.state.maxDistanceSwing)}m\n- Average distance: ${Math.round(avgDistance)}m\n- Track points recorded: ${trackPointCount}\n- Alarm track points: ${alarmPointCount}\n${weatherSummary ? '- Weather conditions: ' + weatherSummary : ''}\n\nGenerate:\n1. A one-line summary (suitable for a list view)\n2. A detailed log entry (3-5 sentences)\n3. Safety assessment (one sentence)\n\nFormat as:\nSUMMARY: ...\nLOG: ...\nSAFETY: ...`;
    const systemPrompt = 'You are a professional maritime logbook writer. Generate structured logbook entries. Always use the exact format requested.';
    const response = await this.aiCtrl.ask(prompt, systemPrompt);

    document.getElementById('ai-summary-loader')!.classList.add('hidden');
    this._lastLogbookResponse = response;
    const parsed = parseLogbookResponse(response);

    if (parsed) {
      this._lastLogbookParsed = parsed;
      document.getElementById('ai-summary-content')!.classList.remove('hidden');
      document.getElementById('ai-summary-summary')!.textContent = parsed.summary;
      document.getElementById('ai-summary-log')!.textContent = parsed.logEntry;
      document.getElementById('ai-summary-safety-text')!.textContent = parsed.safetyNote;
    } else {
      this._lastLogbookParsed = { summary: response.substring(0, 100), logEntry: response, safetyNote: '' };
      document.getElementById('ai-summary-raw')!.classList.remove('hidden');
      document.getElementById('ai-summary-raw')!.textContent = `"${response.replace(/"/g, '')}"`;
    }
    createIcons({ icons });
  }

  async saveLogbookEntry() {
    if (!this.db.db || !this.state.sessionId || !this._lastLogbookParsed) return;
    try {
      await this.db.addLogbookEntry({
        sessionId: this.state.sessionId,
        createdAt: Date.now(),
        summary: this._lastLogbookParsed.summary,
        logEntry: this._lastLogbookParsed.logEntry,
        safetyNote: this._lastLogbookParsed.safetyNote,
        isAiGenerated: true,
      });
      UI.hideModal('ai-summary-modal');
    } catch (err) { console.warn('Failed to save logbook entry:', err); }
  }

  private _escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
