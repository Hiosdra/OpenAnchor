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
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent

/**
 * Complication data source that displays anchor monitoring info on watch faces.
 *
 * Uses Hilt EntryPoint for dependency injection since SuspendingComplicationDataSourceService
 * does not support @AndroidEntryPoint directly.
 */
class WearComplicationService : SuspendingComplicationDataSourceService() {

    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface ComplicationEntryPoint {
        fun stateHolder(): WearMonitorStateHolder
    }

    private val stateHolder: WearMonitorStateHolder by lazy {
        EntryPointAccessors.fromApplication(
            applicationContext,
            ComplicationEntryPoint::class.java
        ).stateHolder()
    }

    companion object {
        private const val MAX_RADIUS_METERS = 100f

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
        val state = stateHolder.state.value

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
