import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  ALARM_STATES,
  getAlarmState,
  calculateChainLength,
  calculateSwingRadius,
  calculateBearing,
  isInSector,
  calculateSOG,
  calculateCOG,
  isValidCoordinates
} from '../js/anchor-utils.js';

describe('Anchor Utils - GPS Calculations', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Distance from New York to London (approx 5570 km)
      const lat1 = 40.7128;
      const lon1 = -74.0060;
      const lat2 = 51.5074;
      const lon2 = -0.1278;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 5,570,000 meters
      expect(distance).toBeGreaterThan(5500000);
      expect(distance).toBeLessThan(5600000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(50.0, 10.0, 50.0, 10.0);
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // 1 degree of latitude is approximately 111km
      const lat1 = 0;
      const lon1 = 0;
      const lat2 = 1;
      const lon2 = 0;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 111,000 meters
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    it('should handle negative coordinates', () => {
      const distance = calculateDistance(-33.8688, 151.2093, -34.0, 151.0);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('getAlarmState', () => {
    it('should return SAFE when within 70% of radius', () => {
      const state = getAlarmState(50, 100);
      expect(state).toBe(ALARM_STATES.SAFE);
    });

    it('should return CAUTION when between 70% and 85% of radius', () => {
      const state = getAlarmState(75, 100);
      expect(state).toBe(ALARM_STATES.CAUTION);
    });

    it('should return WARNING when between 85% and 100% of radius', () => {
      const state = getAlarmState(90, 100);
      expect(state).toBe(ALARM_STATES.WARNING);
    });

    it('should return ALARM when beyond radius', () => {
      const state = getAlarmState(110, 100);
      expect(state).toBe(ALARM_STATES.ALARM);
    });

    it('should handle exact boundaries', () => {
      expect(getAlarmState(70, 100)).toBe(ALARM_STATES.SAFE);
      expect(getAlarmState(85, 100)).toBe(ALARM_STATES.CAUTION);
      expect(getAlarmState(100, 100)).toBe(ALARM_STATES.WARNING);
      expect(getAlarmState(101, 100)).toBe(ALARM_STATES.ALARM);
    });

    it('should work with different radius values', () => {
      expect(getAlarmState(35, 50)).toBe(ALARM_STATES.SAFE); // 35/50 = 0.7 = exactly 70%
      expect(getAlarmState(150, 200)).toBe(ALARM_STATES.CAUTION); // 150/200 = 0.75 (between 70-85%)
    });
  });

  describe('calculateChainLength', () => {
    it('should calculate chain length with default ratio of 3', () => {
      const chainLength = calculateChainLength(10);
      expect(chainLength).toBe(30);
    });

    it('should calculate chain length with custom ratio', () => {
      const chainLength = calculateChainLength(10, 5);
      expect(chainLength).toBe(50);
    });

    it('should handle decimal depths', () => {
      const chainLength = calculateChainLength(7.5, 4);
      expect(chainLength).toBe(30);
    });

    it('should handle zero depth', () => {
      const chainLength = calculateChainLength(0, 3);
      expect(chainLength).toBe(0);
    });
  });

  describe('calculateSwingRadius', () => {
    it('should calculate swing radius', () => {
      const radius = calculateSwingRadius(10, 30);

      // Using Pythagorean theorem: sqrt(30^2 - 10^2) ≈ 28.3
      expect(radius).toBeGreaterThan(28);
      expect(radius).toBeLessThan(29);
    });

    it('should use fallback when chain is too short', () => {
      const radius = calculateSwingRadius(10, 15);

      // When chain < depth * sqrt(2), use 80% of chain length
      expect(radius).toBe(15 * 0.8);
    });

    it('should handle equal depth and chain length', () => {
      const radius = calculateSwingRadius(10, 10);
      expect(radius).toBe(10 * 0.8);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing from point A to point B', () => {
      // North direction
      const bearing = calculateBearing(50.0, 0.0, 51.0, 0.0);
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('should calculate bearing for East direction', () => {
      const bearing = calculateBearing(0.0, 0.0, 0.0, 1.0);
      expect(bearing).toBeCloseTo(90, 0);
    });

    it('should calculate bearing for South direction', () => {
      const bearing = calculateBearing(51.0, 0.0, 50.0, 0.0);
      expect(bearing).toBeCloseTo(180, 0);
    });

    it('should calculate bearing for West direction', () => {
      const bearing = calculateBearing(0.0, 1.0, 0.0, 0.0);
      expect(bearing).toBeCloseTo(270, 0);
    });

    it('should return value between 0 and 360', () => {
      const bearing = calculateBearing(40.7128, -74.0060, 51.5074, -0.1278);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe('isInSector', () => {
    it('should return true when bearing is within sector', () => {
      expect(isInSector(45, 0, 90)).toBe(true);
      expect(isInSector(180, 90, 270)).toBe(true);
    });

    it('should return false when bearing is outside sector', () => {
      expect(isInSector(100, 0, 90)).toBe(false);
      expect(isInSector(45, 90, 180)).toBe(false);
    });

    it('should handle sector crossing 0 degrees', () => {
      expect(isInSector(350, 340, 10)).toBe(true);
      expect(isInSector(5, 340, 10)).toBe(true);
      expect(isInSector(180, 340, 10)).toBe(false);
    });

    it('should handle exact boundaries', () => {
      expect(isInSector(0, 0, 90)).toBe(true);
      expect(isInSector(90, 0, 90)).toBe(true);
    });

    it('should normalize negative bearings', () => {
      expect(isInSector(-10, 340, 10)).toBe(true);
    });

    it('should normalize bearings over 360', () => {
      expect(isInSector(370, 0, 90)).toBe(true);
    });
  });

  describe('calculateSOG', () => {
    it('should calculate speed over ground', () => {
      const now = Date.now();
      const positions = [
        { lat: 50.0, lon: 0.0, timestamp: now - 1000 },
        { lat: 50.001, lon: 0.0, timestamp: now }
      ];

      const sog = calculateSOG(positions);

      // Distance is approximately 111 meters in 1 second
      // Speed should be around 215 knots
      expect(sog).toBeGreaterThan(200);
      expect(sog).toBeLessThan(230);
    });

    it('should return 0 for insufficient position data', () => {
      const positions = [{ lat: 50.0, lon: 0.0, timestamp: Date.now() }];
      const sog = calculateSOG(positions);
      expect(sog).toBe(0);
    });

    it('should return 0 for same position', () => {
      const now = Date.now();
      const positions = [
        { lat: 50.0, lon: 0.0, timestamp: now - 1000 },
        { lat: 50.0, lon: 0.0, timestamp: now }
      ];

      const sog = calculateSOG(positions);
      expect(sog).toBe(0);
    });

    it('should use only last two positions', () => {
      const now = Date.now();
      const positions = [
        { lat: 49.0, lon: 0.0, timestamp: now - 3000 },
        { lat: 49.5, lon: 0.0, timestamp: now - 2000 },
        { lat: 50.0, lon: 0.0, timestamp: now - 1000 },
        { lat: 50.001, lon: 0.0, timestamp: now }
      ];

      const sog = calculateSOG(positions);
      expect(sog).toBeGreaterThan(0);
    });

    it('should round to 1 decimal place', () => {
      const now = Date.now();
      const positions = [
        { lat: 50.0, lon: 0.0, timestamp: now - 1000 },
        { lat: 50.0001, lon: 0.0, timestamp: now }
      ];

      const sog = calculateSOG(positions);
      const decimalPlaces = (sog.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateCOG', () => {
    it('should calculate course over ground', () => {
      const now = Date.now();
      const positions = [
        { lat: 50.0, lon: 0.0, timestamp: now - 1000 },
        { lat: 51.0, lon: 0.0, timestamp: now }
      ];

      const cog = calculateCOG(positions);

      // Moving North
      expect(cog).toBeCloseTo(0, 0);
    });

    it('should return 0 for insufficient data', () => {
      const positions = [{ lat: 50.0, lon: 0.0, timestamp: Date.now() }];
      const cog = calculateCOG(positions);
      expect(cog).toBe(0);
    });

    it('should use only last two positions', () => {
      const now = Date.now();
      const positions = [
        { lat: 49.0, lon: 0.0, timestamp: now - 3000 },
        { lat: 50.0, lon: 0.0, timestamp: now - 1000 },
        { lat: 50.0, lon: 1.0, timestamp: now }
      ];

      const cog = calculateCOG(positions);

      // Last segment is moving East
      expect(cog).toBeCloseTo(90, 0);
    });
  });

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates(50.0, 10.0)).toBe(true);
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(-45.5, 123.4)).toBe(true);
    });

    it('should reject invalid latitude', () => {
      expect(isValidCoordinates(91, 0)).toBe(false);
      expect(isValidCoordinates(-91, 0)).toBe(false);
    });

    it('should reject invalid longitude', () => {
      expect(isValidCoordinates(0, 181)).toBe(false);
      expect(isValidCoordinates(0, -181)).toBe(false);
    });

    it('should reject NaN values', () => {
      expect(isValidCoordinates(NaN, 0)).toBe(false);
      expect(isValidCoordinates(0, NaN)).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(isValidCoordinates('50', 0)).toBe(false);
      expect(isValidCoordinates(0, '10')).toBe(false);
      expect(isValidCoordinates(null, 0)).toBe(false);
      expect(isValidCoordinates(0, undefined)).toBe(false);
    });

    it('should accept boundary values', () => {
      expect(isValidCoordinates(90, 180)).toBe(true);
      expect(isValidCoordinates(-90, -180)).toBe(true);
    });
  });

  describe('ALARM_STATES', () => {
    it('should have all alarm states defined', () => {
      expect(ALARM_STATES.SAFE).toBe('safe');
      expect(ALARM_STATES.CAUTION).toBe('caution');
      expect(ALARM_STATES.WARNING).toBe('warning');
      expect(ALARM_STATES.ALARM).toBe('alarm');
    });
  });
});
