import { useState, useRef, useCallback, useEffect } from 'react';
import { isGpsSignalLost, shouldActivateBatterySaver } from '../anchor-utils';

const GPS_WATCHDOG_TIMEOUT = 60000;
const THROTTLE_MS = 500;

interface UseGPSParams {
  onPosition: (position: GeolocationPosition) => void;
  onError: (error: GeolocationPositionError) => void;
}

export function useGPS({ onPosition, onError }: UseGPSParams) {
  const [batterySaverActive, setBatterySaverActive] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastFixTimeRef = useRef<number>(Date.now());
  const watchdogAlertedRef = useRef(false);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCallRef = useRef<number>(0);
  const batterySaverRef = useRef(false);

  // Keep refs in sync with latest callbacks
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const throttledOnPosition = useCallback((pos: GeolocationPosition) => {
    const now = Date.now();
    const elapsed = now - lastCallRef.current;

    if (elapsed >= THROTTLE_MS) {
      lastCallRef.current = now;
      lastFixTimeRef.current = now;
      onPositionRef.current(pos);
    } else {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        lastFixTimeRef.current = Date.now();
        onPositionRef.current(pos);
      }, THROTTLE_MS - elapsed);
    }
  }, []);

  const cleanupGPS = useCallback(() => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const initGPS = useCallback(() => {
    if (!('geolocation' in navigator)) return;

    cleanupGPS();

    const gpsOptions: PositionOptions = batterySaverRef.current
      ? { enableHighAccuracy: false, maximumAge: 5000, timeout: 10000 }
      : { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 };

    watchIdRef.current = navigator.geolocation.watchPosition(
      throttledOnPosition,
      (err) => onErrorRef.current(err),
      gpsOptions,
    );
  }, [cleanupGPS, throttledOnPosition]);

  const checkGpsWatchdog = useCallback(
    (onLost: () => void): { signalLost: boolean; signalRestored: boolean } => {
      const elapsed = Date.now() - lastFixTimeRef.current;
      const lost = isGpsSignalLost(elapsed, GPS_WATCHDOG_TIMEOUT);

      if (lost && !watchdogAlertedRef.current) {
        watchdogAlertedRef.current = true;
        onLost();
        return { signalLost: true, signalRestored: false };
      }

      if (!lost && watchdogAlertedRef.current) {
        watchdogAlertedRef.current = false;
        return { signalLost: false, signalRestored: true };
      }

      return { signalLost: false, signalRestored: false };
    },
    [],
  );

  const checkBatterySaver = useCallback(
    (batteryLevel: number, isCharging: boolean): boolean => {
      const shouldSave = shouldActivateBatterySaver(batteryLevel, isCharging);

      if (shouldSave && !batterySaverRef.current) {
        batterySaverRef.current = true;
        setBatterySaverActive(true);
        cleanupGPS();
        // Re-init with battery saver options on next tick
        setTimeout(() => initGPS(), 0);
        return true;
      }

      if (!shouldSave && batterySaverRef.current) {
        batterySaverRef.current = false;
        setBatterySaverActive(false);
        cleanupGPS();
        setTimeout(() => initGPS(), 0);
        return false;
      }

      return batterySaverRef.current;
    },
    [cleanupGPS, initGPS],
  );

  useEffect(() => {
    return () => {
      cleanupGPS();
    };
  }, [cleanupGPS]);

  return {
    initGPS,
    cleanupGPS,
    checkGpsWatchdog,
    checkBatterySaver,
    batterySaverActive,
    lastFixTimeRef,
    watchdogAlertedRef,
  };
}
