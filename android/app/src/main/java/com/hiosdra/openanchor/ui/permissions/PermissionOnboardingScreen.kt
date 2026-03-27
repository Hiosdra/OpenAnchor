package com.hiosdra.openanchor.ui.permissions

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.hiosdra.openanchor.R

private enum class PermissionStep {
    IDLE, LOCATION, BACKGROUND_LOCATION, NOTIFICATIONS, CAMERA, DONE
}

private data class PermissionStates(
    val locationGranted: Boolean = false,
    val backgroundLocationGranted: Boolean = false,
    val notificationsGranted: Boolean = false,
    val cameraGranted: Boolean = false
)

private fun checkAllPermissions(context: android.content.Context): PermissionStates {
    return PermissionStates(
        locationGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED,
        backgroundLocationGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        } else true,
        notificationsGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else true,
        cameraGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    )
}

@Composable
fun PermissionOnboardingScreen(
    onComplete: () -> Unit,
    viewModel: PermissionOnboardingViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var permissions by remember { mutableStateOf(checkAllPermissions(context)) }
    var currentStep by remember { mutableStateOf(PermissionStep.IDLE) }

    fun refreshPermissions() {
        permissions = checkAllPermissions(context)
    }

    fun completeOnboarding() {
        viewModel.markOnboardingSeen()
        onComplete()
    }

    // Auto-complete if all permissions are already granted (e.g. returning user, test setup)
    LaunchedEffect(Unit) {
        val perms = checkAllPermissions(context)
        if (perms.locationGranted && perms.backgroundLocationGranted &&
            perms.notificationsGranted && perms.cameraGranted
        ) {
            completeOnboarding()
        }
    }

    val locationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        refreshPermissions()
        currentStep = PermissionStep.BACKGROUND_LOCATION
    }

    val bgLocationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) {
        refreshPermissions()
        currentStep = PermissionStep.NOTIFICATIONS
    }

    val notificationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) {
        refreshPermissions()
        currentStep = PermissionStep.CAMERA
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) {
        refreshPermissions()
        currentStep = PermissionStep.DONE
    }

    LaunchedEffect(currentStep) {
        when (currentStep) {
            PermissionStep.IDLE -> { /* waiting for user */ }
            PermissionStep.LOCATION -> {
                if (!permissions.locationGranted) {
                    locationLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                    )
                } else {
                    currentStep = PermissionStep.BACKGROUND_LOCATION
                }
            }
            PermissionStep.BACKGROUND_LOCATION -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
                    permissions.locationGranted &&
                    !permissions.backgroundLocationGranted
                ) {
                    bgLocationLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                } else {
                    currentStep = PermissionStep.NOTIFICATIONS
                }
            }
            PermissionStep.NOTIFICATIONS -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                    !permissions.notificationsGranted
                ) {
                    notificationLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    currentStep = PermissionStep.CAMERA
                }
            }
            PermissionStep.CAMERA -> {
                if (!permissions.cameraGranted) {
                    cameraLauncher.launch(Manifest.permission.CAMERA)
                } else {
                    currentStep = PermissionStep.DONE
                }
            }
            PermissionStep.DONE -> {
                completeOnboarding()
            }
        }
    }

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(48.dp))

            Text(
                text = stringResource(R.string.permission_onboarding_title),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = stringResource(R.string.permission_onboarding_subtitle),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(24.dp))

            PermissionCard(
                icon = Icons.Default.LocationOn,
                name = stringResource(R.string.permission_onboarding_location_name),
                description = stringResource(R.string.permission_onboarding_location_desc),
                granted = permissions.locationGranted
            )

            Spacer(modifier = Modifier.height(12.dp))

            PermissionCard(
                icon = Icons.Default.MyLocation,
                name = stringResource(R.string.permission_onboarding_bg_location_name),
                description = stringResource(R.string.permission_onboarding_bg_location_desc),
                granted = permissions.backgroundLocationGranted
            )

            Spacer(modifier = Modifier.height(12.dp))

            PermissionCard(
                icon = Icons.Default.Notifications,
                name = stringResource(R.string.permission_onboarding_notifications_name),
                description = stringResource(R.string.permission_onboarding_notifications_desc),
                granted = permissions.notificationsGranted
            )

            Spacer(modifier = Modifier.height(12.dp))

            PermissionCard(
                icon = Icons.Default.CameraAlt,
                name = stringResource(R.string.permission_onboarding_camera_name),
                description = stringResource(R.string.permission_onboarding_camera_desc),
                granted = permissions.cameraGranted
            )

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = { currentStep = PermissionStep.LOCATION },
                modifier = Modifier.fillMaxWidth(),
                enabled = currentStep == PermissionStep.IDLE
            ) {
                Text(stringResource(R.string.permission_onboarding_grant))
            }

            Spacer(modifier = Modifier.height(8.dp))

            TextButton(onClick = { completeOnboarding() }) {
                Text(stringResource(R.string.permission_onboarding_skip))
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun PermissionCard(
    icon: ImageVector,
    name: String,
    description: String,
    granted: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (granted) MaterialTheme.colorScheme.secondary
                else MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(32.dp)
            )

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            if (granted) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = stringResource(R.string.permission_onboarding_granted),
                    tint = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}
