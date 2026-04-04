/**
 * WeatherController — Fetch weather, render charts and assessment.
 */

import type { AppState } from '../anchor-app';
import { I18N } from '../i18n';
import { degToCompass } from '../anchor-utils';

export class WeatherController {
  constructor(private state: AppState) {}

  async fetchWeatherData() {
    const loading = document.getElementById('weather-loading')!;
    const content = document.getElementById('weather-content')!;
    const errorEl = document.getElementById('weather-error')!;
    loading.classList.remove('hidden'); content.classList.add('hidden'); errorEl.classList.add('hidden');

    if (!this.state.currentPos) { loading.classList.add('hidden'); errorEl.textContent = I18N.t.wxNoGps; errorEl.classList.remove('hidden'); return; }

    const lat = this.state.currentPos.lat, lng = this.state.currentPos.lng;
    try {
      const [windRes, marineRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=wind_speed_10m,wind_gusts_10m&wind_speed_unit=kn&timezone=auto&forecast_days=2`),
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_direction,wave_period&hourly=wave_height,wave_period&timezone=auto&forecast_days=2`),
      ]);
      if (!windRes.ok) throw new Error(I18N.t.wxNoWind);
      const windData = await windRes.json();
      const curWind = Math.round(windData.current.wind_speed_10m);
      const curGust = Math.round(windData.current.wind_gusts_10m || curWind);
      const curDir = Math.round(windData.current.wind_direction_10m);
      const dirLabel = degToCompass(curDir);
      document.getElementById('wx-wind-speed')!.textContent = String(curWind);
      document.getElementById('wx-wind-gust')!.textContent = String(curGust);
      document.getElementById('wx-wind-dir')!.textContent = dirLabel;

      let waveHeight = '--', wavePeriod = '--', waveDir = '--';
      let marineData: any = null;
      if (marineRes.ok) {
        marineData = await marineRes.json();
        if (marineData.current) {
          waveHeight = marineData.current.wave_height?.toFixed(1) || '--';
          wavePeriod = marineData.current.wave_period?.toFixed(0) || '--';
          waveDir = marineData.current.wave_direction ? degToCompass(marineData.current.wave_direction) : '--';
        }
      }
      document.getElementById('wx-wave-height')!.textContent = waveHeight;
      document.getElementById('wx-wave-period')!.textContent = wavePeriod;
      document.getElementById('wx-wave-dir')!.textContent = waveDir;

      const now = new Date();
      const nowIdx = windData.hourly.time.findIndex((t: string) => new Date(t) > now) || 0;
      const windSpeeds12 = windData.hourly.wind_speed_10m.slice(nowIdx, nowIdx + 12);
      const gustSpeeds12 = (windData.hourly.wind_gusts_10m || []).slice(nowIdx, nowIdx + 12);
      this.renderBarChart('wx-wind-chart', windSpeeds12, gustSpeeds12, 'kn');

      if (marineData?.hourly) {
        const marineNowIdx = marineData.hourly.time.findIndex((t: string) => new Date(t) > now) || 0;
        const waveHeights12 = marineData.hourly.wave_height.slice(marineNowIdx, marineNowIdx + 12);
        this.renderBarChart('wx-wave-chart', waveHeights12, [], 'm');
      } else {
        document.getElementById('wx-wave-chart')!.innerHTML = `<div class="text-slate-500 text-xs text-center w-full">${I18N.t.wxNoMarine}</div>`;
      }

      this.renderWeatherAssessment(curWind, curGust, parseFloat(waveHeight) || 0, windSpeeds12, gustSpeeds12);
      loading.classList.add('hidden'); content.classList.remove('hidden');
    } catch (err: any) {
      loading.classList.add('hidden'); errorEl.textContent = `${I18N.t.wxFetchError} ${err.message}`; errorEl.classList.remove('hidden');
    }
  }

  renderBarChart(containerId: string, primaryValues: number[], secondaryValues: number[], unit: string) {
    const container = document.getElementById(containerId)!;
    container.innerHTML = '';
    if (!primaryValues || primaryValues.length === 0) { container.innerHTML = `<div class="text-slate-500 text-xs text-center w-full">${I18N.t.wxNoData}</div>`; return; }
    const allVals = [...primaryValues, ...secondaryValues].filter((v) => v != null);
    const maxVal = Math.max(...allVals, 1);
    primaryValues.forEach((val, i) => {
      const pct = Math.max((val / maxVal) * 100, 2);
      const gustVal = secondaryValues[i];
      const gustPct = gustVal ? Math.max((gustVal / maxVal) * 100, 2) : 0;
      const barGroup = document.createElement('div');
      barGroup.className = 'flex-1 flex flex-col items-center justify-end h-full relative';
      barGroup.title = `${Math.round(val)} ${unit}` + (gustVal ? ` (${I18N.t.wxGustsLabel} ${Math.round(gustVal)} ${unit})` : '');
      if (gustPct > 0 && gustPct > pct) { const gustBar = document.createElement('div'); gustBar.className = 'weather-bar w-full bg-orange-900/50 rounded-t-sm absolute bottom-0'; gustBar.style.height = gustPct + '%'; barGroup.appendChild(gustBar); }
      const bar = document.createElement('div');
      const color = val > 25 ? 'bg-red-500' : val > 15 ? 'bg-orange-400' : 'bg-cyan-400';
      bar.className = `weather-bar w-full ${color} rounded-t-sm relative`;
      bar.style.height = pct + '%';
      barGroup.appendChild(bar);
      container.appendChild(barGroup);
    });
  }

  renderWeatherAssessment(curWind: number, curGust: number, curWaveH: number, windForecast: number[], gustForecast: number[]) {
    const textEl = document.getElementById('wx-assessment-text')!;
    const maxFutureGust = gustForecast.length > 0 ? Math.max(...gustForecast.filter((v) => v != null)) : curGust;
    const maxFutureWind = windForecast.length > 0 ? Math.max(...windForecast.filter((v) => v != null)) : curWind;
    let icon = '🟢', text = '';
    if (maxFutureGust > 35 || curWaveH > 2.5) { icon = '🔴'; text = I18N.fmt(I18N.t.wxDanger, { gust: Math.round(maxFutureGust), wave: curWaveH }); }
    else if (maxFutureGust > 25 || curWaveH > 1.5 || maxFutureWind > 20) { icon = '🟡'; text = I18N.fmt(I18N.t.wxCaution, { gust: Math.round(maxFutureGust) }); }
    else if (curWind > 15 || curGust > 20) { icon = '🟠'; text = I18N.fmt(I18N.t.wxModerate, { wind: curWind, gust: curGust }); }
    else { text = I18N.fmt(I18N.t.wxGood, { wind: curWind }); }
    textEl.innerHTML = `<span class="text-lg mr-1">${icon}</span> ${text}`;
  }
}
