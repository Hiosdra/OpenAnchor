package com.hiosdra.openanchor.ui.logbook

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.ai.GeminiService
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.data.repository.LogbookRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.LogbookEntry
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LogbookUiState(
    val entries: List<LogbookEntry> = emptyList(),
    val sessions: List<AnchorSession> = emptyList(),
    val isGenerating: Boolean = false,
    val generatingSessionId: Long? = null,
    val error: String? = null,
    val isAiConfigured: Boolean = false
)

@HiltViewModel
class LogbookViewModel @Inject constructor(
    private val logbookRepository: LogbookRepository,
    private val sessionRepository: AnchorSessionRepository,
    private val geminiService: GeminiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(LogbookUiState())
    val uiState: StateFlow<LogbookUiState> = _uiState.asStateFlow()

    init {
        _uiState.update { it.copy(isAiConfigured = geminiService.isConfigured) }

        // Observe logbook entries
        viewModelScope.launch {
            logbookRepository.observeAllEntries().collect { entries ->
                _uiState.update { it.copy(entries = entries) }
            }
        }

        // Observe completed sessions (for generating new entries)
        viewModelScope.launch {
            sessionRepository.observeAllSessions().collect { sessions ->
                val completed = sessions.filter { it.endTime != null }
                _uiState.update { it.copy(sessions = completed) }
            }
        }
    }

    /**
     * Generate an AI logbook entry for a given session.
     */
    fun generateEntry(session: AnchorSession) {
        if (!geminiService.isConfigured) {
            _uiState.update { it.copy(error = "Gemini API key not configured. Go to AI Advisor to set it up.") }
            return
        }

        _uiState.update { it.copy(isGenerating = true, generatingSessionId = session.id, error = null) }

        viewModelScope.launch {
            val trackPoints = sessionRepository.getTrackPointsOnce(session.id)

            val result = geminiService.generateLogbookSummary(
                session = session,
                trackPoints = trackPoints
            )

            result.fold(
                onSuccess = { aiText ->
                    // Parse the AI response
                    val summary = extractSection(aiText, "SUMMARY:")
                    val log = extractSection(aiText, "LOG:")
                    val safety = extractSection(aiText, "SAFETY:")

                    val entry = LogbookEntry(
                        sessionId = session.id,
                        summary = summary.ifBlank { "Anchoring session" },
                        logEntry = log.ifBlank { aiText },
                        safetyNote = safety.ifBlank { "No safety assessment available." }
                    )

                    // Check if entry already exists
                    val existing = logbookRepository.getEntryForSession(session.id)
                    if (existing != null) {
                        logbookRepository.updateEntry(entry.copy(id = existing.id))
                    } else {
                        logbookRepository.insertEntry(entry)
                    }

                    _uiState.update { it.copy(isGenerating = false, generatingSessionId = null) }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isGenerating = false,
                            generatingSessionId = null,
                            error = error.message ?: "Failed to generate logbook entry"
                        )
                    }
                }
            )
        }
    }

    fun deleteEntry(entryId: Long) {
        viewModelScope.launch {
            logbookRepository.deleteEntry(entryId)
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun extractSection(text: String, marker: String): String {
        val idx = text.indexOf(marker, ignoreCase = true)
        if (idx == -1) return ""
        val after = text.substring(idx + marker.length).trim()
        // Take until next section marker or end
        val nextMarkerIdx = listOf("SUMMARY:", "LOG:", "SAFETY:")
            .filter { it != marker }
            .mapNotNull {
                val i = after.indexOf(it, ignoreCase = true)
                if (i > 0) i else null
            }
            .minOrNull()
        return if (nextMarkerIdx != null) {
            after.substring(0, nextMarkerIdx).trim()
        } else {
            after.trim()
        }
    }
}
