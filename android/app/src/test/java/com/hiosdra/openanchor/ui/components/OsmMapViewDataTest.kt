package com.hiosdra.openanchor.ui.components

import androidx.compose.ui.graphics.Color
import org.junit.Assert.*
import org.junit.Test
import org.osmdroid.util.GeoPoint

class OsmMapViewDataTest {

    // ── MapMarker equals / hashCode ──

    @Test
    fun `MapMarker equals with same values returns true`() {
        val a = MapMarker(GeoPoint(54.0, 18.0), title = "A", snippet = "s1", draggable = true)
        val b = MapMarker(GeoPoint(54.0, 18.0), title = "A", snippet = "s1", draggable = true)
        assertEquals(a, b)
    }

    @Test
    fun `MapMarker equals with same values but different onDrag returns true`() {
        val a = MapMarker(GeoPoint(54.0, 18.0), title = "A", draggable = true, onDrag = { })
        val b = MapMarker(GeoPoint(54.0, 18.0), title = "A", draggable = true, onDrag = { })
        assertEquals(a, b)
    }

    @Test
    fun `MapMarker equals with different position returns false`() {
        val a = MapMarker(GeoPoint(54.0, 18.0))
        val b = MapMarker(GeoPoint(55.0, 19.0))
        assertNotEquals(a, b)
    }

    @Test
    fun `MapMarker equals with different title returns false`() {
        val a = MapMarker(GeoPoint(54.0, 18.0), title = "A")
        val b = MapMarker(GeoPoint(54.0, 18.0), title = "B")
        assertNotEquals(a, b)
    }

    @Test
    fun `MapMarker equals with different snippet returns false`() {
        val a = MapMarker(GeoPoint(54.0, 18.0), snippet = "s1")
        val b = MapMarker(GeoPoint(54.0, 18.0), snippet = "s2")
        assertNotEquals(a, b)
    }

    @Test
    fun `MapMarker equals with different draggable returns false`() {
        val a = MapMarker(GeoPoint(54.0, 18.0), draggable = true)
        val b = MapMarker(GeoPoint(54.0, 18.0), draggable = false)
        assertNotEquals(a, b)
    }

    @Test
    fun `MapMarker equals with null returns false`() {
        val a = MapMarker(GeoPoint(54.0, 18.0))
        assertNotEquals(a, null)
    }

    @Test
    fun `MapMarker equals with different type returns false`() {
        val a = MapMarker(GeoPoint(54.0, 18.0))
        assertNotEquals(a, "not a MapMarker")
    }

    @Test
    fun `MapMarker equals with same reference returns true`() {
        val a = MapMarker(GeoPoint(54.0, 18.0))
        assertEquals(a, a)
    }

    @Test
    fun `MapMarker hashCode same for equal markers`() {
        val a = MapMarker(GeoPoint(54.0, 18.0), title = "T", snippet = "S", draggable = true)
        val b = MapMarker(GeoPoint(54.0, 18.0), title = "T", snippet = "S", draggable = true)
        assertEquals(a.hashCode(), b.hashCode())
    }

    @Test
    fun `MapMarker hashCode same regardless of onDrag`() {
        val a = MapMarker(GeoPoint(54.0, 18.0), onDrag = { })
        val b = MapMarker(GeoPoint(54.0, 18.0), onDrag = null)
        assertEquals(a.hashCode(), b.hashCode())
    }

    @Test
    fun `MapMarker default values`() {
        val m = MapMarker(GeoPoint(0.0, 0.0))
        assertEquals("", m.title)
        assertEquals("", m.snippet)
        assertFalse(m.draggable)
        assertNull(m.onDrag)
    }

    // ── MapCircle ──

    @Test
    fun `MapCircle default colors`() {
        val c = MapCircle(center = GeoPoint(54.0, 18.0), radiusMeters = 100.0)
        assertEquals(Color(0x4000FF00), c.fillColor)
        assertEquals(Color(0xFF00FF00), c.strokeColor)
        assertEquals(3f, c.strokeWidth)
    }

    @Test
    fun `MapCircle equality`() {
        val a = MapCircle(GeoPoint(54.0, 18.0), 50.0, Color.Red, Color.Blue, 2f)
        val b = MapCircle(GeoPoint(54.0, 18.0), 50.0, Color.Red, Color.Blue, 2f)
        assertEquals(a, b)
    }

    @Test
    fun `MapCircle inequality on radius`() {
        val a = MapCircle(GeoPoint(54.0, 18.0), 50.0)
        val b = MapCircle(GeoPoint(54.0, 18.0), 100.0)
        assertNotEquals(a, b)
    }

    @Test
    fun `MapCircle copy changes center`() {
        val c = MapCircle(GeoPoint(54.0, 18.0), 50.0)
        val c2 = c.copy(center = GeoPoint(55.0, 19.0))
        assertEquals(GeoPoint(55.0, 19.0), c2.center)
        assertEquals(50.0, c2.radiusMeters, 0.001)
    }

    // ── MapPolylineData ──

    @Test
    fun `MapPolylineData default values`() {
        val p = MapPolylineData(points = listOf(GeoPoint(0.0, 0.0), GeoPoint(1.0, 1.0)))
        assertEquals(Color.Blue, p.color)
        assertEquals(4f, p.width)
    }

    @Test
    fun `MapPolylineData equality`() {
        val pts = listOf(GeoPoint(0.0, 0.0), GeoPoint(1.0, 1.0))
        val a = MapPolylineData(pts, Color.Red, 5f)
        val b = MapPolylineData(pts, Color.Red, 5f)
        assertEquals(a, b)
    }

    @Test
    fun `MapPolylineData inequality on color`() {
        val pts = listOf(GeoPoint(0.0, 0.0))
        val a = MapPolylineData(pts, Color.Red)
        val b = MapPolylineData(pts, Color.Blue)
        assertNotEquals(a, b)
    }

    @Test
    fun `MapPolylineData empty points`() {
        val p = MapPolylineData(emptyList())
        assertTrue(p.points.isEmpty())
    }
}
