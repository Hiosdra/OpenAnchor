import { useState, useCallback, useEffect } from 'react';

import type { AnchorState } from './useAnchorState';

// ─── Weather assessment helper ───
function assessWeather(
  windSpeed: number | null,
  windGust: number | null,
  waveHeight: number | null,
  windForecast: number[],
  gustForecast: number[],
): { level: string; text: string } | null {
  if (windSpeed === null) return null;
  const curGust = windGust ?? windSpeed;
  const curWaveH = waveHeight ?? 0;
  const maxFutureGust =
    gustForecast.length > 0 ? Math.max(...gustForecast.filter((v) => v != null)) : curGust;
  const maxFutureWind =
    windForecast.length > 0 ? Math.max(...windForecast.filter((v) => v != null)) : windSpeed;

  if (maxFutureGust > 35 || curWaveH > 2.5) {
    return {
      level: 'danger',
      text: `Dangerous: gusts to ${Math.round(maxFutureGust)} kn, waves ${curWaveH}m`,
    };
  }
  if (maxFutureGust > 25 || curWaveH > 1.5 || maxFutureWind > 20) {
    return { level: 'caution', text: `Caution: gusts forecast to ${Math.round(maxFutureGust)} kn` };
  }
  if (windSpeed > 15 || curGust > 20) {
    return { level: 'moderate', text: `Moderate: wind ${windSpeed} kn, gusts ${curGust} kn` };
  }
  return { level: 'good', text: `Good conditions: wind ${windSpeed} kn` };
}

// ─── Types ───

interface UseWeatherParams {
  stateRef: React.RefObject<AnchorState>;
  isWeatherModalOpen: boolean;
}

interface WeatherData {
  loading: boolean;
  error: string | null;
  windSpeed: number | null;
  windGust: number | null;
  windDir: number | null;
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDir: number | null;
  windForecast: number[];
  waveForecast: number[];
  gustForecast: number[];
}

// ─── Hook ───

export function useWeather({ stateRef, isWeatherModalOpen }: UseWeatherParams) {
  const [weatherData, setWeatherData] = useState<WeatherData>({
    loading: false,
    error: null,
    windSpeed: null,
    windGust: null,
    windDir: null,
    waveHeight: null,
    wavePeriod: null,
    waveDir: null,
    windForecast: [],
    waveForecast: [],
    gustForecast: [],
  });

  const fetchWeather = useCallback(async () => {
    const pos = stateRef.current!.currentPos;
    if (!pos) return;
    setWeatherData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const lat = pos.lat;
      const lng = pos.lng;
      const [windRes, marineRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&forecast_hours=12&wind_speed_unit=kn`,
        ),
        fetch(
          `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,wave_period,wave_direction&forecast_hours=12`,
        ),
      ]);

      const windJson = await windRes.json();
      const marineJson = marineRes.ok ? await marineRes.json() : null;

      const windSpeeds = windJson.hourly?.wind_speed_10m ?? [];
      const windGusts = windJson.hourly?.wind_gusts_10m ?? [];
      const windDirs = windJson.hourly?.wind_direction_10m ?? [];
      const waveHeights = marineJson?.hourly?.wave_height ?? [];
      const wavePeriods = marineJson?.hourly?.wave_period ?? [];
      const waveDirs = marineJson?.hourly?.wave_direction ?? [];

      setWeatherData({
        loading: false,
        error: null,
        windSpeed: windSpeeds[0] ?? null,
        windGust: windGusts[0] ?? null,
        windDir: windDirs[0] ?? null,
        waveHeight: waveHeights[0] ?? null,
        wavePeriod: wavePeriods[0] ?? null,
        waveDir: waveDirs[0] ?? null,
        windForecast: windSpeeds,
        waveForecast: waveHeights,
        gustForecast: windGusts,
      });
    } catch (e) {
      setWeatherData((prev) => ({
        ...prev,
        loading: false,
        error: String(e),
      }));
    }
  }, [stateRef]);

  // Auto-fetch weather when modal opens
  useEffect(() => {
    if (isWeatherModalOpen) fetchWeather();
  }, [isWeatherModalOpen, fetchWeather]);

  const weatherAssessment = assessWeather(
    weatherData.windSpeed,
    weatherData.windGust,
    weatherData.waveHeight,
    weatherData.windForecast,
    weatherData.gustForecast,
  );

  return { weatherData, fetchWeather, weatherAssessment };
}
