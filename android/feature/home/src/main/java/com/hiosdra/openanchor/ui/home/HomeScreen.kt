package com.hiosdra.openanchor.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Anchor
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.PhonelinkSetup
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.SyncAlt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.ui.theme.CautionYellow
import com.hiosdra.openanchor.ui.theme.OceanBlue
import com.hiosdra.openanchor.ui.theme.SafeGreen
import com.hiosdra.openanchor.ui.theme.pressEffect

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onStartSetup: () -> Unit,
    onOpenHistory: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenStatistics: () -> Unit,
    onPairWithTablet: () -> Unit,
    onConnectToServer: () -> Unit,
    onOpenCrewWatch: () -> Unit,
    onOpenAdvisor: () -> Unit,
    onOpenLogbook: () -> Unit,
    onOpenExamQuiz: () -> Unit,
    onResumeMonitoring: (Long) -> Unit,
    onResumeClientMode: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val activeSession by viewModel.activeSession.collectAsStateWithLifecycle()
    val isClientModeActive by viewModel.isClientModeActive.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("OpenAnchor") },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = stringResource(R.string.settings))
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp)
                .padding(top = 32.dp, bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Top
        ) {
            Icon(
                imageVector = Icons.Default.Anchor,
                contentDescription = null,
                modifier = Modifier.size(120.dp),
                tint = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "OpenAnchor",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = stringResource(R.string.home_subtitle),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(48.dp))

            if (activeSession != null) {
                Button(
                    onClick = { activeSession?.let { onResumeMonitoring(it.id) } },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .pressEffect(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SafeGreen
                    )
                ) {
                    Icon(Icons.Default.Anchor, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = stringResource(R.string.resume_monitoring),
                        style = MaterialTheme.typography.titleMedium
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            if (isClientModeActive) {
                Button(
                    onClick = onResumeClientMode,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .pressEffect(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = OceanBlue
                    )
                ) {
                    Icon(Icons.Default.SyncAlt, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = stringResource(R.string.resume_client_mode),
                        style = MaterialTheme.typography.titleMedium
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            Button(
                onClick = onStartSetup,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .pressEffect()
            ) {
                Icon(Icons.Default.Anchor, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.drop_anchor),
                    style = MaterialTheme.typography.titleMedium
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = onPairWithTablet,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .pressEffect(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = OceanBlue
                )
            ) {
                Icon(Icons.Default.PhonelinkSetup, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.pair_with_tablet),
                    style = MaterialTheme.typography.titleMedium
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedButton(
                onClick = onConnectToServer,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .pressEffect()
            ) {
                Icon(Icons.Default.QrCodeScanner, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.connect_to_server),
                    style = MaterialTheme.typography.titleMedium
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedButton(
                onClick = onOpenCrewWatch,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .pressEffect()
            ) {
                Icon(Icons.Default.AccessTime, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.crew_watch),
                    style = MaterialTheme.typography.titleMedium
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // AI tools row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onOpenAdvisor,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp)
                        .pressEffect()
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = stringResource(R.string.ai_advisor),
                        style = MaterialTheme.typography.titleMedium
                    )
                }
                OutlinedButton(
                    onClick = onOpenLogbook,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp)
                        .pressEffect()
                ) {
                    Icon(Icons.Default.Book, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = stringResource(R.string.ai_logbook),
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Exam Quiz
            OutlinedButton(
                onClick = onOpenExamQuiz,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .pressEffect()
            ) {
                Icon(Icons.Default.School, contentDescription = null, tint = CautionYellow)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.exam_quiz),
                    style = MaterialTheme.typography.titleMedium
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedButton(
                onClick = onOpenHistory,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .pressEffect()
            ) {
                Icon(Icons.Default.History, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.history),
                    style = MaterialTheme.typography.titleMedium
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedButton(
                onClick = onOpenStatistics,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .pressEffect()
            ) {
                Icon(Icons.Default.Analytics, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.statistics),
                    style = MaterialTheme.typography.titleMedium
                )
            }
        }
    }
}
