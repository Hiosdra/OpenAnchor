package com.hiosdra.openanchor.domain.geometry

/**
 * Result of checking a position against an anchor zone.
 */
enum class ZoneCheckResult {
    /** Inside the primary safe zone */
    INSIDE,
    /** Outside primary zone but inside the buffer zone */
    BUFFER,
    /** Outside all zones */
    OUTSIDE
}
