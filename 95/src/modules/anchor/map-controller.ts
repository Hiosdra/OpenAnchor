import L from 'leaflet';
// @ts-expect-error -- CSS import handled by Vite
import 'leaflet/dist/leaflet.css';
import { GeoUtils } from './geo-utils';

export class MapController {
  map: L.Map;
  private osmLayer: L.TileLayer;
  private satLayer: L.TileLayer;
  private currentLayer: L.TileLayer;
  boatMarker: L.Marker | null = null;
  anchorMarker: L.Marker | null = null;
  safeZone: L.Circle | L.Polygon | null = null;
  bufferZone: L.Circle | L.Polygon | null = null;
  private accuracyCircle: L.Circle | null = null;
  phoneMarker: L.Marker | null = null;
  private phoneAccuracyCircle: L.Circle | null = null;
  private trackPolyline: L.Polyline;
  private compassRose: L.LayerGroup;
  private icons: Record<string, L.DivIcon>;

  constructor(containerId: string) {
    this.osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    this.satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: '&copy; Esri' }
    );
    this.currentLayer = this.osmLayer;

    this.map = L.map(containerId, { zoomControl: false, layers: [this.currentLayer] }).setView([0, 0], 2);
    this.trackPolyline = L.polyline([], { color: '#3b82f6', weight: 3, opacity: 0.6, dashArray: '5, 5' }).addTo(
      this.map
    );
    this.compassRose = L.layerGroup().addTo(this.map);

    const boatSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L20 20L12 17L4 20L12 2Z"/></svg>`;
    this.icons = {
      boat: L.divIcon({
        html: `<div id="boat-icon-el" class="boat-icon-wrapper" style="width: 24px; height: 24px; filter: drop-shadow(0 0 4px rgba(59,130,246,0.8));">${boatSvg}</div>`,
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

    this.map.on('dragstart', () => {
      if ((window as any).app) (window as any).app.state.mapAutoCenter = false;
      document.getElementById('center-map-btn')!.classList.remove('hidden');
    });
  }

  toggleLayer() {
    this.map.removeLayer(this.currentLayer);
    const btn = document.getElementById('toggle-map-layer-btn')!;
    if (this.currentLayer === this.osmLayer) {
      this.currentLayer = this.satLayer;
      document.body.classList.add('map-sat');
      btn.classList.replace('text-slate-300', 'text-blue-400');
    } else {
      this.currentLayer = this.osmLayer;
      document.body.classList.remove('map-sat');
      btn.classList.replace('text-blue-400', 'text-slate-300');
    }
    this.currentLayer.addTo(this.map);
  }

  updateBoat(pos: L.LatLng, accuracy: number, cog: number | null, autoCenter: boolean) {
    if (!this.boatMarker) {
      this.boatMarker = L.marker(pos, { icon: this.icons.boat, zIndexOffset: 1000 }).addTo(this.map);
      this.accuracyCircle = L.circle(pos, {
        radius: accuracy,
        color: '#3b82f6',
        weight: 1,
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(this.map);
      this.map.setView(pos, 18);
    } else {
      this.boatMarker.setLatLng(pos);
      this.accuracyCircle!.setLatLng(pos);
      this.accuracyCircle!.setRadius(accuracy);
    }
    if (cog !== null) {
      const el = document.getElementById('boat-icon-el');
      if (el) el.style.transform = `rotate(${cog}deg)`;
    }
    if (autoCenter) this.map.setView(pos);
  }

  updateTrack(trackArr: L.LatLng[]) {
    this.trackPolyline.setLatLngs(trackArr);
  }

  setAnchor(pos: L.LatLng) {
    if (this.anchorMarker) this.map.removeLayer(this.anchorMarker);
    this.anchorMarker = L.marker(pos, { icon: this.icons.anchor, draggable: true }).addTo(this.map);

    this.anchorMarker.on('dragend', (e: L.DragEndEvent) => {
      const newPos = (e.target as L.Marker).getLatLng();
      const app = (window as any).app;
      if (app?.state?.isAnchored) {
        app.state.anchorPos = newPos;
        app.alarmEngine.reset();
        app.state.alarmState = 'SAFE';
        app._recalculateZone();
        app._recalculate();
        app._persistActiveState();
        if (app.syncCtrl?.isConnected) app.syncCtrl.sendFullSync();
      }
    });
  }

  clearAnchor() {
    if (this.anchorMarker) this.map.removeLayer(this.anchorMarker);
    if (this.safeZone) this.map.removeLayer(this.safeZone);
    if (this.bufferZone) this.map.removeLayer(this.bufferZone);
    this.compassRose.clearLayers();
    this.anchorMarker = null;
    this.safeZone = null;
    this.bufferZone = null;
  }

  drawSafeZone(
    anchorPos: L.LatLng,
    radius: number,
    bufferRadius: number | null,
    sectorParams: { enabled: boolean; bearing: number; width: number },
    alarmState: string
  ) {
    if (this.safeZone) {
      this.map.removeLayer(this.safeZone);
      this.safeZone = null;
    }
    if (this.bufferZone) {
      this.map.removeLayer(this.bufferZone);
      this.bufferZone = null;
    }
    this.compassRose.clearLayers();

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
      L.marker(pt, { icon, interactive: false }).addTo(this.compassRose);
    });

    const zoneColors: Record<string, { color: string; fillColor: string }> = {
      SAFE: { color: '#22c55e', fillColor: '#22c55e' },
      CAUTION: { color: '#eab308', fillColor: '#eab308' },
      WARNING: { color: '#f97316', fillColor: '#f97316' },
      ALARM: { color: '#ef4444', fillColor: '#ef4444' },
    };
    const style = { ...(zoneColors[alarmState] || zoneColors.SAFE), fillOpacity: 0.15, weight: 2 };

    if (sectorParams.enabled) {
      const pts = GeoUtils.getSectorPolygonPoints(anchorPos, radius, sectorParams.bearing, sectorParams.width);
      pts.push(anchorPos);
      this.safeZone = L.polygon(pts, style).addTo(this.map);
    } else {
      this.safeZone = L.circle(anchorPos, { radius, ...style }).addTo(this.map);
    }

    if (bufferRadius && bufferRadius > radius) {
      const bufferStyle = {
        color: zoneColors[alarmState]?.color || '#22c55e',
        fillOpacity: 0.05,
        weight: 1,
        dashArray: '8, 4',
      };
      if (sectorParams.enabled) {
        const bpts = GeoUtils.getSectorPolygonPoints(anchorPos, bufferRadius, sectorParams.bearing, sectorParams.width);
        bpts.push(anchorPos);
        this.bufferZone = L.polygon(bpts, bufferStyle).addTo(this.map);
      } else {
        this.bufferZone = L.circle(anchorPos, { radius: bufferRadius, ...bufferStyle }).addTo(this.map);
      }
    }
  }

  fitSafeZone() {
    if (this.safeZone) this.map.fitBounds(this.safeZone.getBounds(), { padding: [20, 20] });
  }

  updatePhoneMarker(pos: L.LatLng, accuracy: number) {
    if (!this.phoneMarker) {
      this.phoneMarker = L.marker(pos, { icon: this.icons.phone, zIndexOffset: 900 }).addTo(this.map);
      this.phoneMarker.bindTooltip('Android', { permanent: false, direction: 'top', offset: [0, -14] });
      this.phoneAccuracyCircle = L.circle(pos, {
        radius: accuracy,
        color: '#a855f7',
        weight: 1,
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(this.map);
    } else {
      this.phoneMarker.setLatLng(pos);
      this.phoneAccuracyCircle!.setLatLng(pos);
      this.phoneAccuracyCircle!.setRadius(accuracy);
    }
  }
}
