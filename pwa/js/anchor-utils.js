/**
 * Anchor Alarm module - GPS calculations and alarm logic
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Alarm states based on distance from anchor
 */
export const ALARM_STATES = {
  SAFE: 'safe',
  CAUTION: 'caution',
  WARNING: 'warning',
  ALARM: 'alarm'
};

/**
 * Determine alarm state based on distance and radius
 * @param {number} distance - Distance from anchor in meters
 * @param {number} radius - Safe zone radius in meters
 * @returns {string} Alarm state
 */
export function getAlarmState(distance, radius) {
  if (distance <= radius * 0.7) {
    return ALARM_STATES.SAFE;
  } else if (distance <= radius * 0.85) {
    return ALARM_STATES.CAUTION;
  } else if (distance <= radius) {
    return ALARM_STATES.WARNING;
  } else {
    return ALARM_STATES.ALARM;
  }
}

/**
 * Calculate anchor chain length using catenary formula
 * @param {number} depth - Water depth in meters
 * @param {number} ratio - Chain/depth ratio (typically 3-5)
 * @returns {number} Required chain length in meters
 */
export function calculateChainLength(depth, ratio = 3) {
  return depth * ratio;
}

/**
 * Calculate swing radius (how far boat can drift)
 * @param {number} depth - Water depth in meters
 * @param {number} chainLength - Chain length deployed in meters
 * @returns {number} Swing radius in meters
 */
export function calculateSwingRadius(depth, chainLength) {
  // Simplified calculation: assumes chain forms a catenary
  // Real swing radius depends on chain weight, wind, current
  const scope = chainLength / depth;
  const horizontalDistance = Math.sqrt(Math.pow(chainLength, 2) - Math.pow(depth, 2));
  return Math.max(horizontalDistance, chainLength * 0.8);
}

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  return bearing;
}

/**
 * Check if a point is within a sector (bearing range)
 * @param {number} bearing - Current bearing in degrees
 * @param {number} sectorStart - Sector start bearing in degrees
 * @param {number} sectorEnd - Sector end bearing in degrees
 * @returns {boolean}
 */
export function isInSector(bearing, sectorStart, sectorEnd) {
  // Normalize all bearings to 0-360
  bearing = ((bearing % 360) + 360) % 360;
  sectorStart = ((sectorStart % 360) + 360) % 360;
  sectorEnd = ((sectorEnd % 360) + 360) % 360;

  if (sectorStart <= sectorEnd) {
    // Normal case: sector doesn't cross 0
    return bearing >= sectorStart && bearing <= sectorEnd;
  } else {
    // Sector crosses 0 degrees (e.g., 350° to 10°)
    return bearing >= sectorStart || bearing <= sectorEnd;
  }
}

/**
 * Calculate Speed Over Ground (SOG) from position history
 * @param {Array} positions - Array of {lat, lon, timestamp} objects
 * @returns {number} Speed in knots
 */
export function calculateSOG(positions) {
  if (positions.length < 2) {
    return 0;
  }

  const recent = positions.slice(-2);
  const [pos1, pos2] = recent;

  const distance = calculateDistance(pos1.lat, pos1.lon, pos2.lat, pos2.lon);
  const timeSeconds = (pos2.timestamp - pos1.timestamp) / 1000;

  if (timeSeconds === 0) {
    return 0;
  }

  const speedMetersPerSecond = distance / timeSeconds;
  const speedKnots = speedMetersPerSecond * 1.94384; // Convert m/s to knots

  return Math.round(speedKnots * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate Course Over Ground (COG) from position history
 * @param {Array} positions - Array of {lat, lon, timestamp} objects
 * @returns {number} Course in degrees (0-360)
 */
export function calculateCOG(positions) {
  if (positions.length < 2) {
    return 0;
  }

  const recent = positions.slice(-2);
  const [pos1, pos2] = recent;

  return calculateBearing(pos1.lat, pos1.lon, pos2.lat, pos2.lon);
}

/**
 * Validate GPS coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean}
 */
export function isValidCoordinates(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !isNaN(lat) &&
    !isNaN(lon)
  );
}
