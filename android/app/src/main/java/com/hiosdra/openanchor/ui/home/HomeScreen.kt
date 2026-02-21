package com.hiosdra.openanchor.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Anchor
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.History
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
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.ui.theme.SafeGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onStartSetup: () -> Unit,
    onOpenHistory: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenStatistics: () -> Unit,
    onResumeMonitoring: (Long) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val activeSession by viewModel.activeSession.collectAsStateWithLifecycle()

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
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
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
                        .height(56.dp),
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

            Button(
                onClick = onStartSetup,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            ) {
                Icon(Icons.Default.Anchor, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.drop_anchor),
                    style = MaterialTheme.typography.titleMedium
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedButton(
                onClick = onOpenHistory,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
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
