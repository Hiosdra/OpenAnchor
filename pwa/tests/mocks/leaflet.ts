import { vi } from 'vitest';

export function createMockMap() {
  const eventHandlers: Record<string, Function[]> = {};
  return {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    getCenter: vi.fn(() => ({ lat: 0, lng: 0 })),
    getZoom: vi.fn(() => 14),
    remove: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      (eventHandlers[event] ??= []).push(handler);
    }),
    off: vi.fn(),
    _fire(event: string, data?: any) {
      eventHandlers[event]?.forEach((h) => h(data));
    },
  };
}

export function createMockMarker(pos?: { lat: number; lng: number }) {
  const position = pos ?? { lat: 0, lng: 0 };
  const eventHandlers: Record<string, Function[]> = {};
  const marker = {
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    setLatLng: vi.fn().mockReturnThis(),
    getLatLng: vi.fn(() => position),
    setIcon: vi.fn().mockReturnThis(),
    bindTooltip: vi.fn().mockReturnThis(),
    on: vi.fn((event: string, handler: Function) => {
      (eventHandlers[event] ??= []).push(handler);
    }),
    off: vi.fn(),
    _fire(event: string, data?: any) {
      eventHandlers[event]?.forEach((h) => h(data));
    },
  };
  return marker;
}

export function createMockCircle() {
  return {
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    setLatLng: vi.fn().mockReturnThis(),
    setRadius: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({
      extend: vi.fn().mockReturnThis(),
    })),
  };
}

export function createMockPolyline() {
  return {
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    setLatLngs: vi.fn().mockReturnThis(),
  };
}

function createMockPolygon() {
  return {
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({
      extend: vi.fn().mockReturnThis(),
    })),
  };
}

function createMockLayerGroup() {
  return {
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
  };
}

function createMockTileLayer() {
  return {
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
  };
}

export function setupLeafletMock() {
  vi.mock('leaflet', () => ({
    default: {
      map: vi.fn(() => createMockMap()),
      marker: vi.fn((pos?: any) => createMockMarker(pos)),
      circle: vi.fn(() => createMockCircle()),
      polyline: vi.fn(() => createMockPolyline()),
      polygon: vi.fn(() => createMockPolygon()),
      tileLayer: vi.fn(() => createMockTileLayer()),
      layerGroup: vi.fn(() => createMockLayerGroup()),
      divIcon: vi.fn(() => ({})),
      latLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
      DomUtil: { addClass: vi.fn(), removeClass: vi.fn(), create: vi.fn() },
      LatLng: class {
        constructor(public lat: number, public lng: number) {}
      },
    },
    map: vi.fn(() => createMockMap()),
    marker: vi.fn((pos?: any) => createMockMarker(pos)),
    circle: vi.fn(() => createMockCircle()),
    polyline: vi.fn(() => createMockPolyline()),
    polygon: vi.fn(() => createMockPolygon()),
    tileLayer: vi.fn(() => createMockTileLayer()),
    layerGroup: vi.fn(() => createMockLayerGroup()),
    divIcon: vi.fn(() => ({})),
    latLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
    DomUtil: { addClass: vi.fn(), removeClass: vi.fn(), create: vi.fn() },
    LatLng: class {
      constructor(public lat: number, public lng: number) {}
    },
  }));
}
