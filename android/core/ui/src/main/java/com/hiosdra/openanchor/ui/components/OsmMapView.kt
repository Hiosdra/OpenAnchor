package com.hiosdra.openanchor.ui.components

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Point
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Overlay
import org.osmdroid.views.overlay.Polyline
import kotlin.math.cos

/**
 * Data class for a map marker.
 * Note: onDrag callback is excluded from equals/hashCode to prevent defeating differential updates.
 */
data class MapMarker(
    val position: GeoPoint,
    val title: String = "",
    val snippet: String = "",
    val draggable: Boolean = false,
    val onDrag: ((GeoPoint) -> Unit)? = null
) {
    // Custom equals/hashCode that excludes onDrag lambda
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as MapMarker

        if (position != other.position) return false
        if (title != other.title) return false
        if (snippet != other.snippet) return false
        if (draggable != other.draggable) return false

        return true
    }

    override fun hashCode(): Int {
        var result = position.hashCode()
        result = 31 * result + title.hashCode()
        result = 31 * result + snippet.hashCode()
        result = 31 * result + draggable.hashCode()
        return result
    }
}

/**
 * Data class for a circle overlay.
 */
data class MapCircle(
    val center: GeoPoint,
    val radiusMeters: Double,
    val fillColor: Color = Color(0x4000FF00),
    val strokeColor: Color = Color(0xFF00FF00),
    val strokeWidth: Float = 3f
)

/**
 * Data class for a polyline overlay.
 */
data class MapPolylineData(
    val points: List<GeoPoint>,
    val color: Color = Color.Blue,
    val width: Float = 4f
)

/**
 * Reusable osmdroid map composable wrapping MapView via AndroidView.
 *
 * @param modifier Compose modifier
 * @param centerOn Initial center position
 * @param zoomLevel Initial zoom
 * @param markers List of markers to display
 * @param circles List of circles to draw
 * @param polylines List of polylines to draw
 * @param mapContentDescription Accessibility description for the map view
 * @param onMapReady Callback when the MapView is ready; use for one-time setup
 */
@Composable
fun OsmMapView(
    modifier: Modifier = Modifier,
    centerOn: GeoPoint? = null,
    zoomLevel: Double = 17.0,
    markers: List<MapMarker> = emptyList(),
    circles: List<MapCircle> = emptyList(),
    polylines: List<MapPolylineData> = emptyList(),
    mapContentDescription: String? = null,
    onMapReady: ((MapView) -> Unit)? = null
) {
    val context = LocalContext.current
    val mapViewRef = remember { mutableStateOf<MapView?>(null) }

    // Simple non-Compose holder for previous overlay data to avoid triggering recompositions
    class OverlayState<T>(var value: List<T>)

    // Remember previous overlay data to enable differential updates without using Compose state
    val previousCircles = remember { OverlayState(emptyList<MapCircle>()) }
    val previousPolylines = remember { OverlayState(emptyList<MapPolylineData>()) }
    val previousMarkers = remember { OverlayState(emptyList<MapMarker>()) }

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            MapView(ctx).apply {
                setTileSource(TileSourceFactory.MAPNIK)
                setMultiTouchControls(true)
                mapContentDescription?.let { this.contentDescription = it }
                controller.setZoom(zoomLevel)
                centerOn?.let { controller.setCenter(it) }
                // Dark overlay for maritime feel - invert tiles via hardware layer
                overlayManager.tilesOverlay.setColorFilter(android.graphics.ColorMatrixColorFilter(
                    floatArrayOf(
                        -1f, 0f, 0f, 0f, 255f,
                        0f, -1f, 0f, 0f, 255f,
                        0f, 0f, -1f, 0f, 255f,
                        0f, 0f, 0f, 1f, 0f
                    )
                ))
                mapViewRef.value = this
                onMapReady?.invoke(this)
            }
        },
        update = { mapView ->
            // Only update overlays if data actually changed
            val circlesChanged = circles != previousCircles.value
            val polylinesChanged = polylines != previousPolylines.value
            val markersChanged = markers != previousMarkers.value

            if (circlesChanged || polylinesChanged || markersChanged) {
                // Clear non-tile overlays and re-add
                mapView.overlays.removeAll { it !is org.osmdroid.views.overlay.TilesOverlay }

                // Add circle overlays
                circles.forEach { circle ->
                    mapView.overlays.add(CircleOverlay(circle))
                }

                // Add polylines
                polylines.forEach { polyData ->
                    if (polyData.points.isNotEmpty()) {
                        val polyline = Polyline(mapView).apply {
                            setPoints(polyData.points)
                            outlinePaint.color = polyData.color.toArgb()
                            outlinePaint.strokeWidth = polyData.width
                        }
                        mapView.overlays.add(polyline)
                    }
                }

                // Add markers
                markers.forEach { markerData ->
                    val marker = Marker(mapView).apply {
                        position = markerData.position
                        title = markerData.title
                        snippet = markerData.snippet
                        isDraggable = markerData.draggable
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        if (markerData.draggable && markerData.onDrag != null) {
                            setOnMarkerDragListener(object : Marker.OnMarkerDragListener {
                                override fun onMarkerDrag(marker: Marker) {}
                                override fun onMarkerDragEnd(marker: Marker) {
                                    markerData.onDrag.invoke(marker.position)
                                }
                                override fun onMarkerDragStart(marker: Marker) {}
                            })
                        }
                    }
                    mapView.overlays.add(marker)
                }

                mapView.invalidate()

                // Update remembered values
                previousCircles.value = circles
                previousPolylines.value = polylines
                previousMarkers.value = markers
            }
        }
    )

    DisposableEffect(Unit) {
        onDispose {
            mapViewRef.value?.onDetach()
        }
    }
}

/**
 * Custom overlay that draws a filled circle on the map at a given GeoPoint with a radius in meters.
 */
private class CircleOverlay(private val circle: MapCircle) : Overlay() {

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = circle.fillColor.toArgb()
    }

    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = circle.strokeColor.toArgb()
        strokeWidth = circle.strokeWidth
    }

    override fun draw(canvas: Canvas, mapView: MapView, shadow: Boolean) {
        if (shadow) return

        val projection = mapView.projection
        val centerPoint = Point()
        projection.toPixels(circle.center, centerPoint)

        // Calculate pixel radius from meters
        // At the circle's latitude, 1 degree of latitude ≈ 111320 meters
        val metersPerPixel = getMetersPerPixel(mapView, circle.center.latitude)
        if (metersPerPixel <= 0) return
        val pixelRadius = (circle.radiusMeters / metersPerPixel).toFloat()

        canvas.drawCircle(centerPoint.x.toFloat(), centerPoint.y.toFloat(), pixelRadius, fillPaint)
        canvas.drawCircle(centerPoint.x.toFloat(), centerPoint.y.toFloat(), pixelRadius, strokePaint)
    }

    private fun getMetersPerPixel(mapView: MapView, latitude: Double): Double {
        val zoom = mapView.zoomLevelDouble
        // Standard formula: at equator, circumference / (256 * 2^zoom)
        val metersPerPixelAtEquator = 40075016.686 / (256.0 * Math.pow(2.0, zoom))
        return metersPerPixelAtEquator * cos(Math.toRadians(latitude))
    }
}
