import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createMockMap, createMockMarker, createMockCircle, createMockPolyline } from './mocks/leaflet';

// ---------------------------------------------------------------------------
// Leaflet mock – must be declared before the hook import
// ---------------------------------------------------------------------------
let mockMap: ReturnType<typeof createMockMap>;
let markers: ReturnType<typeof createMockMarker>[];
let circles: ReturnType<typeof createMockCircle>[];
let polylines: ReturnType<typeof createMockPolyline>[];
let polygons: Array<{ addTo: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn>; getBounds: ReturnType<typeof vi.fn> }>;
let tileLayerInstances: Array<{ addTo: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }>;
let layerGroups: Array<{ addTo: ReturnType<typeof vi.fn>; clearLayers: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }>;

vi.mock('leaflet', () => {
  const actualCreateMockMap = () => {
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
  };

  const actualCreateMockMarker = () => {
    const eventHandlers: Record<string, Function[]> = {};
    return {
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
      setLatLng: vi.fn().mockReturnThis(),
      getLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
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
  };

  const actualCreateMockCircle = () => ({
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    setLatLng: vi.fn().mockReturnThis(),
    setRadius: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({ extend: vi.fn().mockReturnThis() })),
  });

  const actualCreateMockPolyline = () => ({
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    setLatLngs: vi.fn().mockReturnThis(),
  });

  const actualCreateMockPolygon = () => ({
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({ extend: vi.fn().mockReturnThis() })),
  });

  const actualCreateMockTileLayer = () => ({
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
  });

  const actualCreateMockLayerGroup = () => ({
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
  });

  // These arrays are populated by the factories so tests can inspect instances.
  // We assign them inside the factory; the test's beforeEach resets them via
  // the module-level arrays declared above.
  const mod = {
    default: {
      map: vi.fn(() => {
        // Use the module-level mockMap set in beforeEach
        return mockMap;
      }),
      marker: vi.fn(() => {
        const m = actualCreateMockMarker();
        markers.push(m as any);
        return m;
      }),
      circle: vi.fn(() => {
        const c = actualCreateMockCircle();
        circles.push(c as any);
        return c;
      }),
      polyline: vi.fn(() => {
        const p = actualCreateMockPolyline();
        polylines.push(p as any);
        return p;
      }),
      polygon: vi.fn(() => {
        const p = actualCreateMockPolygon();
        polygons.push(p as any);
        return p;
      }),
      tileLayer: vi.fn(() => {
        const t = actualCreateMockTileLayer();
        tileLayerInstances.push(t as any);
        return t;
      }),
      layerGroup: vi.fn(() => {
        const lg = actualCreateMockLayerGroup();
        layerGroups.push(lg as any);
        return lg;
      }),
      divIcon: vi.fn(() => ({})),
      latLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
      DomUtil: { addClass: vi.fn(), removeClass: vi.fn(), create: vi.fn() },
      LatLng: class {
        constructor(public lat: number, public lng: number) {}
      },
    },
  };
  return mod;
});

vi.mock('leaflet/dist/leaflet.css', () => ({}));

// Import after mocks are set up
import { useMap } from '../src/modules/anchor/hooks/useMap';
import L from 'leaflet';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const pos = (lat: number, lng: number) => ({ lat, lng }) as L.LatLng;

function setup(overrides: Partial<Parameters<typeof useMap>[0]> = {}) {
  const container = document.createElement('div');
  const containerRef = { current: container };
  const defaults = {
    containerRef,
    onMapDragStart: vi.fn(),
    onAnchorDragEnd: vi.fn(),
    ...overrides,
  };
  return { container, containerRef, ...renderHook(() => useMap(defaults)) };
}

const sectorOff = { enabled: false, bearing: 0, width: 360 };
const sectorOn = { enabled: true, bearing: 90, width: 60 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useMap', () => {
  beforeEach(() => {
    // Reset instance trackers
    const eventHandlers: Record<string, Function[]> = {};
    mockMap = {
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
    } as any;
    markers = [];
    circles = [];
    polylines = [];
    polygons = [];
    tileLayerInstances = [];
    layerGroups = [];

    vi.clearAllMocks();
    // Re-assign mockMap after clearAllMocks since the L.map factory references it
    (L.map as any).mockReturnValue(mockMap);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. initMap – map creation
  // -----------------------------------------------------------------------
  it('creates a Leaflet map on the container element', () => {
    const { container } = setup();

    expect(L.map).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ zoomControl: false }),
    );
    expect(mockMap.setView).toHaveBeenCalledWith([0, 0], 2);
  });

  it('creates two tile layers (OSM + satellite)', () => {
    setup();
    // tileLayer is called twice during init
    expect(L.tileLayer).toHaveBeenCalledTimes(2);
    expect((L.tileLayer as any).mock.calls[0][0]).toContain('openstreetmap');
    expect((L.tileLayer as any).mock.calls[1][0]).toContain('arcgisonline');
  });

  it('creates a track polyline and compass layerGroup on init', () => {
    setup();
    expect(L.polyline).toHaveBeenCalledTimes(1);
    expect(L.layerGroup).toHaveBeenCalledTimes(1);
    expect(polylines[0].addTo).toHaveBeenCalledWith(mockMap);
    expect(layerGroups[0].addTo).toHaveBeenCalledWith(mockMap);
  });

  // -----------------------------------------------------------------------
  // 2. setAnchor
  // -----------------------------------------------------------------------
  it('places an anchor marker at the given position', () => {
    const { result } = setup();
    const anchor = pos(52.23, 21.01);

    act(() => result.current.setAnchor(anchor));

    expect(L.marker).toHaveBeenCalledWith(
      anchor,
      expect.objectContaining({ draggable: true }),
    );
    // The marker created for the anchor (second marker call – first is not boat yet)
    const anchorMarker = markers[markers.length - 1];
    expect(anchorMarker.addTo).toHaveBeenCalledWith(mockMap);
  });

  it('removes previous anchor marker when setting a new one', () => {
    const { result } = setup();

    act(() => result.current.setAnchor(pos(52, 21)));
    const firstAnchor = markers[markers.length - 1];

    act(() => result.current.setAnchor(pos(53, 22)));

    expect(mockMap.removeLayer).toHaveBeenCalledWith(firstAnchor);
  });

  // -----------------------------------------------------------------------
  // 3. updateBoat
  // -----------------------------------------------------------------------
  it('creates boat marker on first call', () => {
    const { result } = setup();

    act(() => result.current.updateBoat(pos(52.23, 21.01), 10, null, false));

    // marker() + circle() for boat + accuracy
    expect(L.marker).toHaveBeenCalled();
    expect(L.circle).toHaveBeenCalled();
    const boatMarker = markers[markers.length - 1];
    expect(boatMarker.addTo).toHaveBeenCalledWith(mockMap);
    // Should center on first boat update
    expect(mockMap.setView).toHaveBeenCalledWith(pos(52.23, 21.01), 18);
  });

  it('moves existing boat marker on subsequent calls', () => {
    const { result } = setup();

    act(() => result.current.updateBoat(pos(52, 21), 10, null, false));
    const boatMarker = markers[markers.length - 1];
    const accuracyCircle = circles[circles.length - 1];

    act(() => result.current.updateBoat(pos(53, 22), 20, null, false));

    expect(boatMarker.setLatLng).toHaveBeenCalledWith(pos(53, 22));
    expect(accuracyCircle.setLatLng).toHaveBeenCalledWith(pos(53, 22));
    expect(accuracyCircle.setRadius).toHaveBeenCalledWith(20);
  });

  it('auto-centers map when autoCenter is true', () => {
    const { result } = setup();

    act(() => result.current.updateBoat(pos(52, 21), 10, null, false));
    mockMap.setView.mockClear();

    act(() => result.current.updateBoat(pos(53, 22), 10, null, true));
    expect(mockMap.setView).toHaveBeenCalledWith(pos(53, 22));
  });

  it('does not auto-center when autoCenter is false', () => {
    const { result } = setup();

    act(() => result.current.updateBoat(pos(52, 21), 10, null, false));
    mockMap.setView.mockClear();

    act(() => result.current.updateBoat(pos(53, 22), 10, null, false));
    // setView should NOT have been called for the update (only the init call)
    expect(mockMap.setView).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 4. drawSafeZone
  // -----------------------------------------------------------------------
  it('draws a circle when sector is disabled', () => {
    const { result } = setup();
    const anchor = pos(52.23, 21.01);

    act(() => result.current.drawSafeZone(anchor, 50, null, sectorOff, 'SAFE'));

    expect(L.circle).toHaveBeenCalledWith(
      anchor,
      expect.objectContaining({ radius: 50 }),
    );
  });

  it('draws a polygon when sector is enabled', () => {
    const { result } = setup();
    const anchor = pos(52.23, 21.01);

    act(() => result.current.drawSafeZone(anchor, 50, null, sectorOn, 'SAFE'));

    expect(L.polygon).toHaveBeenCalled();
    const sectorPoly = polygons[polygons.length - 1];
    expect(sectorPoly.addTo).toHaveBeenCalledWith(mockMap);
  });

  it('creates a buffer circle when bufferRadius > radius (circle mode)', () => {
    const { result } = setup();
    const anchor = pos(52.23, 21.01);

    act(() => result.current.drawSafeZone(anchor, 50, 70, sectorOff, 'SAFE'));

    // Two circles: safe zone + buffer
    const circleCalls = (L.circle as any).mock.calls;
    const bufferCall = circleCalls.find(
      (c: any[]) => c[1]?.radius === 70,
    );
    expect(bufferCall).toBeDefined();
  });

  it('creates a buffer polygon when bufferRadius > radius (sector mode)', () => {
    const { result } = setup();
    const anchor = pos(52.23, 21.01);

    act(() => result.current.drawSafeZone(anchor, 50, 70, sectorOn, 'SAFE'));

    // Two polygons: safe zone + buffer
    expect(polygons.length).toBeGreaterThanOrEqual(2);
  });

  it('uses correct colors based on alarm state', () => {
    const { result } = setup();
    const anchor = pos(52.23, 21.01);

    act(() => result.current.drawSafeZone(anchor, 50, null, sectorOff, 'ALARM'));

    const circleCall = (L.circle as any).mock.calls.find(
      (c: any[]) => c[1]?.radius === 50,
    );
    expect(circleCall[1].color).toBe('#ef4444');
    expect(circleCall[1].fillColor).toBe('#ef4444');
  });

  it('removes previous zone overlays before drawing new ones', () => {
    const { result } = setup();
    const anchor = pos(52.23, 21.01);

    act(() => result.current.drawSafeZone(anchor, 50, null, sectorOff, 'SAFE'));
    const firstCircle = circles.find((c) => c.addTo.mock.calls.length > 0)!;

    act(() => result.current.drawSafeZone(anchor, 60, null, sectorOff, 'WARNING'));

    expect(mockMap.removeLayer).toHaveBeenCalledWith(firstCircle);
  });

  // -----------------------------------------------------------------------
  // 5. updateTrack
  // -----------------------------------------------------------------------
  it('sets polyline latLngs with provided track points', () => {
    const { result } = setup();
    const points = [pos(52, 21), pos(52.1, 21.1), pos(52.2, 21.2)] as L.LatLng[];

    act(() => result.current.updateTrack(points));

    const trackLine = polylines[0];
    expect(trackLine.setLatLngs).toHaveBeenCalledWith(points);
  });

  // -----------------------------------------------------------------------
  // 6. fitSafeZone
  // -----------------------------------------------------------------------
  it('fits map bounds to the safe zone', () => {
    const { result } = setup();
    const anchor = pos(52.23, 21.01);

    act(() => result.current.drawSafeZone(anchor, 50, null, sectorOff, 'SAFE'));
    act(() => result.current.fitSafeZone());

    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ padding: [20, 20] }),
    );
  });

  // -----------------------------------------------------------------------
  // 7. clearAnchor (clearSafeZone)
  // -----------------------------------------------------------------------
  it('removes anchor, zone, and buffer overlays', () => {
    const { result } = setup();
    const anchor = pos(52.23, 21.01);

    act(() => result.current.setAnchor(anchor));
    act(() => result.current.drawSafeZone(anchor, 50, 70, sectorOff, 'SAFE'));

    act(() => result.current.clearAnchor());

    // removeLayer should have been called for anchor marker, safe zone circle, buffer circle
    expect(mockMap.removeLayer).toHaveBeenCalled();
    // compass rose cleared
    expect(layerGroups[0].clearLayers).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 8. toggleLayer
  // -----------------------------------------------------------------------
  it('switches from OSM to satellite on first toggle', () => {
    setup();
    const osmLayer = tileLayerInstances[0];
    const satLayer = tileLayerInstances[1];

    // The hook should have already returned toggleLayer
    const { result } = setup();

    act(() => {
      const layerType = result.current.toggleLayer();
      expect(layerType).toBe('sat');
    });
  });

  it('switches back to OSM on second toggle', () => {
    const { result } = setup();

    act(() => result.current.toggleLayer());
    act(() => {
      const layerType = result.current.toggleLayer();
      expect(layerType).toBe('osm');
    });
  });

  // -----------------------------------------------------------------------
  // 9. dragstart fires onMapDragStart callback
  // -----------------------------------------------------------------------
  it('calls onMapDragStart when map is dragged', () => {
    const onMapDragStart = vi.fn();
    setup({ onMapDragStart });

    // Simulate the map firing a dragstart event
    mockMap._fire('dragstart');

    expect(onMapDragStart).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 10. cleanup on unmount
  // -----------------------------------------------------------------------
  it('calls map.remove() on unmount', () => {
    const { unmount } = setup();

    unmount();

    expect(mockMap.remove).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 11. getMap
  // -----------------------------------------------------------------------
  it('returns the map instance via getMap()', () => {
    const { result } = setup();

    expect(result.current.getMap()).toBe(mockMap);
  });

  // -----------------------------------------------------------------------
  // 12. updatePhoneMarker
  // -----------------------------------------------------------------------
  it('creates a phone marker on first call', () => {
    const { result } = setup();

    act(() => result.current.updatePhoneMarker(pos(52.5, 21.5), 15));

    // Should have created a marker and a circle
    const phoneMarker = markers[markers.length - 1];
    expect(phoneMarker.addTo).toHaveBeenCalledWith(mockMap);
    expect(phoneMarker.bindTooltip).toHaveBeenCalledWith(
      'Android',
      expect.anything(),
    );
  });

  it('moves existing phone marker on subsequent calls', () => {
    const { result } = setup();

    act(() => result.current.updatePhoneMarker(pos(52.5, 21.5), 15));
    const phoneMarker = markers[markers.length - 1];

    act(() => result.current.updatePhoneMarker(pos(53.0, 22.0), 25));

    expect(phoneMarker.setLatLng).toHaveBeenCalledWith(pos(53.0, 22.0));
  });
});
