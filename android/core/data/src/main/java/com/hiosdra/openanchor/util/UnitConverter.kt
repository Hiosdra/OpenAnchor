package com.hiosdra.openanchor.util

import com.hiosdra.openanchor.domain.model.DepthUnit
import com.hiosdra.openanchor.domain.model.DistanceUnit

object UnitConverter {

    private const val METERS_PER_NAUTICAL_MILE = 1852.0
    private const val METERS_PER_FOOT = 0.3048

    fun metersTo(meters: Double, unit: DistanceUnit): Double {
        return when (unit) {
            DistanceUnit.METERS -> meters
            DistanceUnit.NAUTICAL_MILES -> meters / METERS_PER_NAUTICAL_MILE
            DistanceUnit.FEET -> meters / METERS_PER_FOOT
        }
    }

    fun toMeters(value: Double, unit: DistanceUnit): Double {
        return when (unit) {
            DistanceUnit.METERS -> value
            DistanceUnit.NAUTICAL_MILES -> value * METERS_PER_NAUTICAL_MILE
            DistanceUnit.FEET -> value * METERS_PER_FOOT
        }
    }

    fun metersToDepth(meters: Double, unit: DepthUnit): Double {
        return when (unit) {
            DepthUnit.METERS -> meters
            DepthUnit.FEET -> meters / METERS_PER_FOOT
        }
    }

    fun depthToMeters(value: Double, unit: DepthUnit): Double {
        return when (unit) {
            DepthUnit.METERS -> value
            DepthUnit.FEET -> value * METERS_PER_FOOT
        }
    }

    fun formatDistance(meters: Double, unit: DistanceUnit): String {
        val converted = metersTo(meters, unit)
        return when (unit) {
            DistanceUnit.METERS -> "%.0f m".format(converted)
            DistanceUnit.NAUTICAL_MILES -> "%.2f nm".format(converted)
            DistanceUnit.FEET -> "%.0f ft".format(converted)
        }
    }

    fun formatDepth(meters: Double, unit: DepthUnit): String {
        val converted = metersToDepth(meters, unit)
        return when (unit) {
            DepthUnit.METERS -> "%.1f m".format(converted)
            DepthUnit.FEET -> "%.1f ft".format(converted)
        }
    }
}
