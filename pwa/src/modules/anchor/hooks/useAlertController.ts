import { useRef, useCallback, useEffect } from 'react';

interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

type BeepType = 'square' | 'warning' | 'sine';

interface UseAlertControllerParams {
  onLowBattery?: (data: { reason: string; message: string; alarmState: string }) => void;
  isAnchored?: () => boolean;
}

export function useAlertController({
  onLowBattery,
  isAnchored,
}: UseAlertControllerParams = {}) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const batteryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const batteryRef = useRef<BatteryManager | null>(null);
  const batteryCheckRef = useRef<(() => void) | null>(null);
  const batteryWarningShownRef = useRef(false);
  const isAlarmingRef = useRef(false);
  const lastKnownBatteryLevelRef = useRef(1.0);
  const lastKnownChargingStateRef = useRef(false);

  // Keep callback refs up to date
  const onLowBatteryRef = useRef(onLowBattery);
  onLowBatteryRef.current = onLowBattery;
  const isAnchoredRef = useRef(isAnchored);
  isAnchoredRef.current = isAnchored;

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback(
    (type: BeepType = 'square') => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'square') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        // sine
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
        osc.stop(ctx.currentTime + 1);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
    },
    [],
  );

  const startAlarm = useCallback(
    (interval = 1000) => {
      if (isAlarmingRef.current) return;
      isAlarmingRef.current = true;

      if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
      playBeep('square');

      alertIntervalRef.current = setInterval(() => {
        playBeep('square');
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
      }, interval);
    },
    [playBeep],
  );

  const stopAlarm = useCallback(() => {
    isAlarmingRef.current = false;
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
      alertIntervalRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('WakeLock error:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker?.ready
        .then((reg) =>
          reg.showNotification(title, {
            body,
            vibrate: [500, 200, 500],
          } as NotificationOptions),
        )
        .catch(() => new Notification(title, { body }));
    }
  }, []);

  const initPermissions = useCallback(() => {
    ensureAudioContext();
    requestWakeLock();
    if (
      'Notification' in window &&
      Notification.permission !== 'granted' &&
      Notification.permission !== 'denied'
    ) {
      Notification.requestPermission();
    }
  }, [ensureAudioContext, requestWakeLock]);

  // Battery monitoring
  useEffect(() => {
    if (!('getBattery' in navigator)) return;

    let mounted = true;

    (navigator as any).getBattery().then((b: BatteryManager) => {
      if (!mounted) return;

      batteryRef.current = b;
      lastKnownBatteryLevelRef.current = b.level;
      lastKnownChargingStateRef.current = b.charging;

      const check = () => {
        lastKnownBatteryLevelRef.current = b.level;
        lastKnownChargingStateRef.current = b.charging;

        if (
          b.level <= 0.15 &&
          !b.charging &&
          isAnchoredRef.current?.() &&
          !batteryWarningShownRef.current
        ) {
          batteryWarningShownRef.current = true;
          onLowBatteryRef.current?.({
            reason: 'LOW_BATTERY',
            message: 'iPad battery critically low!',
            alarmState: 'WARNING',
          });
        }
        if (b.charging) batteryWarningShownRef.current = false;
      };

      batteryCheckRef.current = check;
      b.addEventListener('levelchange', check);
      b.addEventListener('chargingchange', check);
      batteryIntervalRef.current = setInterval(check, 60000);
    });

    return () => {
      mounted = false;
      if (batteryIntervalRef.current) clearInterval(batteryIntervalRef.current);
      if (batteryRef.current && batteryCheckRef.current) {
        batteryRef.current.removeEventListener('levelchange', batteryCheckRef.current);
        batteryRef.current.removeEventListener('chargingchange', batteryCheckRef.current);
      }
    };
  }, []);

  const cleanup = useCallback(() => {
    stopAlarm();
    releaseWakeLock();
    if (batteryIntervalRef.current) clearInterval(batteryIntervalRef.current);
    if (batteryRef.current && batteryCheckRef.current) {
      batteryRef.current.removeEventListener('levelchange', batteryCheckRef.current);
      batteryRef.current.removeEventListener('chargingchange', batteryCheckRef.current);
      batteryRef.current = null;
      batteryCheckRef.current = null;
    }
  }, [stopAlarm, releaseWakeLock]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    playBeep,
    startAlarm,
    stopAlarm,
    requestWakeLock,
    releaseWakeLock,
    cleanup,
    sendNotification,
    initPermissions,
    ensureAudioContext,
    isAlarmingRef,
    lastKnownBatteryLevelRef,
    lastKnownChargingStateRef,
  };
}
