package com.hiosdra.openanchor.wear.service

import android.content.ComponentName
import android.content.Context
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.hiosdra.openanchor.wear.data.WearMonitorStateHolder

/**
 * Complication data source that displays anchor monitoring info on watch faces.
 *
 * Supported complication types:
 * - SHORT_TEXT: Shows distance in meters (e.g., "42m")
 * - LONG_TEXT: Shows distance with alarm state (e.g., "42m — SAFE")
 * - RANGED_VALUE: Shows distance as percentage of max radius (100m default)
 *
 * Registered in AndroidManifest.xml with BIND_COMPLICATION_PROVIDER permission.
 * Live updates are pushed via [requestComplicationUpdate] when monitor state changes.
 */
class WearComplicationService : SuspendingComplicationDataSourceService() {

    companion object {
        private const val MAX_RADIUS_METERS = 100f

        /**
         * Request all active complications to update with fresh data.
         * Call this from [AnchorDataListenerService] when new monitor state arrives.
         */
        fun requestComplicationUpdate(context: Context) {
            val requester = ComplicationDataSourceUpdateRequester.create(
                context,
                ComponentName(context, WearComplicationService::class.java)
            )
            requester.requestUpdateAll()
        }
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.SHORT_TEXT -> {
                ShortTextComplicationData.Builder(
                    text = PlainComplicationText.Builder("42m").build(),
                    contentDescription = PlainComplicationText.Builder("Anchor distance").build()
                ).build()
            }
            ComplicationType.LONG_TEXT -> {
                LongTextComplicationData.Builder(
                    text = PlainComplicationText.Builder("42m — SAFE").build(),
                    contentDescription = PlainComplicationText.Builder(
                        "Anchor distance 42 meters, state safe"
                    ).build()
                ).build()
            }
            ComplicationType.RANGED_VALUE -> {
                RangedValueComplicationData.Builder(
                    value = 42f,
                    min = 0f,
                    max = MAX_RADIUS_METERS,
                    contentDescription = PlainComplicationText.Builder("Anchor distance").build()
                )
                    .setText(PlainComplicationText.Builder("42m").build())
                    .build()
            }
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val state = WearMonitorStateHolder.state.value

        return when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> {
                val distanceText = if (state.isActive) {
                    "%.0fm".format(state.distanceMeters)
                } else {
                    "--"
                }

                ShortTextComplicationData.Builder(
                    text = PlainComplicationText.Builder(distanceText).build(),
                    contentDescription = PlainComplicationText.Builder(
                        "Anchor distance: $distanceText"
                    ).build()
                ).build()
            }
            ComplicationType.LONG_TEXT -> {
                val text = if (state.isActive) {
                    "%.0fm — %s".format(state.distanceMeters, state.alarmState.name)
                } else {
                    "Inactive"
                }

                LongTextComplicationData.Builder(
                    text = PlainComplicationText.Builder(text).build(),
                    contentDescription = PlainComplicationText.Builder(
                        "Anchor monitor: $text"
                    ).build()
                ).build()
            }
            ComplicationType.RANGED_VALUE -> {
                val distance = if (state.isActive) state.distanceMeters.toFloat() else 0f
                val distanceText = if (state.isActive) {
                    "%.0fm".format(state.distanceMeters)
                } else {
                    "--"
                }

                RangedValueComplicationData.Builder(
                    value = distance.coerceIn(0f, MAX_RADIUS_METERS),
                    min = 0f,
                    max = MAX_RADIUS_METERS,
                    contentDescription = PlainComplicationText.Builder(
                        "Anchor distance: $distanceText"
                    ).build()
                )
                    .setText(PlainComplicationText.Builder(distanceText).build())
                    .build()
            }
            else -> null
        }
    }
}
