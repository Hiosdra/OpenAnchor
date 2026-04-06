import { useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoUtils } from '../geo-utils';
import { getZoneColor } from '../map-utils';

interface UseMapParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onMapDragStart?: () => void;
  onAnchorDragEnd?: (newPos: L.LatLng) => void;
}

const BOAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L20 20L12 17L4 20L12 2Z"/></svg>`;

function createIcons(): Record<string, L.DivIcon> {
  return {
    boat: L.divIcon({
      html: `<div id="boat-icon-el" class="boat-icon-wrapper" style="width: 24px; height: 24px; filter: drop-shadow(0 0 4px rgba(59,130,246,0.8));">${BOAT_SVG}</div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    anchor: L.divIcon({
      html: `<div class="bg-white rounded-full p-1 border-2 border-slate-700 flex items-center justify-center w-8 h-8 shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%23334155" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8M5 12H2a10 10 0 0 0 20 0h-3M9 12v2a3 3 0 0 0 6 0v-2M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    }),
    phone: L.divIcon({
      html: `<div class="bg-purple-600 rounded-full p-1 border-2 border-purple-300 flex items-center justify-center w-7 h-7 shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg></div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  };
}

export function useMap({ containerRef, onMapDragStart, onAnchorDragEnd }: UseMapParams) {
  const mapRef = useRef<L.Map | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satLayerRef = useRef<L.TileLayer | null>(null);
  const currentLayerRef = useRef<'osm' | 'sat'>('osm');
  const boatMarkerRef = useRef<L.Marker | null>(null);
  const anchorMarkerRef = useRef<L.Marker | null>(null);
  const safeZoneRef = useRef<L.Circle | L.Polygon | null>(null);
  const bufferZoneRef = useRef<L.Circle | L.Polygon | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const phoneMarkerRef = useRef<L.Marker | null>(null);
  const phoneAccuracyCircleRef = useRef<L.Circle | null>(null);
  const trackPolylineRef = useRef<L.Polyline | null>(null);
  const compassRoseRef = useRef<L.LayerGroup | null>(null);
  const iconsRef = useRef<Record<string, L.DivIcon> | null>(null);

  const onMapDragStartRef = useRef(onMapDragStart);
  onMapDragStartRef.current = onMapDragStart;
  const onAnchorDragEndRef = useRef(onAnchorDragEnd);
  onAnchorDragEndRef.current = onAnchorDragEnd;

  // Initialize map when container is available
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    });
    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: '&copy; Esri' },
    );

    osmLayerRef.current = osmLayer;
    satLayerRef.current = satLayer;
    currentLayerRef.current = 'osm';

    const map = L.map(container, {
      zoomControl: false,
      layers: [osmLayer],
    }).setView([0, 0], 2);

    const trackLine = L.polyline([], {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.6,
      dashArray: '5, 5',
    }).addTo(map);

    const compass = L.layerGroup().addTo(map);

    mapRef.current = map;
    trackPolylineRef.current = trackLine;
    compassRoseRef.current = compass;
    iconsRef.current = createIcons();

    map.on('dragstart', () => {
      onMapDragStartRef.current?.();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      boatMarkerRef.current = null;
      anchorMarkerRef.current = null;
      safeZoneRef.current = null;
      bufferZoneRef.current = null;
      accuracyCircleRef.current = null;
      phoneMarkerRef.current = null;
      phoneAccuracyCircleRef.current = null;
      trackPolylineRef.current = null;
      compassRoseRef.current = null;
    };
  }, [containerRef]);

  const updateBoat = useCallback(
    (pos: L.LatLng, accuracy: number, cog: number | null, autoCenter: boolean) => {
      const map = mapRef.current;
      if (!map || !iconsRef.current) return;

      if (!boatMarkerRef.current) {
        boatMarkerRef.current = L.marker(pos, {
          icon: iconsRef.current.boat,
          zIndexOffset: 1000,
        }).addTo(map);
        accuracyCircleRef.current = L.circle(pos, {
          radius: accuracy,
          color: '#3b82f6',
          weight: 1,
          fillOpacity: 0.1,
          interactive: false,
        }).addTo(map);
        map.setView(pos, 18);
      } else {
        boatMarkerRef.current.setLatLng(pos);
        accuracyCircleRef.current!.setLatLng(pos);
        accuracyCircleRef.current!.setRadius(accuracy);
      }

      if (cog !== null) {
        const el = document.getElementById('boat-icon-el');
        if (el) el.style.transform = `rotate(${cog}deg)`;
      }

      if (autoCenter) map.setView(pos);
    },
    [],
  );

  const setAnchor = useCallback((pos: L.LatLng) => {
    const map = mapRef.current;
    if (!map || !iconsRef.current) return;

    if (anchorMarkerRef.current) map.removeLayer(anchorMarkerRef.current);

    anchorMarkerRef.current = L.marker(pos, {
      icon: iconsRef.current.anchor,
      draggable: true,
    }).addTo(map);

    anchorMarkerRef.current.on('dragend', (e: L.DragEndEvent) => {
      const newPos = (e.target as L.Marker).getLatLng();
      onAnchorDragEndRef.current?.(newPos);
    });
  }, []);

  const clearAnchor = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (anchorMarkerRef.current) map.removeLayer(anchorMarkerRef.current);
    if (safeZoneRef.current) map.removeLayer(safeZoneRef.current);
    if (bufferZoneRef.current) map.removeLayer(bufferZoneRef.current);
    compassRoseRef.current?.clearLayers();

    anchorMarkerRef.current = null;
    safeZoneRef.current = null;
    bufferZoneRef.current = null;
  }, []);

  const drawSafeZone = useCallback(
    (
      anchorPos: L.LatLng,
      radius: number,
      bufferRadius: number | null,
      sector: { enabled: boolean; bearing: number; width: number },
      alarmState: string,
    ) => {
      const map = mapRef.current;
      if (!map) return;

      if (safeZoneRef.current) {
        map.removeLayer(safeZoneRef.current);
        safeZoneRef.current = null;
      }
      if (bufferZoneRef.current) {
        map.removeLayer(bufferZoneRef.current);
        bufferZoneRef.current = null;
      }
      compassRoseRef.current?.clearLayers();

      // Compass rose labels
      const dirs = [
        { l: 'N', b: 0 },
        { l: 'E', b: 90 },
        { l: 'S', b: 180 },
        { l: 'W', b: 270 },
      ];
      dirs.forEach((d) => {
        const pt = GeoUtils.getDestinationPoint(anchorPos.lat, anchorPos.lng, radius, d.b);
        const icon = L.divIcon({
          html: `<div class="text-white font-bold text-[10px] bg-slate-800/80 rounded px-1 border border-slate-600 shadow-sm">${d.l}</div>`,
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker(pt, { icon, interactive: false }).addTo(compassRoseRef.current!);
      });

      const zoneColor = getZoneColor(alarmState);
      const style = { ...zoneColor, fillOpacity: 0.15, weight: 2 };

      if (sector.enabled) {
        const pts = GeoUtils.getSectorPolygonPoints(
          anchorPos,
          radius,
          sector.bearing,
          sector.width,
        );
        pts.push(anchorPos);
        safeZoneRef.current = L.polygon(pts, style).addTo(map);
      } else {
        safeZoneRef.current = L.circle(anchorPos, { radius, ...style }).addTo(map);
      }

      if (bufferRadius && bufferRadius > radius) {
        const bufferStyle = {
          color: zoneColor.color,
          fillOpacity: 0.05,
          weight: 1,
          dashArray: '8, 4',
        };
        if (sector.enabled) {
          const bpts = GeoUtils.getSectorPolygonPoints(
            anchorPos,
            bufferRadius,
            sector.bearing,
            sector.width,
          );
          bpts.push(anchorPos);
          bufferZoneRef.current = L.polygon(bpts, bufferStyle).addTo(map);
        } else {
          bufferZoneRef.current = L.circle(anchorPos, {
            radius: bufferRadius,
            ...bufferStyle,
          }).addTo(map);
        }
      }
    },
    [],
  );

  const fitSafeZone = useCallback(() => {
    if (safeZoneRef.current && mapRef.current) {
      mapRef.current.fitBounds(safeZoneRef.current.getBounds(), { padding: [20, 20] });
    }
  }, []);

  const toggleLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map || !osmLayerRef.current || !satLayerRef.current) return;

    if (currentLayerRef.current === 'osm') {
      map.removeLayer(osmLayerRef.current);
      satLayerRef.current.addTo(map);
      currentLayerRef.current = 'sat';
    } else {
      map.removeLayer(satLayerRef.current);
      osmLayerRef.current.addTo(map);
      currentLayerRef.current = 'osm';
    }

    return currentLayerRef.current;
  }, []);

  const updateTrack = useCallback((positions: L.LatLng[]) => {
    trackPolylineRef.current?.setLatLngs(positions);
  }, []);

  const updatePhoneMarker = useCallback((pos: L.LatLng, accuracy: number) => {
    const map = mapRef.current;
    if (!map || !iconsRef.current) return;

    if (!phoneMarkerRef.current) {
      phoneMarkerRef.current = L.marker(pos, {
        icon: iconsRef.current.phone,
        zIndexOffset: 900,
      }).addTo(map);
      phoneMarkerRef.current.bindTooltip('Android', {
        permanent: false,
        direction: 'top',
        offset: [0, -14],
      });
      phoneAccuracyCircleRef.current = L.circle(pos, {
        radius: accuracy,
        color: '#a855f7',
        weight: 1,
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(map);
    } else {
      phoneMarkerRef.current.setLatLng(pos);
      phoneAccuracyCircleRef.current!.setLatLng(pos);
      phoneAccuracyCircleRef.current!.setRadius(accuracy);
    }
  }, []);

  const getMap = useCallback(() => mapRef.current, []);

  return {
    updateBoat,
    setAnchor,
    clearAnchor,
    drawSafeZone,
    fitSafeZone,
    toggleLayer,
    updateTrack,
    updatePhoneMarker,
    getMap,
  };
}
