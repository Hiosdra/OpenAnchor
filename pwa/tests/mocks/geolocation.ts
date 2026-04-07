import { vi } from 'vitest';

export function createMockGeolocation() {
  return {
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn(),
  };
}

export function createMockPosition(lat = 52.0, lng = 20.0, accuracy = 5) {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
}

export function createMockPositionWithMotion(
  lat = 52.0,
  lng = 20.0,
  accuracy = 5,
  speed: number | null = 2.5,
  heading: number | null = 180,
) {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading,
      speed,
    },
    timestamp: Date.now(),
  };
}

export function installMockGeolocation(geo?: ReturnType<typeof createMockGeolocation>) {
  const mock = geo ?? createMockGeolocation();
  Object.defineProperty(navigator, 'geolocation', {
    value: mock,
    writable: true,
    configurable: true,
  });
  return mock;
}
