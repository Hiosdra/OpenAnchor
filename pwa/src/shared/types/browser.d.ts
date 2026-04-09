/**
 * Browser API type augmentations for vendor-prefixed and emerging APIs.
 */

interface Window {
  webkitAudioContext?: typeof AudioContext;
}

interface BatteryManager extends EventTarget {
  readonly charging: boolean;
  readonly level: number;
  addEventListener(
    type: 'chargingchange' | 'levelchange',
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: 'chargingchange' | 'levelchange',
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface Navigator {
  getBattery?(): Promise<BatteryManager>;
}
