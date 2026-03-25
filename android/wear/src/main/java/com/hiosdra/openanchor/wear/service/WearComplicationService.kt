package com.hiosdra.openanchor.wear.service

import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.hiosdra.openanchor.wear.data.WearMonitorStateHolder

/**
 * Complication data source that displays anchor monitoring info on watch faces.
 *
 * Supported complication types:
 * - SHORT_TEXT: Shows distance in meters (e.g., "42m")
 *
 * TODO: Register this service in AndroidManifest.xml:
 * <service
 *     android:name=".service.WearComplicationService"
 *     android:exported="true"
 *     android:icon="@drawable/ic_anchor"
 *     android:label="@string/wear_app_name"
 *     android:permission="com.google.android.wearable.permission.BIND_COMPLICATION_PROVIDER">
 *     <intent-filter>
 *         <action android:name="android.support.wearable.complications.ACTION_COMPLICATION_UPDATE_REQUEST" />
 *     </intent-filter>
 *     <meta-data
 *         android:name="android.support.wearable.complications.SUPPORTED_TYPES"
 *         android:value="SHORT_TEXT" />
 *     <meta-data
 *         android:name="android.support.wearable.complications.UPDATE_PERIOD_SECONDS"
 *         android:value="60" />
 * </service>
 *
 * TODO: Add ic_anchor drawable resource for the complication icon
 * TODO: Support LONG_TEXT and RANGED_VALUE complication types
 * TODO: Implement ComplicationDataSourceUpdateRequester to push updates
 *       when monitor state changes instead of relying on periodic polling
 */
class WearComplicationService : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.SHORT_TEXT -> {
                ShortTextComplicationData.Builder(
                    text = PlainComplicationText.Builder("42m").build(),
                    contentDescription = PlainComplicationText.Builder("Anchor distance").build()
                ).build()
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
            else -> null
        }
    }
}
