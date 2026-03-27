package com.hiosdra.openanchor.domain.model

enum class ZoneType {
    CIRCLE,
    SECTOR
}

sealed class AnchorZone {
    abstract val anchorPosition: Position
    abstract val radiusMeters: Double
    /** Optional buffer zone radius (outer ring). If null, no buffer zone / CAUTION state. */
    abstract val bufferRadiusMeters: Double?

    data class Circle(
        override val anchorPosition: Position,
        override val radiusMeters: Double,
        override val bufferRadiusMeters: Double? = null
    ) : AnchorZone()

    /**
     * Combined zone: small circle around anchor + sector (pie slice) extending further.
     * @param sectorRadiusMeters radius of the larger sector
     * @param sectorHalfAngleDeg half-angle of the sector in degrees (e.g. 60 means 120 deg total)
     * @param sectorBearingDeg bearing of the sector center in degrees (0 = north, clockwise)
     */
    data class SectorWithCircle(
        override val anchorPosition: Position,
        override val radiusMeters: Double,
        override val bufferRadiusMeters: Double? = null,
        val sectorRadiusMeters: Double,
        val sectorHalfAngleDeg: Double,
        val sectorBearingDeg: Double
    ) : AnchorZone()
}
