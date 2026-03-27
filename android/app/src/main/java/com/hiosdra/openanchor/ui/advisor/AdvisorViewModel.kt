package com.hiosdra.openanchor.ui.advisor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.ai.GeminiService
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatMessage(
    val text: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis()
)

data class AdvisorUiState(
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = false,
    val isConfigured: Boolean = false,
    val apiKeyInput: String = "",
    val error: String? = null,
    val suggestedQuestions: List<String> = listOf(
        "Is my anchor safe in current conditions?",
        "What scope ratio should I use?",
        "When should I re-anchor?",
        "How to prepare for overnight anchoring?",
        "What are signs of anchor dragging?"
    )
)

@HiltViewModel
class AdvisorViewModel @Inject constructor(
    private val geminiService: GeminiService,
    private val sessionRepository: AnchorSessionRepository,
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdvisorUiState())
    val uiState: StateFlow<AdvisorUiState> = _uiState.asStateFlow()

    // Cache current context
    private var currentSession: AnchorSession? = null
    private var currentPosition: Position? = null
    private var recentTrackPoints: List<TrackPoint> = emptyList()

    init {
        // Load API key from preferences
        viewModelScope.launch {
            preferencesManager.preferences.first().let { prefs ->
                val savedKey = prefs.geminiApiKey
                if (!savedKey.isNullOrBlank()) {
                    geminiService.configure(savedKey)
                    _uiState.update { it.copy(isConfigured = true) }
                }
            }
        }

        // Observe active session for context
        viewModelScope.launch {
            sessionRepository.observeActiveSession()
                .flatMapLatest { session ->
                    if (session != null) {
                        sessionRepository.observeRecentTrackPoints(session.id, 20)
                            .map { points -> session to points }
                    } else {
                        flowOf(null to emptyList())
                    }
                }
                .collect { (session, points) ->
                    currentSession = session
                    recentTrackPoints = points
                }
        }
    }

    fun onApiKeyChange(key: String) {
        _uiState.update { it.copy(apiKeyInput = key) }
    }

    fun saveApiKey() {
        val key = _uiState.value.apiKeyInput.trim()
        if (key.isBlank()) return

        viewModelScope.launch {
            preferencesManager.setGeminiApiKey(key)
            geminiService.configure(key)
            _uiState.update { it.copy(isConfigured = true, error = null) }
        }
    }

    fun sendMessage(text: String) {
        if (text.isBlank()) return

        val userMessage = ChatMessage(text = text, isUser = true)
        _uiState.update {
            it.copy(
                messages = it.messages + userMessage,
                isLoading = true,
                error = null
            )
        }

        viewModelScope.launch {
            val result = geminiService.askAdvisor(
                question = text,
                currentPosition = currentPosition,
                currentSession = currentSession,
                trackPoints = recentTrackPoints
            )

            result.fold(
                onSuccess = { response ->
                    val aiMessage = ChatMessage(text = response, isUser = false)
                    _uiState.update {
                        it.copy(
                            messages = it.messages + aiMessage,
                            isLoading = false
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to get AI response"
                        )
                    }
                }
            )
        }
    }

    fun clearChat() {
        _uiState.update { it.copy(messages = emptyList(), error = null) }
    }

    fun updatePosition(position: Position) {
        currentPosition = position
    }
}
