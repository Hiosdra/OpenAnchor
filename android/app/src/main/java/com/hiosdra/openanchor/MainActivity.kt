package com.hiosdra.openanchor

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.core.content.ContextCompat
import androidx.navigation.compose.rememberNavController
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.ui.navigation.OpenAnchorNavHost
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var preferencesManager: PreferencesManager

    private var showLocationPermissionDialog by mutableStateOf(false)
    private var showBackgroundLocationDialog by mutableStateOf(false)
    private var showNotificationsDialog by mutableStateOf(false)
    private var permissionsToRequest = mutableListOf<String>()

    private val locationPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true

        // Request background location after foreground permissions are granted (Android 10+)
        if ((fineGranted || coarseGranted) && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            showBackgroundLocationExplanation()
        }
    }

    private val backgroundLocationPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        // Background location permission handled
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        checkAndRequestPermissions()

        setContent {
            val prefs by preferencesManager.preferences.collectAsState(
                initial = com.hiosdra.openanchor.data.preferences.UserPreferences()
            )

            OpenAnchorTheme(nightFilterEnabled = prefs.nightFilterEnabled) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    val navController = rememberNavController()
                    OpenAnchorNavHost(navController = navController)

                    // Location Permission Explanation Dialog
                    if (showLocationPermissionDialog) {
                        AlertDialog(
                            onDismissRequest = { showLocationPermissionDialog = false },
                            title = { Text(stringResource(R.string.permissions_location_title)) },
                            text = { Text(stringResource(R.string.permissions_location_message)) },
                            confirmButton = {
                                TextButton(onClick = {
                                    showLocationPermissionDialog = false
                                    locationPermissionRequest.launch(permissionsToRequest.toTypedArray())
                                }) {
                                    Text(stringResource(R.string.permissions_continue))
                                }
                            }
                        )
                    }

                    // Background Location Permission Explanation Dialog
                    if (showBackgroundLocationDialog) {
                        AlertDialog(
                            onDismissRequest = { showBackgroundLocationDialog = false },
                            title = { Text(stringResource(R.string.permissions_background_location_title)) },
                            text = { Text(stringResource(R.string.permissions_background_location_message)) },
                            confirmButton = {
                                TextButton(onClick = {
                                    showBackgroundLocationDialog = false
                                    requestBackgroundLocationPermission()
                                }) {
                                    Text(stringResource(R.string.permissions_continue))
                                }
                            }
                        )
                    }

                    // Notifications Permission Explanation Dialog
                    if (showNotificationsDialog) {
                        AlertDialog(
                            onDismissRequest = { showNotificationsDialog = false },
                            title = { Text(stringResource(R.string.permissions_notifications_title)) },
                            text = { Text(stringResource(R.string.permissions_notifications_message)) },
                            confirmButton = {
                                TextButton(onClick = {
                                    showNotificationsDialog = false
                                    locationPermissionRequest.launch(permissionsToRequest.toTypedArray())
                                }) {
                                    Text(stringResource(R.string.permissions_continue))
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val fineLocation = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        )
        val coarseLocation = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_COARSE_LOCATION
        )

        permissionsToRequest.clear()
        if (fineLocation != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        if (coarseLocation != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION)
        }

        // Check if notifications permission is needed (Android 13+)
        var needsNotifications = false
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            val notifPermission = ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            )
            if (notifPermission != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
                needsNotifications = true
            }
        }

        // Show appropriate explanation dialog
        if (permissionsToRequest.isNotEmpty()) {
            // If we need notifications along with location, show notifications dialog first
            if (needsNotifications && permissionsToRequest.size > 1) {
                showNotificationsDialog = true
            } else if (needsNotifications) {
                showNotificationsDialog = true
            } else {
                showLocationPermissionDialog = true
            }
        } else {
            // Foreground permissions already granted, check background if needed
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                showBackgroundLocationExplanation()
            }
        }
    }

    private fun showBackgroundLocationExplanation() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            val bgLocation = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            )
            if (bgLocation != PackageManager.PERMISSION_GRANTED) {
                showBackgroundLocationDialog = true
            }
        }
    }

    private fun requestBackgroundLocationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            val bgLocation = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            )
            if (bgLocation != PackageManager.PERMISSION_GRANTED) {
                backgroundLocationPermissionRequest.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }
        }
    }
}
