package com.hiosdra.openanchor.util

import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.TrackPoint
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Exports anchor session data to standard GPX 1.1 format.
 * The output contains:
 * - A waypoint for the anchor position
 * - A track (<trk>) with all recorded boat positions
 * - Alarm track points are annotated with <name> tags
 */
object GpxExporter {

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    /**
     * Writes GPX XML to the given [outputStream].
     * The caller is responsible for closing the stream.
     */
    fun export(
        session: AnchorSession,
        trackPoints: List<TrackPoint>,
        outputStream: OutputStream
    ) {
        val writer = outputStream.bufferedWriter(Charsets.UTF_8)
        writer.apply {
            write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
            write("<gpx version=\"1.1\" creator=\"OpenAnchor\"\n")
            write("  xmlns=\"http://www.topografix.com/GPX/1/1\"\n")
            write("  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n")
            write("  xsi:schemaLocation=\"http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd\">\n")

            // Metadata
            write("  <metadata>\n")
            write("    <name>OpenAnchor Session ${session.id}</name>\n")
            write("    <time>${isoFormat.format(Date(session.startTime))}</time>\n")
            write("  </metadata>\n")

            // Anchor waypoint
            write("  <wpt lat=\"${session.anchorPosition.latitude}\" lon=\"${session.anchorPosition.longitude}\">\n")
            write("    <name>Anchor</name>\n")
            write("    <desc>Anchor position, radius=${session.zone.radiusMeters}m</desc>\n")
            write("    <time>${isoFormat.format(Date(session.startTime))}</time>\n")
            write("    <sym>Anchor</sym>\n")
            write("  </wpt>\n")

            // Track
            if (trackPoints.isNotEmpty()) {
                write("  <trk>\n")
                write("    <name>Boat Track</name>\n")
                write("    <trkseg>\n")
                for (point in trackPoints) {
                    write("      <trkpt lat=\"${point.position.latitude}\" lon=\"${point.position.longitude}\">\n")
                    write("        <time>${isoFormat.format(Date(point.position.timestamp))}</time>\n")
                    if (point.position.accuracy > 0f) {
                        write("        <hdop>${"%.1f".format(point.position.accuracy)}</hdop>\n")
                    }
                    if (point.isAlarm) {
                        write("        <name>ALARM</name>\n")
                    }
                    write("      </trkpt>\n")
                }
                write("    </trkseg>\n")
                write("  </trk>\n")
            }

            write("</gpx>\n")
            flush()
        }
    }

    /**
     * Generates a suggested filename for the GPX export.
     */
    fun suggestedFilename(session: AnchorSession): String {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd_HHmm", Locale.US)
        return "openanchor_${dateFormat.format(Date(session.startTime))}.gpx"
    }
}
