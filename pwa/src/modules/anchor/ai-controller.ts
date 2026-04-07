import { I18N } from './i18n';

interface ChatTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface AppStateForContext {
  currentPos: { lat: number; lng: number } | null;
  isAnchored: boolean;
  anchorPos: { lat: number; lng: number } | null;
  radius: number;
  anchorStartTime: number | null;
  alarmCount?: number;
  distance: number;
  alarmState: string;
  maxDistanceSwing: number;
  maxSogDuringAnchor: number;
  chainLengthM: number | null;
  depthM: number | null;
  accuracy: number;
}

export class AIController {
  apiKey: string;
  pendingAction: (() => void) | null = null;
  chatHistory: ChatTurn[] = [];

  constructor() {
    this.apiKey = localStorage.getItem('anchor_ai_key') || '';
  }

  setKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('anchor_ai_key', key);
  }

  clearKey() {
    this.apiKey = '';
    localStorage.removeItem('anchor_ai_key');
  }

  clearChat() {
    this.chatHistory = [];
  }

  buildContextPrompt(appState: AppStateForContext): string {
    const parts: string[] = ['Current context:'];

    if (appState.currentPos) {
      parts.push(
        `- Boat position: ${appState.currentPos.lat.toFixed(6)}, ${appState.currentPos.lng.toFixed(6)} (GPS accuracy: ${Math.round(appState.accuracy)}m)`,
      );
    }

    if (appState.isAnchored && appState.anchorPos) {
      parts.push(
        `- Anchor position: ${appState.anchorPos.lat.toFixed(6)}, ${appState.anchorPos.lng.toFixed(6)}`,
      );
      parts.push(`- Safe zone radius: ${appState.radius}m`);
      if (appState.anchorStartTime) {
        const hours = (Date.now() - appState.anchorStartTime) / 3600000;
        parts.push(`- Anchored for: ${hours.toFixed(1)} hours`);
      }
      parts.push(`- Alarms so far: ${appState.alarmCount || 0}`);
      parts.push(`- Current distance from anchor: ${Math.round(appState.distance)}m`);
      parts.push(`- Current alarm state: ${appState.alarmState}`);
      if (appState.maxDistanceSwing > 0)
        parts.push(`- Max swing distance: ${Math.round(appState.maxDistanceSwing)}m`);
      if (appState.maxSogDuringAnchor > 0)
        parts.push(`- Max SOG while anchored: ${appState.maxSogDuringAnchor.toFixed(1)} kn`);
    }

    if (appState.chainLengthM)
      parts.push(`- Chain deployed: ${Math.round(appState.chainLengthM)}m`);
    if (appState.depthM) parts.push(`- Water depth: ${appState.depthM}m`);

    return parts.join('\n');
  }

  async askWithContext(
    question: string,
    systemInstruction: string,
    contextPrompt: string,
    weatherContext: string,
  ): Promise<string> {
    const fullContext = contextPrompt + (weatherContext ? '\n' + weatherContext : '');
    const contents: ChatTurn[] = [];

    if (this.chatHistory.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: `${fullContext}\n\nSailor's question: ${question}` }],
      });
    } else {
      for (const turn of this.chatHistory) contents.push(turn);
      contents.push({
        role: 'user',
        parts: [{ text: `${fullContext}\n\nFollow-up question: ${question}` }],
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    const payload = {
      contents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 },
    };
    const delays = [1000, 2000, 4000, 8000, 16000];

    for (let i = 0; i < 6; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.status === 400 || response.status === 403) return I18N.t.aiErrorKey;
        if (response.status === 429) {
          if (i === 2) return I18N.t.aiErrorRate;
          throw new Error('Rate limit 429');
        }
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || I18N.t.aiErrorEmpty;

        this.chatHistory.push({ role: 'user', parts: [{ text: question }] });
        this.chatHistory.push({ role: 'model', parts: [{ text }] });
        if (this.chatHistory.length > 20) this.chatHistory = this.chatHistory.slice(-20);

        return text;
      } catch {
        if (i === 5) return I18N.t.aiErrorNet;
        await new Promise((r) => setTimeout(r, delays[i]));
      }
    }
    return I18N.t.aiErrorNet;
  }

  async ask(prompt: string, systemInstruction: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
    };
    const delays = [1000, 2000, 4000, 8000, 16000];

    for (let i = 0; i < 6; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.status === 400 || response.status === 403) return I18N.t.aiErrorKey;
        if (response.status === 429) {
          if (i === 2) return I18N.t.aiErrorRate;
          throw new Error('Rate limit 429');
        }
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || I18N.t.aiErrorEmpty;
      } catch {
        if (i === 5) return I18N.t.aiErrorNet;
        await new Promise((r) => setTimeout(r, delays[i]));
      }
    }
    return I18N.t.aiErrorNet;
  }

  async fetchWeather(lat: number, lng: number): Promise<string> {
    try {
      const marineRes = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_direction,wave_period&hourly=wave_height,wave_direction,wave_period`,
      );
      const windRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&timezone=auto&forecast_days=2`,
      );
      const windData = await windRes.json();
      const curWind = windData.current.wind_speed_10m;
      const curGust = windData.current.wind_gusts_10m || curWind;
      const curDir = windData.current.wind_direction_10m;
      const now = new Date();
      const nowIdx = windData.hourly.time.findIndex((t: string) => new Date(t) > now) || 0;
      const next12hGusts = windData.hourly.wind_gusts_10m
        .slice(nowIdx, nowIdx + 12)
        .filter((g: number | null) => g !== null);
      const maxGust12h = next12hGusts.length > 0 ? Math.max(...next12hGusts) : curGust;

      let marineTxt = '';
      if (marineRes.ok) {
        const mData = await marineRes.json();
        marineTxt = ` ${I18N.t.wxAiWave} ${mData.current.wave_height}m, ${I18N.t.wxDir.toLowerCase()} ${mData.current.wave_direction}°, ${I18N.t.wxPeriod.toLowerCase()} ${mData.current.wave_period}s.`;
      }
      return `[GPS]: ${I18N.fmt(I18N.t.wxAiWind, {
        wind: curWind,
        dir: curDir,
        gust: curGust,
        maxGust: maxGust12h,
      })}${marineTxt}`;
    } catch {
      return `[GPS]: ${I18N.t.wxAiFail}`;
    }
  }
}
