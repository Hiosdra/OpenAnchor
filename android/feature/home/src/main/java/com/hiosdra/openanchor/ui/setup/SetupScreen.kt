package com.hiosdra.openanchor.ui.setup

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.domain.model.ZoneType
import com.hiosdra.openanchor.ui.components.MapMarker
import com.hiosdra.openanchor.ui.components.OsmMapView
import com.hiosdra.openanchor.ui.theme.*
import org.osmdroid.util.GeoPoint

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetupScreen(
    onSessionCreated: (Long) -> Unit,
    onBack: () -> Unit,
    viewModel: SetupViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.createdSessionId) {
        state.createdSessionId?.let { onSessionCreated(it) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        when (state.currentStep) {
                            SetupStep.DROP_POINT -> stringResource(R.string.setup_drop_point)
                            SetupStep.ZONE_TYPE -> stringResource(R.string.setup_zone_type)
                            SetupStep.RADIUS -> stringResource(R.string.setup_radius)
                            SetupStep.SECTOR_CONFIG -> stringResource(R.string.setup_sector)
                            SetupStep.CONFIRM -> stringResource(R.string.setup_confirm)
                        }
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (state.currentStep == SetupStep.DROP_POINT) onBack()
                        else viewModel.previousStep()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            BottomAppBar {
                Spacer(modifier = Modifier.weight(1f))
                if (state.currentStep == SetupStep.CONFIRM) {
                    Button(
                        onClick = { viewModel.confirmAndCreateSession() },
                        modifier = Modifier.padding(horizontal = 16.dp)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.start_monitoring))
                    }
                } else {
                    Button(
                        onClick = { viewModel.nextStep() },
                        modifier = Modifier.padding(horizontal = 16.dp)
                    ) {
                        Text(stringResource(R.string.next))
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null)
                    }
                }
            }
        }
    ) { padding ->
        AnimatedContent(
            targetState = state.currentStep,
            modifier = Modifier.padding(padding),
            label = "setup_step"
        ) { step ->
            when (step) {
                SetupStep.DROP_POINT -> DropPointStep(state, viewModel)
                SetupStep.ZONE_TYPE -> ZoneTypeStep(state, viewModel)
                SetupStep.RADIUS -> RadiusStep(state, viewModel)
                SetupStep.SECTOR_CONFIG -> SectorConfigStep(state, viewModel)
                SetupStep.CONFIRM -> ConfirmStep(state)
            }
        }
    }
}

@Composable
private fun DropPointStep(state: SetupState, viewModel: SetupViewModel) {
    Column(modifier = Modifier.fillMaxSize()) {
        if (state.hasLocation) {
            val anchorGeoPoint = GeoPoint(state.anchorLat, state.anchorLng)

            OsmMapView(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                centerOn = anchorGeoPoint,
                zoomLevel = 16.0,
                markers = listOf(
                    MapMarker(
                        position = anchorGeoPoint,
                        title = "Anchor",
                        draggable = true,
                        onDrag = { newPos ->
                            viewModel.setAnchorPosition(newPos.latitude, newPos.longitude)
                        }
                    )
                )
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                OutlinedButton(onClick = { viewModel.useCurrentLocationAsAnchor() }) {
                    Icon(Icons.Default.MyLocation, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.use_current_position))
                }
            }
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
                Text(
                    text = stringResource(R.string.waiting_for_gps),
                    modifier = Modifier.padding(top = 64.dp)
                )
            }
        }
    }
}

@Composable
private fun ZoneTypeStep(state: SetupState, viewModel: SetupViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = stringResource(R.string.choose_zone_type),
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(32.dp))

        Card(
            onClick = { viewModel.setZoneType(ZoneType.CIRCLE) },
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (state.zoneType == ZoneType.CIRCLE)
                    MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.surface
            )
        ) {
            Row(
                modifier = Modifier.padding(20.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(
                    selected = state.zoneType == ZoneType.CIRCLE,
                    onClick = { viewModel.setZoneType(ZoneType.CIRCLE) }
                )
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = stringResource(R.string.simple_circle),
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = stringResource(R.string.simple_circle_desc),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            onClick = { viewModel.setZoneType(ZoneType.SECTOR) },
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (state.zoneType == ZoneType.SECTOR)
                    MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.surface
            )
        ) {
            Row(
                modifier = Modifier.padding(20.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(
                    selected = state.zoneType == ZoneType.SECTOR,
                    onClick = { viewModel.setZoneType(ZoneType.SECTOR) }
                )
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = stringResource(R.string.circle_with_sector),
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = stringResource(R.string.circle_with_sector_desc),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun RadiusStep(state: SetupState, viewModel: SetupViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        Text(
            text = stringResource(R.string.set_radius),
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Toggle: manual vs calculator
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.use_calculator))
            Spacer(modifier = Modifier.width(8.dp))
            Switch(
                checked = state.useCalculator,
                onCheckedChange = { viewModel.setUseCalculator(it) }
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (state.useCalculator) {
            // Depth first — so ratio can auto-fill chain
            OutlinedTextField(
                value = state.depthM,
                onValueChange = { viewModel.setDepth(it) },
                label = { Text(stringResource(R.string.depth_m)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                suffix = { Text("m") }
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Scope ratio selector
            Text(
                text = stringResource(R.string.scope_ratio_label),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                ScopeRatio.entries.forEach { ratio ->
                    FilterChip(
                        selected = state.selectedScopeRatio == ratio,
                        onClick = { viewModel.setScopeRatio(ratio) },
                        label = {
                            Text(
                                when (ratio) {
                                    ScopeRatio.RATIO_3 -> stringResource(R.string.scope_ratio_3)
                                    ScopeRatio.RATIO_5 -> stringResource(R.string.scope_ratio_5)
                                    ScopeRatio.RATIO_7 -> stringResource(R.string.scope_ratio_7)
                                    ScopeRatio.RATIO_10 -> stringResource(R.string.scope_ratio_10)
                                    ScopeRatio.CUSTOM -> stringResource(R.string.scope_ratio_custom)
                                }
                            )
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Chain length — auto-filled from ratio or manual
            OutlinedTextField(
                value = state.chainLengthM,
                onValueChange = { viewModel.setChainLength(it) },
                label = { Text(stringResource(R.string.chain_length_m)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                suffix = { Text("m") },
                supportingText = {
                    if (state.chainAutoFilled && state.selectedScopeRatio != ScopeRatio.CUSTOM) {
                        Text(
                            stringResource(
                                R.string.chain_auto_filled,
                                "%.0f".format(state.selectedScopeRatio.ratio)
                            )
                        )
                    }
                }
            )

            Spacer(modifier = Modifier.height(12.dp))
            state.calculatedRadius?.let { radius ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Text(
                        text = stringResource(R.string.calculated_radius, "%.0f".format(radius)),
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = state.radiusMeters,
            onValueChange = { viewModel.setRadiusMeters(it) },
            label = { Text(stringResource(R.string.radius_label)) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth(),
            suffix = { Text("m") },
            enabled = !state.useCalculator || state.calculatedRadius != null
        )

        if (state.zoneType == ZoneType.SECTOR) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.radius_inner_circle_hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(24.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
        Spacer(modifier = Modifier.height(16.dp))

        // Buffer zone toggle
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.use_buffer_zone))
            Spacer(modifier = Modifier.width(8.dp))
            Switch(
                checked = state.useBufferZone,
                onCheckedChange = { viewModel.setUseBufferZone(it) }
            )
        }

        if (state.useBufferZone) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.buffer_zone_desc),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = state.bufferRadiusMeters,
                onValueChange = { viewModel.setBufferRadius(it) },
                label = { Text(stringResource(R.string.buffer_radius_label)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                suffix = { Text("m") },
                supportingText = { Text(stringResource(R.string.buffer_radius_hint)) }
            )
        }
    }
}

@Composable
private fun SectorConfigStep(state: SetupState, viewModel: SetupViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        Text(
            text = stringResource(R.string.sector_configuration),
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(24.dp))

        OutlinedTextField(
            value = state.sectorRadiusMeters,
            onValueChange = { viewModel.setSectorRadius(it) },
            label = { Text(stringResource(R.string.sector_radius)) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth(),
            suffix = { Text("m") }
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = state.sectorHalfAngleDeg,
            onValueChange = { viewModel.setSectorHalfAngle(it) },
            label = { Text(stringResource(R.string.sector_half_angle)) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth(),
            suffix = { Text("\u00B0") },
            supportingText = { Text(stringResource(R.string.sector_angle_hint)) }
        )

        Spacer(modifier = Modifier.height(16.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.auto_bearing))
            Spacer(modifier = Modifier.width(8.dp))
            Switch(
                checked = state.autoSectorBearing,
                onCheckedChange = { viewModel.setAutoSectorBearing(it) }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = state.sectorBearingDeg,
            onValueChange = { viewModel.setSectorBearing(it) },
            label = { Text(stringResource(R.string.sector_bearing)) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth(),
            suffix = { Text("\u00B0") },
            enabled = !state.autoSectorBearing,
            supportingText = { Text(stringResource(R.string.bearing_hint)) }
        )
    }
}

@Composable
private fun ConfirmStep(state: SetupState) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
    ) {
        Text(
            text = stringResource(R.string.confirm_setup),
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(24.dp))

        SummaryRow(stringResource(R.string.anchor_position), "%.6f, %.6f".format(state.anchorLat, state.anchorLng))
        SummaryRow(stringResource(R.string.zone_type_label), if (state.zoneType == ZoneType.CIRCLE) stringResource(R.string.simple_circle) else stringResource(R.string.circle_with_sector))
        SummaryRow(stringResource(R.string.radius_label), "${state.radiusMeters} m")

        if (state.zoneType == ZoneType.SECTOR) {
            SummaryRow(stringResource(R.string.sector_radius), "${state.sectorRadiusMeters} m")
            SummaryRow(stringResource(R.string.sector_half_angle), "${state.sectorHalfAngleDeg}\u00B0")
            SummaryRow(stringResource(R.string.sector_bearing), "${state.sectorBearingDeg}\u00B0")
        }

        if (state.useBufferZone) {
            SummaryRow(stringResource(R.string.buffer_radius_label), "${state.bufferRadiusMeters} m")
        }

        if (state.chainLengthM.isNotBlank()) {
            SummaryRow(stringResource(R.string.chain_length_m), "${state.chainLengthM} m")
        }
        if (state.depthM.isNotBlank()) {
            SummaryRow(stringResource(R.string.depth_m), "${state.depthM} m")
        }

        state.error?.let {
            Spacer(modifier = Modifier.height(16.dp))
            Text(text = it, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge
        )
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
}
