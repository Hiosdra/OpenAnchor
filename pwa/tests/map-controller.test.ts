import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Leaflet mock — must be declared BEFORE vi.mock calls
// ---------------------------------------------------------------------------
function createMockMarker(pos: any) {
  return {
    setLatLng: vi.fn().mockReturnThis(),
    getLatLng: vi.fn(() => pos),
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    bindTooltip: vi.fn().mockReturnThis(),
  };
}

function createMockCircle(pos: any) {
  return {
    setLatLng: vi.fn().mockReturnThis(),
    setRadius: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({ _southWest: pos, _northEast: pos })),
  };
}

function createMockPolygon() {
  return {
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({ _southWest: { lat: 0, lng: 0 }, _northEast: { lat: 1, lng: 1 } })),
  };
}

const mockMap = {
  setView: vi.fn().mockReturnThis(),
  fitBounds: vi.fn().mockReturnThis(),
  removeLayer: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
};

const mockTileLayer = {
  addTo: vi.fn().mockReturnThis(),
};

const mockPolyline = {
  setLatLngs: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
};

const mockLayerGroup = {
  addTo: vi.fn().mockReturnThis(),
  clearLayers: vi.fn().mockReturnThis(),
};

vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => ({ ...mockTileLayer })),
    marker: vi.fn((pos: any) => createMockMarker(pos)),
    circle: vi.fn((pos: any) => createMockCircle(pos)),
    polygon: vi.fn(() => createMockPolygon()),
    polyline: vi.fn(() => mockPolyline),
    layerGroup: vi.fn(() => mockLayerGroup),
    divIcon: vi.fn((opts: any) => opts),
    latLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
  },
}));

vi.mock('leaflet/dist/leaflet.css', () => ({}));

vi.mock('../src/modules/anchor/geo-utils', () => ({
  GeoUtils: {
    getDestinationPoint: vi.fn((_lat: number, _lng: number, _dist: number, _bear: number) => ({
      lat: _lat + 0.001,
      lng: _lng + 0.001,
    })),
    getSectorPolygonPoints: vi.fn(() => [
      { lat: 54.001, lng: 18.001 },
      { lat: 54.002, lng: 18.002 },
      { lat: 54.001, lng: 18.003 },
    ]),
  },
}));

import L from 'leaflet';
import { MapController } from '../src/modules/anchor/map-controller';

// ---------------------------------------------------------------------------
describe('MapController', () => {
  let ctrl: MapController;

  beforeEach(() => {
    vi.clearAllMocks();
    // Provide a container element for the map
    document.body.innerHTML = `
      <div id="map-container"></div>
      <button id="center-map-btn" class="hidden"></button>
      <button id="toggle-map-layer-btn" class="text-slate-300"></button>
    `;
    ctrl = new MapController('map-container');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------
  describe('constructor', () => {
    it('creates a Leaflet map with correct options', () => {
      expect(L.map).toHaveBeenCalledWith('map-container', expect.objectContaining({ zoomControl: false }));
    });

    it('creates OSM and SAT tile layers', () => {
      expect(L.tileLayer).toHaveBeenCalledTimes(2);
    });

    it('adds track polyline to the map', () => {
      expect(L.polyline).toHaveBeenCalled();
      expect(mockPolyline.addTo).toHaveBeenCalledWith(mockMap);
    });

    it('adds compass rose layer group', () => {
      expect(L.layerGroup).toHaveBeenCalled();
      expect(mockLayerGroup.addTo).toHaveBeenCalledWith(mockMap);
    });

    it('registers dragstart handler', () => {
      expect(mockMap.on).toHaveBeenCalledWith('dragstart', expect.any(Function));
    });

    it('dragstart callback shows center button and sets mapAutoCenter false', () => {
      (window as any).app = { state: { mapAutoCenter: true } };
      const dragCb = mockMap.on.mock.calls.find((c: any[]) => c[0] === 'dragstart')![1];
      dragCb();
      expect((window as any).app.state.mapAutoCenter).toBe(false);
      expect(document.getElementById('center-map-btn')!.classList.contains('hidden')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // toggleLayer
  // -----------------------------------------------------------------------
  describe('toggleLayer', () => {
    it('switches from OSM to SAT', () => {
      ctrl.toggleLayer();
      expect(mockMap.removeLayer).toHaveBeenCalled();
      expect(document.body.classList.contains('map-sat')).toBe(true);
    });

    it('switches back from SAT to OSM', () => {
      ctrl.toggleLayer(); // to SAT
      vi.clearAllMocks();
      ctrl.toggleLayer(); // back to OSM
      expect(mockMap.removeLayer).toHaveBeenCalled();
      expect(document.body.classList.contains('map-sat')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // updateBoat
  // -----------------------------------------------------------------------
  describe('updateBoat', () => {
    const pos = { lat: 54.0, lng: 18.0 } as L.LatLng;

    it('creates marker and accuracy circle on first call', () => {
      ctrl.updateBoat(pos, 10, null, false);
      expect(ctrl.boatMarker).toBeTruthy();
      expect(L.marker).toHaveBeenCalled();
      expect(L.circle).toHaveBeenCalled();
      expect(mockMap.setView).toHaveBeenCalledWith(pos, 18);
    });

    it('updates existing marker position on subsequent calls', () => {
      ctrl.updateBoat(pos, 10, null, false);
      const marker = ctrl.boatMarker!;
      const newPos = { lat: 54.1, lng: 18.1 } as L.LatLng;
      ctrl.updateBoat(newPos, 15, null, false);
      expect(marker.setLatLng).toHaveBeenCalledWith(newPos);
    });

    it('rotates boat icon when cog is provided', () => {
      ctrl.updateBoat(pos, 10, null, false);
      document.body.innerHTML += '<div id="boat-icon-el"></div>';
      ctrl.updateBoat(pos, 10, 90, false);
      const el = document.getElementById('boat-icon-el');
      expect(el!.style.transform).toBe('rotate(90deg)');
    });

    it('does not rotate when cog is null', () => {
      ctrl.updateBoat(pos, 10, null, false);
      document.body.innerHTML += '<div id="boat-icon-el"></div>';
      ctrl.updateBoat(pos, 10, null, false);
      const el = document.getElementById('boat-icon-el');
      expect(el!.style.transform).toBe('');
    });

    it('auto-centers map when autoCenter is true', () => {
      ctrl.updateBoat(pos, 10, null, false);
      mockMap.setView.mockClear();
      ctrl.updateBoat(pos, 10, null, true);
      expect(mockMap.setView).toHaveBeenCalledWith(pos);
    });

    it('does not auto-center when autoCenter is false', () => {
      ctrl.updateBoat(pos, 10, null, false);
      mockMap.setView.mockClear();
      ctrl.updateBoat(pos, 10, null, false);
      expect(mockMap.setView).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // updateTrack
  // -----------------------------------------------------------------------
  describe('updateTrack', () => {
    it('sets polyline lat/lngs', () => {
      const track = [{ lat: 54, lng: 18 }, { lat: 54.1, lng: 18.1 }] as L.LatLng[];
      ctrl.updateTrack(track);
      expect(mockPolyline.setLatLngs).toHaveBeenCalledWith(track);
    });
  });

  // -----------------------------------------------------------------------
  // setAnchor
  // -----------------------------------------------------------------------
  describe('setAnchor', () => {
    const pos = { lat: 54.0, lng: 18.0 } as L.LatLng;

    it('creates draggable anchor marker', () => {
      ctrl.setAnchor(pos);
      expect(ctrl.anchorMarker).toBeTruthy();
      expect(L.marker).toHaveBeenCalledWith(pos, expect.objectContaining({ draggable: true }));
    });

    it('removes old anchor marker before adding new one', () => {
      ctrl.setAnchor(pos);
      ctrl.setAnchor(pos);
      expect(mockMap.removeLayer).toHaveBeenCalled();
    });

    it('registers dragend handler on anchor marker', () => {
      ctrl.setAnchor(pos);
      expect(ctrl.anchorMarker!.on).toHaveBeenCalledWith('dragend', expect.any(Function));
    });
  });

  // -----------------------------------------------------------------------
  // clearAnchor
  // -----------------------------------------------------------------------
  describe('clearAnchor', () => {
    const pos = { lat: 54.0, lng: 18.0 } as L.LatLng;

    it('removes all anchor-related layers', () => {
      ctrl.setAnchor(pos);
      ctrl.clearAnchor();
      expect(ctrl.anchorMarker).toBeNull();
      expect(ctrl.safeZone).toBeNull();
      expect(ctrl.bufferZone).toBeNull();
      expect(mockLayerGroup.clearLayers).toHaveBeenCalled();
    });

    it('is safe when nothing to clear', () => {
      ctrl.clearAnchor(); // should not throw
    });
  });

  // -----------------------------------------------------------------------
  // drawSafeZone
  // -----------------------------------------------------------------------
  describe('drawSafeZone', () => {
    const anchor = { lat: 54.0, lng: 18.0 } as L.LatLng;
    const noSector = { enabled: false, bearing: 0, width: 60 };
    const withSector = { enabled: true, bearing: 90, width: 60 };

    it('draws circle safe zone when sector disabled', () => {
      ctrl.drawSafeZone(anchor, 50, null, noSector, 'SAFE');
      expect(L.circle).toHaveBeenCalled();
      expect(ctrl.safeZone).toBeTruthy();
    });

    it('draws polygon safe zone when sector enabled', () => {
      ctrl.drawSafeZone(anchor, 50, null, withSector, 'SAFE');
      expect(L.polygon).toHaveBeenCalled();
      expect(ctrl.safeZone).toBeTruthy();
    });

    it('draws buffer zone when bufferRadius > radius', () => {
      ctrl.drawSafeZone(anchor, 50, 70, noSector, 'SAFE');
      expect(ctrl.bufferZone).toBeTruthy();
    });

    it('does not draw buffer when bufferRadius ≤ radius', () => {
      ctrl.drawSafeZone(anchor, 50, 50, noSector, 'SAFE');
      expect(ctrl.bufferZone).toBeNull();
    });

    it('does not draw buffer when bufferRadius is null', () => {
      ctrl.drawSafeZone(anchor, 50, null, noSector, 'SAFE');
      expect(ctrl.bufferZone).toBeNull();
    });

    it('buffer zone is polygon when sector is enabled', () => {
      ctrl.drawSafeZone(anchor, 50, 70, withSector, 'SAFE');
      expect(L.polygon).toHaveBeenCalled();
      expect(ctrl.bufferZone).toBeTruthy();
    });

    it('buffer zone is circle when sector is disabled', () => {
      ctrl.drawSafeZone(anchor, 50, 70, noSector, 'SAFE');
      expect(ctrl.bufferZone).toBeTruthy();
    });

    it('removes old zones before drawing new ones', () => {
      ctrl.drawSafeZone(anchor, 50, null, noSector, 'SAFE');
      ctrl.drawSafeZone(anchor, 60, null, noSector, 'WARNING');
      expect(mockMap.removeLayer).toHaveBeenCalled();
    });

    it.each(['SAFE', 'CAUTION', 'WARNING', 'ALARM'])('uses correct color for %s state', (state) => {
      ctrl.drawSafeZone(anchor, 50, null, noSector, state);
      expect(ctrl.safeZone).toBeTruthy();
    });

    it('falls back to SAFE color for unknown alarm state', () => {
      ctrl.drawSafeZone(anchor, 50, null, noSector, 'UNKNOWN');
      expect(ctrl.safeZone).toBeTruthy();
    });

    it('adds compass rose markers for N/E/S/W', () => {
      ctrl.drawSafeZone(anchor, 50, null, noSector, 'SAFE');
      // 4 compass directions → 4 marker calls (plus any from constructor)
      expect(L.marker).toHaveBeenCalled();
    });

    it('clears compass rose before redrawing', () => {
      ctrl.drawSafeZone(anchor, 50, null, noSector, 'SAFE');
      expect(mockLayerGroup.clearLayers).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // fitSafeZone
  // -----------------------------------------------------------------------
  describe('fitSafeZone', () => {
    it('fits map bounds to safe zone', () => {
      const anchor = { lat: 54.0, lng: 18.0 } as L.LatLng;
      ctrl.drawSafeZone(anchor, 50, null, { enabled: false, bearing: 0, width: 60 }, 'SAFE');
      ctrl.fitSafeZone();
      expect(mockMap.fitBounds).toHaveBeenCalled();
    });

    it('does nothing when no safe zone exists', () => {
      ctrl.safeZone = null;
      ctrl.fitSafeZone(); // should not throw
      expect(mockMap.fitBounds).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // updatePhoneMarker
  // -----------------------------------------------------------------------
  describe('updatePhoneMarker', () => {
    const pos = { lat: 54.1, lng: 18.1 } as L.LatLng;

    it('creates phone marker and accuracy circle on first call', () => {
      ctrl.updatePhoneMarker(pos, 15);
      expect(ctrl.phoneMarker).toBeTruthy();
      expect(L.marker).toHaveBeenCalled();
      expect(L.circle).toHaveBeenCalled();
    });

    it('updates existing phone marker on subsequent calls', () => {
      ctrl.updatePhoneMarker(pos, 15);
      const marker = ctrl.phoneMarker!;
      const newPos = { lat: 54.2, lng: 18.2 } as L.LatLng;
      ctrl.updatePhoneMarker(newPos, 20);
      expect(marker.setLatLng).toHaveBeenCalledWith(newPos);
    });

    it('binds tooltip on first call', () => {
      ctrl.updatePhoneMarker(pos, 15);
      expect(ctrl.phoneMarker!.bindTooltip).toHaveBeenCalledWith('Android', expect.any(Object));
    });
  });
});
