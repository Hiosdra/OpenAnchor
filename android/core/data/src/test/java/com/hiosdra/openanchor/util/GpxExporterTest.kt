package com.hiosdra.openanchor.util

import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream

class GpxExporterTest {

    @Test
    fun `export generates valid GPX header`() {
        val session = createTestSession()
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, emptyList(), output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"))
        assertTrue(gpx.contains("<gpx version=\"1.1\""))
        assertTrue(gpx.contains("creator=\"OpenAnchor\""))
        assertTrue(gpx.contains("xmlns=\"http://www.topografix.com/GPX/1/1\""))
    }

    @Test
    fun `export includes metadata with session info`() {
        val session = createTestSession(id = 42, startTime = 1000000L)
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, emptyList(), output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("<metadata>"))
        assertTrue(gpx.contains("<name>OpenAnchor Session 42</name>"))
        assertTrue(gpx.contains("<time>"))
        assertTrue(gpx.contains("</metadata>"))
    }

    @Test
    fun `export includes anchor waypoint with correct attributes`() {
        val session = createTestSession(
            anchorLat = 52.5,
            anchorLng = 13.4,
            radius = 50.0,
            startTime = 1609459200000L // 2021-01-01 00:00:00 UTC
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, emptyList(), output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("<wpt lat=\"52.5\" lon=\"13.4\">"))
        assertTrue(gpx.contains("<name>Anchor</name>"))
        assertTrue(gpx.contains("<desc>Anchor position, radius=50.0m</desc>"))
        assertTrue(gpx.contains("<sym>Anchor</sym>"))
        assertTrue(gpx.contains("</wpt>"))
    }

    @Test
    fun `export with empty track points produces no track element`() {
        val session = createTestSession()
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, emptyList(), output)

        val gpx = output.toString("UTF-8")
        assertTrue(!gpx.contains("<trk>"))
        assertTrue(!gpx.contains("<trkseg>"))
    }

    @Test
    fun `export with track points includes track element`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 51.0, lng = 11.0, timestamp = 1000L),
            createTrackPoint(lat = 51.1, lng = 11.1, timestamp = 2000L)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("<trk>"))
        assertTrue(gpx.contains("<name>Boat Track</name>"))
        assertTrue(gpx.contains("<trkseg>"))
        assertTrue(gpx.contains("</trkseg>"))
        assertTrue(gpx.contains("</trk>"))
    }

    @Test
    fun `export track points include coordinates and timestamp`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 52.5, lng = 13.4, timestamp = 1609459200000L)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("<trkpt lat=\"52.5\" lon=\"13.4\">"))
        assertTrue(gpx.contains("<time>2021-01-01T00:00:00Z</time>"))
        assertTrue(gpx.contains("</trkpt>"))
    }

    @Test
    fun `export includes hdop when accuracy is greater than zero`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 51.0, lng = 11.0, accuracy = 10.5f)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("<hdop>10.5</hdop>"))
    }

    @Test
    fun `export excludes hdop when accuracy is zero`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 51.0, lng = 11.0, accuracy = 0f)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        assertTrue(!gpx.contains("<hdop>"))
    }

    @Test
    fun `export marks alarm track points with name tag`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 51.0, lng = 11.0, isAlarm = true),
            createTrackPoint(lat = 51.1, lng = 11.1, isAlarm = false)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        // Should have exactly one ALARM marker
        val alarmCount = gpx.split("<name>ALARM</name>").size - 1
        assertEquals(1, alarmCount)
    }

    @Test
    fun `export handles multiple track points correctly`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 50.0, lng = 10.0, timestamp = 1000L),
            createTrackPoint(lat = 50.1, lng = 10.1, timestamp = 2000L),
            createTrackPoint(lat = 50.2, lng = 10.2, timestamp = 3000L),
            createTrackPoint(lat = 50.3, lng = 10.3, timestamp = 4000L)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        val trackPointCount = gpx.split("<trkpt").size - 1
        assertEquals(4, trackPointCount)
    }

    @Test
    fun `export closes GPX element correctly`() {
        val session = createTestSession()
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, emptyList(), output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.trim().endsWith("</gpx>"))
    }

    @Test
    fun `export handles negative coordinates`() {
        val session = createTestSession(anchorLat = -45.0, anchorLng = -90.0)
        val trackPoints = listOf(
            createTrackPoint(lat = -45.1, lng = -90.1)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("lat=\"-45.0\" lon=\"-90.0\""))
        assertTrue(gpx.contains("lat=\"-45.1\" lon=\"-90.1\""))
    }

    @Test
    fun `export handles extreme coordinates`() {
        val session = createTestSession(anchorLat = 90.0, anchorLng = 180.0)
        val trackPoints = listOf(
            createTrackPoint(lat = -90.0, lng = -180.0)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("lat=\"90.0\" lon=\"180.0\""))
        assertTrue(gpx.contains("lat=\"-90.0\" lon=\"-180.0\""))
    }

    @Test
    fun `export handles decimal precision correctly`() {
        val session = createTestSession(anchorLat = 52.123456789, anchorLng = 13.987654321)
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, emptyList(), output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("52.123456789"))
        assertTrue(gpx.contains("13.987654321"))
    }

    @Test
    fun `export formats timestamp in ISO 8601 UTC`() {
        val session = createTestSession(startTime = 1609459200000L) // 2021-01-01 00:00:00 UTC
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, emptyList(), output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("2021-01-01T00:00:00Z"))
    }

    @Test
    fun `export handles mixed alarm and non-alarm points`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 50.0, lng = 10.0, isAlarm = false),
            createTrackPoint(lat = 50.1, lng = 10.1, isAlarm = true),
            createTrackPoint(lat = 50.2, lng = 10.2, isAlarm = true),
            createTrackPoint(lat = 50.3, lng = 10.3, isAlarm = false)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        val alarmCount = gpx.split("<name>ALARM</name>").size - 1
        assertEquals(2, alarmCount)
    }

    @Test
    fun `export handles sector zone type`() {
        val session = AnchorSession(
            id = 1,
            anchorPosition = Position(latitude = 52.0, longitude = 13.0),
            zone = AnchorZone.SectorWithCircle(
                anchorPosition = Position(latitude = 52.0, longitude = 13.0),
                radiusMeters = 50.0,
                bufferRadiusMeters = null,
                sectorRadiusMeters = 100.0,
                sectorHalfAngleDeg = 60.0,
                sectorBearingDeg = 90.0
            ),
            startTime = 1000L
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, emptyList(), output)

        val gpx = output.toString("UTF-8")
        // Should still export with radius from zone
        assertTrue(gpx.contains("radius=50.0m"))
    }

    @Test
    fun `export produces well-formed XML structure`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 51.0, lng = 11.0, accuracy = 5.0f, isAlarm = true)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")

        // Verify nesting structure
        val metadataStart = gpx.indexOf("<metadata>")
        val metadataEnd = gpx.indexOf("</metadata>")
        assertTrue(metadataStart < metadataEnd)

        val wptStart = gpx.indexOf("<wpt")
        val wptEnd = gpx.indexOf("</wpt>")
        assertTrue(wptStart < wptEnd)
        assertTrue(wptEnd < gpx.indexOf("<trk>"))

        val trkStart = gpx.indexOf("<trk>")
        val trkEnd = gpx.indexOf("</trk>")
        assertTrue(trkStart < trkEnd)
    }

    // ============== suggestedFilename Tests ==============

    @Test
    fun `suggestedFilename generates correct format`() {
        val session = createTestSession(startTime = 1609459200000L) // 2021-01-01 00:00:00 UTC

        val filename = GpxExporter.suggestedFilename(session)

        assertTrue(filename.startsWith("openanchor_"))
        assertTrue(filename.endsWith(".gpx"))
        assertTrue(filename.contains("2021"))
    }

    @Test
    fun `suggestedFilename includes date and time`() {
        val session = createTestSession(startTime = 1609459200000L) // 2021-01-01 00:00:00 UTC

        val filename = GpxExporter.suggestedFilename(session)

        // Should contain date in format yyyy-MM-dd
        assertTrue(filename.contains("-"))
        // Should contain time separator
        assertTrue(filename.contains("_"))
    }

    @Test
    fun `suggestedFilename handles different timestamps`() {
        val session1 = createTestSession(startTime = 1609459200000L)
        val session2 = createTestSession(startTime = 1609545600000L) // Next day

        val filename1 = GpxExporter.suggestedFilename(session1)
        val filename2 = GpxExporter.suggestedFilename(session2)

        // Different timestamps should produce different filenames
        assertTrue(filename1 != filename2)
    }

    @Test
    fun `suggestedFilename is valid filename`() {
        val session = createTestSession(startTime = System.currentTimeMillis())

        val filename = GpxExporter.suggestedFilename(session)

        // Should not contain invalid filename characters
        assertTrue(!filename.contains("/"))
        assertTrue(!filename.contains("\\"))
        assertTrue(!filename.contains(":"))
        assertTrue(!filename.contains("*"))
        assertTrue(!filename.contains("?"))
        assertTrue(!filename.contains("\""))
        assertTrue(!filename.contains("<"))
        assertTrue(!filename.contains(">"))
        assertTrue(!filename.contains("|"))
    }

    @Test
    fun `export with many track points generates large output`() {
        val session = createTestSession()
        val trackPoints = (0..1000).map { i ->
            createTrackPoint(
                lat = 50.0 + i * 0.0001,
                lng = 10.0 + i * 0.0001,
                timestamp = 1000L + i * 1000L
            )
        }
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        val trackPointCount = gpx.split("<trkpt").size - 1
        assertEquals(1001, trackPointCount)
    }

    @Test
    fun `export handles single track point`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 50.0, lng = 10.0)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("<trk>"))
        val trackPointCount = gpx.split("<trkpt").size - 1
        assertEquals(1, trackPointCount)
    }

    @Test
    fun `export accuracy formatting with decimal`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 50.0, lng = 10.0, accuracy = 12.3f)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("<hdop>12.3</hdop>"))
    }

    @Test
    fun `export accuracy formatting rounds to one decimal`() {
        val session = createTestSession()
        val trackPoints = listOf(
            createTrackPoint(lat = 50.0, lng = 10.0, accuracy = 12.456f)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        assertTrue(gpx.contains("<hdop>12.5</hdop>"))
    }

    @Test
    fun `export preserves track point order`() {
        val session = createTestSession(anchorLat = 49.0, anchorLng = 9.0)
        val trackPoints = listOf(
            createTrackPoint(lat = 50.0, lng = 10.0, timestamp = 1000L),
            createTrackPoint(lat = 51.0, lng = 11.0, timestamp = 2000L),
            createTrackPoint(lat = 52.0, lng = 12.0, timestamp = 3000L)
        )
        val output = ByteArrayOutputStream()

        GpxExporter.export(session, trackPoints, output)

        val gpx = output.toString("UTF-8")
        val lat50Index = gpx.indexOf("lat=\"50.0\"")
        val lat51Index = gpx.indexOf("lat=\"51.0\"")
        val lat52Index = gpx.indexOf("lat=\"52.0\"")

        assertTrue(lat50Index < lat51Index)
        assertTrue(lat51Index < lat52Index)
    }

    // ============== Helper Methods ==============

    private fun createTestSession(
        id: Long = 1,
        anchorLat: Double = 52.0,
        anchorLng: Double = 13.0,
        radius: Double = 50.0,
        startTime: Long = 1000L
    ): AnchorSession {
        return AnchorSession(
            id = id,
            anchorPosition = Position(latitude = anchorLat, longitude = anchorLng),
            zone = AnchorZone.Circle(
                anchorPosition = Position(latitude = anchorLat, longitude = anchorLng),
                radiusMeters = radius,
                bufferRadiusMeters = null
            ),
            startTime = startTime
        )
    }

    private fun createTrackPoint(
        lat: Double,
        lng: Double,
        accuracy: Float = 0f,
        timestamp: Long = 1000L,
        isAlarm: Boolean = false
    ): TrackPoint {
        return TrackPoint(
            id = 0,
            sessionId = 1,
            position = Position(
                latitude = lat,
                longitude = lng,
                accuracy = accuracy,
                timestamp = timestamp
            ),
            distanceToAnchor = 0f,
            isAlarm = isAlarm,
            alarmState = if (isAlarm) "ALARM" else "SAFE"
        )
    }
}
