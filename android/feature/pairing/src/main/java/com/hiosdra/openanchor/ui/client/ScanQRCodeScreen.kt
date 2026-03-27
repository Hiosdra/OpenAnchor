package com.hiosdra.openanchor.ui.client

import android.Manifest
import android.util.Size
import android.view.ViewGroup
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.zxing.*
import com.google.zxing.common.HybridBinarizer
import com.hiosdra.openanchor.core.ui.R
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanQRCodeScreen(
    onBack: () -> Unit,
    onConnected: () -> Unit,
    viewModel: ScanQRCodeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Auto-navigate when connected
    LaunchedEffect(uiState.step) {
        if (uiState.step == ScanStep.CONNECTED) {
            kotlinx.coroutines.delay(800)
            onConnected()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.client_scan_title)) },
                navigationIcon = {
                    IconButton(onClick = {
                        viewModel.cancelConnection()
                        onBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            when (uiState.step) {
                ScanStep.SCANNING -> {
                    ScanningContent(
                        onQRCodeScanned = { viewModel.onQRCodeScanned(it) },
                        manualUrl = uiState.manualUrl,
                        onManualUrlChange = { viewModel.setManualUrl(it) },
                        onConnectManual = { viewModel.connectManual() }
                    )
                }
                ScanStep.SCANNED -> {
                    ScannedContent(
                        url = uiState.scannedUrl ?: "",
                        ssid = uiState.serverSsid,
                        password = uiState.serverPassword,
                        onConnect = { viewModel.connectToServer() },
                        onRescan = { viewModel.resetToScanning() }
                    )
                }
                ScanStep.CONNECTING -> {
                    ConnectingContent(url = uiState.scannedUrl ?: "")
                }
                ScanStep.CONNECTED -> {
                    ConnectedContent()
                }
                ScanStep.ERROR -> {
                    ErrorContent(
                        message = uiState.errorMessage ?: "Unknown error",
                        onRetry = { viewModel.resetToScanning() }
                    )
                }
            }
        }
    }
}

@Composable
private fun ScanningContent(
    onQRCodeScanned: (String) -> Unit,
    manualUrl: String,
    onManualUrlChange: (String) -> Unit,
    onConnectManual: () -> Unit
) {
    Text(
        text = stringResource(R.string.client_scan_description),
        style = MaterialTheme.typography.bodyLarge,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )

    Spacer(modifier = Modifier.height(16.dp))

    // QR Scanner camera view
    QRScannerView(
        onQRCodeScanned = onQRCodeScanned,
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clip(RoundedCornerShape(16.dp))
            .border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(16.dp))
    )

    Spacer(modifier = Modifier.height(24.dp))

    // Divider with "or"
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        HorizontalDivider(modifier = Modifier.weight(1f))
        Text(
            text = stringResource(R.string.pairing_or),
            modifier = Modifier.padding(horizontal = 16.dp),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        HorizontalDivider(modifier = Modifier.weight(1f))
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Manual URL entry
    OutlinedTextField(
        value = manualUrl,
        onValueChange = onManualUrlChange,
        label = { Text(stringResource(R.string.client_manual_url)) },
        placeholder = { Text("ws://192.168.x.x:8080") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Go),
        keyboardActions = KeyboardActions(onGo = { onConnectManual() }),
        trailingIcon = {
            if (manualUrl.isNotBlank()) {
                IconButton(onClick = onConnectManual) {
                    Icon(Icons.Default.Send, contentDescription = "Connect")
                }
            }
        }
    )
}

@Composable
private fun QRScannerView(
    onQRCodeScanned: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var hasCameraPermission by remember { mutableStateOf(false) }
    var lastScannedCode by remember { mutableStateOf<String?>(null) }

    // Check permission
    val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
    }

    LaunchedEffect(Unit) {
        val result = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
        if (result == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            hasCameraPermission = true
        } else {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    if (!hasCameraPermission) {
        Box(
            modifier = modifier.background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.CameraAlt,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    stringResource(R.string.client_camera_permission),
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center
                )
            }
        }
        return
    }

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            val previewView = PreviewView(ctx).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                scaleType = PreviewView.ScaleType.FILL_CENTER
            }

            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
            val executor = Executors.newSingleThreadExecutor()

            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()

                val preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                }

                val imageAnalysis = ImageAnalysis.Builder()
                    .setTargetResolution(Size(1280, 720))
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()

                val reader = MultiFormatReader().apply {
                    setHints(mapOf(
                        DecodeHintType.POSSIBLE_FORMATS to listOf(BarcodeFormat.QR_CODE),
                        DecodeHintType.TRY_HARDER to true
                    ))
                }

                imageAnalysis.setAnalyzer(executor) { imageProxy ->
                    @androidx.annotation.OptIn(ExperimentalGetImage::class)
                    val mediaImage = imageProxy.image
                    if (mediaImage != null) {
                        try {
                            val buffer = mediaImage.planes[0].buffer
                            val bytes = ByteArray(buffer.remaining())
                            buffer.get(bytes)
                            val source = PlanarYUVLuminanceSource(
                                bytes,
                                mediaImage.width,
                                mediaImage.height,
                                0, 0,
                                mediaImage.width,
                                mediaImage.height,
                                false
                            )
                            val binaryBitmap = BinaryBitmap(HybridBinarizer(source))
                            val result = reader.decodeWithState(binaryBitmap)
                            val text = result.text
                            if (text != null && text != lastScannedCode) {
                                lastScannedCode = text
                                onQRCodeScanned(text)
                            }
                        } catch (_: NotFoundException) {
                            // No QR code found in this frame — normal
                        } catch (_: Exception) {
                            // Other decoding errors — skip frame
                        } finally {
                            reader.reset()
                        }
                    }
                    imageProxy.close()
                }

                try {
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        imageAnalysis
                    )
                } catch (e: Exception) {
                    android.util.Log.e("QRScanner", "Camera bind failed", e)
                }
            }, ContextCompat.getMainExecutor(ctx))

            previewView
        }
    )
}

@Composable
private fun ScannedContent(
    url: String,
    ssid: String?,
    password: String?,
    onConnect: () -> Unit,
    onRescan: () -> Unit
) {
    Icon(
        Icons.Default.QrCodeScanner,
        contentDescription = null,
        modifier = Modifier.size(64.dp),
        tint = MaterialTheme.colorScheme.primary
    )

    Spacer(modifier = Modifier.height(16.dp))

    Text(
        text = stringResource(R.string.client_scanned_title),
        style = MaterialTheme.typography.headlineSmall
    )

    Spacer(modifier = Modifier.height(16.dp))

    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.pairing_ws_url),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(text = url, style = MaterialTheme.typography.bodyLarge)

            if (ssid != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = stringResource(R.string.pairing_wifi_name),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(text = ssid, style = MaterialTheme.typography.bodyLarge)
            }

            if (password != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = stringResource(R.string.pairing_wifi_password),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(text = password, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }

    Spacer(modifier = Modifier.height(8.dp))

    if (ssid != null) {
        Text(
            text = stringResource(R.string.client_connect_wifi_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
    }

    Spacer(modifier = Modifier.height(16.dp))

    Button(
        onClick = onConnect,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
    ) {
        Icon(Icons.Default.Link, contentDescription = null)
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = stringResource(R.string.client_connect),
            style = MaterialTheme.typography.titleMedium
        )
    }

    Spacer(modifier = Modifier.height(8.dp))

    OutlinedButton(
        onClick = onRescan,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(stringResource(R.string.client_rescan))
    }
}

@Composable
private fun ConnectingContent(url: String) {
    Spacer(modifier = Modifier.height(48.dp))

    CircularProgressIndicator(modifier = Modifier.size(64.dp))

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = stringResource(R.string.client_connecting),
        style = MaterialTheme.typography.headlineSmall
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = url,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}

@Composable
private fun ConnectedContent() {
    Spacer(modifier = Modifier.height(48.dp))

    Icon(
        Icons.Default.CheckCircle,
        contentDescription = null,
        modifier = Modifier.size(80.dp),
        tint = Color(0xFF4CAF50)
    )

    Spacer(modifier = Modifier.height(16.dp))

    Text(
        text = stringResource(R.string.client_connected),
        style = MaterialTheme.typography.headlineSmall
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = stringResource(R.string.client_connected_hint),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center
    )
}

@Composable
private fun ErrorContent(
    message: String,
    onRetry: () -> Unit
) {
    Spacer(modifier = Modifier.height(48.dp))

    Icon(
        Icons.Default.Error,
        contentDescription = null,
        modifier = Modifier.size(64.dp),
        tint = MaterialTheme.colorScheme.error
    )

    Spacer(modifier = Modifier.height(16.dp))

    Text(
        text = stringResource(R.string.pairing_error),
        style = MaterialTheme.typography.headlineSmall,
        color = MaterialTheme.colorScheme.error
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = message,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(24.dp))

    Button(
        onClick = onRetry,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(stringResource(R.string.client_retry))
    }
}
