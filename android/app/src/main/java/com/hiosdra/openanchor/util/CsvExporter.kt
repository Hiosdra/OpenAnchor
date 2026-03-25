package com.hiosdra.openanchor.util

import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.TrackPoint
import java.io.OutputStream
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Exports anchor session data as CSV for spreadsheet analysis.
 *
 * Columns: timestamp, latitude, longitude, accuracy_m, distance_to_anchor_m, alarm_state
 */
object CsvExporter {

    private val isoFormatter: DateTimeFormatter = DateTimeFormatter
        .ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")
        .withZone(ZoneOffset.UTC)

    private const val HEADER = "timestamp,latitude,longitude,accuracy_m,distance_to_anchor_m,alarm_state"

    /**
     * Writes CSV to the given [outputStream].
     * The caller is responsible for closing the stream.
     */
    fun export(
        session: AnchorSession,
        trackPoints: List<TrackPoint>,
        outputStream: OutputStream
    ) {
        val writer = outputStream.bufferedWriter(Charsets.UTF_8)
        writer.apply {
            write(HEADER)
            newLine()
            for (point in trackPoints) {
                val timestamp = isoFormatter.format(Instant.ofEpochMilli(point.position.timestamp))
                val lat = point.position.latitude
                val lon = point.position.longitude
                val accuracy = "%.1f".format(point.position.accuracy)
                val distance = "%.2f".format(point.distanceToAnchor)
                val alarm = point.alarmState
                write("$timestamp,$lat,$lon,$accuracy,$distance,$alarm")
                newLine()
            }
            flush()
        }
    }

    /**
     * Generates a suggested filename for the CSV export.
     */
    fun suggestedFilename(session: AnchorSession): String {
        val dateFormatter = DateTimeFormatter
            .ofPattern("yyyy-MM-dd_HHmm")
            .withZone(ZoneOffset.UTC)
        return "openanchor_${dateFormatter.format(Instant.ofEpochMilli(session.startTime))}.csv"
    }
}
