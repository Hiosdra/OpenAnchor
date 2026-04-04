import { describe, it, expect } from 'vitest';
import { GeoUtils } from '../src/modules/anchor/geo-utils';

describe('GeoUtils class', () => {
  // ------------------------------------------------------------------
  // formatDist
  // ------------------------------------------------------------------
  describe('formatDist', () => {
    it('returns meters rounded when unit is m', () => {
      expect(GeoUtils.formatDist(42.7, 'm')).toBe(43);
    });

    it('converts to feet when unit is ft', () => {
      expect(GeoUtils.formatDist(10, 'ft')).toBe(33); // 10 * 3.28084 ≈ 32.8 → 33
    });

    it('handles zero', () => {
      expect(GeoUtils.formatDist(0, 'm')).toBe(0);
      expect(GeoUtils.formatDist(0, 'ft')).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // getDestinationPoint
  // ------------------------------------------------------------------
  describe('getDestinationPoint', () => {
    it('returns original point for zero distance', () => {
      const pt = GeoUtils.getDestinationPoint(54.0, 18.0, 0, 0);
      expect(pt.lat).toBeCloseTo(54.0, 4);
      expect(pt.lng).toBeCloseTo(18.0, 4);
    });

    it('moves north for bearing 0', () => {
      const pt = GeoUtils.getDestinationPoint(54.0, 18.0, 1000, 0);
      expect(pt.lat).toBeGreaterThan(54.0);
      expect(pt.lng).toBeCloseTo(18.0, 3);
    });

    it('moves east for bearing 90', () => {
      const pt = GeoUtils.getDestinationPoint(54.0, 18.0, 1000, 90);
      expect(pt.lat).toBeCloseTo(54.0, 2);
      expect(pt.lng).toBeGreaterThan(18.0);
    });

    it('moves south for bearing 180', () => {
      const pt = GeoUtils.getDestinationPoint(54.0, 18.0, 1000, 180);
      expect(pt.lat).toBeLessThan(54.0);
      expect(pt.lng).toBeCloseTo(18.0, 3);
    });

    it('distance of ~111km due north ≈ 1 degree latitude', () => {
      const pt = GeoUtils.getDestinationPoint(0, 0, 111_000, 0);
      expect(pt.lat).toBeCloseTo(1.0, 1);
    });
  });

  // ------------------------------------------------------------------
  // getBearing
  // ------------------------------------------------------------------
  describe('getBearing', () => {
    it('returns 0 for due north', () => {
      const bearing = GeoUtils.getBearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('returns ~90 for due east', () => {
      const bearing = GeoUtils.getBearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
      expect(bearing).toBeCloseTo(90, 0);
    });

    it('returns ~180 for due south', () => {
      const bearing = GeoUtils.getBearing({ lat: 1, lng: 0 }, { lat: 0, lng: 0 });
      expect(bearing).toBeCloseTo(180, 0);
    });

    it('returns ~270 for due west', () => {
      const bearing = GeoUtils.getBearing({ lat: 0, lng: 1 }, { lat: 0, lng: 0 });
      expect(bearing).toBeCloseTo(270, 0);
    });

    it('result is always in [0, 360)', () => {
      const bearing = GeoUtils.getBearing({ lat: 54, lng: 18 }, { lat: 55, lng: 17 });
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  // ------------------------------------------------------------------
  // getSectorPolygonPoints
  // ------------------------------------------------------------------
  describe('getSectorPolygonPoints', () => {
    it('returns 31 points (for 30 segments)', () => {
      const pts = GeoUtils.getSectorPolygonPoints({ lat: 54, lng: 18 }, 100, 90, 60);
      expect(pts).toHaveLength(31);
    });

    it('all points have lat and lng', () => {
      const pts = GeoUtils.getSectorPolygonPoints({ lat: 54, lng: 18 }, 100, 0, 90);
      for (const pt of pts) {
        expect(typeof pt.lat).toBe('number');
        expect(typeof pt.lng).toBe('number');
        expect(isNaN(pt.lat)).toBe(false);
        expect(isNaN(pt.lng)).toBe(false);
      }
    });

    it('zero width produces points at a single bearing', () => {
      const pts = GeoUtils.getSectorPolygonPoints({ lat: 54, lng: 18 }, 100, 90, 0);
      const uniqueLats = new Set(pts.map((p) => p.lat.toFixed(6)));
      expect(uniqueLats.size).toBe(1); // all at same bearing
    });
  });

  // ------------------------------------------------------------------
  // Constants
  // ------------------------------------------------------------------
  describe('constants', () => {
    it('M2FT is approximately 3.28', () => {
      expect(GeoUtils.M2FT).toBeCloseTo(3.28084, 3);
    });

    it('MPS2KNOTS is approximately 1.94', () => {
      expect(GeoUtils.MPS2KNOTS).toBeCloseTo(1.94384, 3);
    });
  });
});
