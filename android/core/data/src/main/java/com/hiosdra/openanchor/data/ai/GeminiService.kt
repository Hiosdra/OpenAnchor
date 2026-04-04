package com.hiosdra.openanchor.data.ai

import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import com.google.ai.client.generativeai.type.generationConfig
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.data.weather.WeatherRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Service wrapping the Gemini Generative AI for anchoring-specific advice.
 * Provides context-aware advice based on current conditions and history.
 */
@Singleton
class GeminiService @Inject constructor(
    private val sessionRepository: AnchorSessionRepository,
    private val weatherRepository: WeatherRepository
) {
    companion object {
        /**
         * Users should set their own Gemini API key.
         * In production, this would come from BuildConfig or encrypted preferences.
         */
        private const val MODEL_NAME = "gemini-1.5-flash"
    }

    private var apiKey: String? = null
    private var model: GenerativeModel? = null

    val isConfigured: Boolean get() = apiKey != null && model != null

    fun configure(key: String) {
        apiKey = key
        model = GenerativeModel(
            modelName = MODEL_NAME,
            apiKey = key,
            generationConfig = generationConfig {
                temperature = 0.7f
                topK = 40
                topP = 0.95f
                maxOutputTokens = 1024
            }
        )
    }

    /**
     * Ask the AI advisor a question with anchoring context.
     */
    suspend fun askAdvisor(
        question: String,
        currentPosition: Position?,
        currentSession: AnchorSession?,
        trackPoints: List<TrackPoint> = emptyList()
    ): Result<String> = withContext(Dispatchers.IO) {
        val generativeModel = model
            ?: return@withContext Result.failure(Exception("Gemini API key not configured. Go to Settings to add your API key."))

        try {
            val contextPrompt = buildContextPrompt(currentPosition, currentSession, trackPoints)

            val response = generativeModel.generateContent(
                content {
                    text("""You are an expert sailing advisor specializing in anchoring safety.
                        |You provide concise, actionable advice for sailors.
                        |Always consider safety as the top priority.
                        |If you don't know something, say so — never make up navigational data.
                        |Keep answers under 300 words unless detailed analysis is needed.
                        |
                        |$contextPrompt
                        |
                        |Sailor's question: $question""".trimMargin())
                }
            )

            val text = response.text
            if (text != null) {
                Result.success(text)
            } else {
                Result.failure(Exception("Empty response from AI"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Generate an AI logbook summary for a completed session.
     */
    suspend fun generateLogbookSummary(
        session: AnchorSession,
        trackPoints: List<TrackPoint>,
        weatherSummary: String? = null
    ): Result<String> = withContext(Dispatchers.IO) {
        val generativeModel = model
            ?: return@withContext Result.failure(Exception("Gemini API key not configured."))

        try {
            val durationMs = (session.endTime ?: System.currentTimeMillis()) - session.startTime
            val durationHours = durationMs / 3600000.0
            val maxDistance = trackPoints.maxOfOrNull { it.distanceToAnchor } ?: 0f
            val avgDistance = if (trackPoints.isNotEmpty()) trackPoints.map { it.distanceToAnchor }.average() else 0.0
            val alarmPoints = trackPoints.count { it.isAlarm }

            val prompt = """Generate a concise nautical logbook entry for this anchoring session.
                |Write it in a professional maritime log style.
                |
                |Session data:
                |- Anchor position: ${session.anchorPosition.latitude}, ${session.anchorPosition.longitude}
                |- Duration: %.1f hours
                |- Safe zone radius: %.0f m
                |- Alarms triggered: ${session.alarmCount}
                |- Max distance from anchor: %.0f m
                |- Average distance: %.0f m
                |- Track points recorded: ${trackPoints.size}
                |- Alarm track points: $alarmPoints
                |${weatherSummary?.let { "- Weather conditions: $it" } ?: ""}
                |
                |Generate:
                |1. A one-line summary (suitable for a list view)
                |2. A detailed log entry (3-5 sentences)
                |3. Safety assessment (one sentence)
                |
                |Format as:
                |SUMMARY: ...
                |LOG: ...
                |SAFETY: ...""".trimMargin().format(durationHours, session.zone.radiusMeters, maxDistance, avgDistance)

            val response = generativeModel.generateContent(content { text(prompt) })
            val text = response.text
            if (text != null) {
                Result.success(text)
            } else {
                Result.failure(Exception("Empty response from AI"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun buildContextPrompt(
        currentPosition: Position?,
        currentSession: AnchorSession?,
        trackPoints: List<TrackPoint>
    ): String {
        val parts = mutableListOf<String>()

        parts.add("Current context:")

        currentPosition?.let {
            parts.add("- Boat position: ${it.latitude}, ${it.longitude} (GPS accuracy: ${it.accuracy}m)")
        }

        currentSession?.let { session ->
            parts.add("- Anchor position: ${session.anchorPosition.latitude}, ${session.anchorPosition.longitude}")
            parts.add("- Safe zone radius: ${session.zone.radiusMeters}m")
            val durationMs = System.currentTimeMillis() - session.startTime
            val hours = durationMs / 3600000.0
            parts.add("- Anchored for: %.1f hours".format(hours))
            parts.add("- Alarms so far: ${session.alarmCount}")
        }

        if (trackPoints.isNotEmpty()) {
            val recentPoints = trackPoints.takeLast(10)
            val distances = recentPoints.map { it.distanceToAnchor }
            parts.add("- Recent distances from anchor (last ${recentPoints.size} readings): ${distances.joinToString(", ") { "%.0f m".format(it) }}")
        }

        // Try to add weather context
        currentPosition?.let { pos ->
            try {
                val weatherResult = weatherRepository.getMarineWeather(pos.latitude, pos.longitude)
                weatherResult.getOrNull()?.let { weather ->
                    val current = weather.current
                    if (current != null) {
                        current.waveHeight?.let { parts.add("- Current wave height: $it m") }
                        current.windWaveHeight?.let { parts.add("- Wind wave height: $it m from ${current.windWaveDirection ?: "?"}°") }
                        current.swellWaveHeight?.let { parts.add("- Swell: $it m from ${current.swellWaveDirection ?: "?"}°, period ${current.swellWavePeriod ?: "?"}s") }
                        current.oceanCurrentVelocity?.let { parts.add("- Ocean current: $it m/s from ${current.oceanCurrentDirection ?: "?"}°") }
                    }
                }
            } catch (_: Exception) { /* Weather data is optional context */ }
        }

        // Session history summary
        try {
            val totalSessions = sessionRepository.getCompletedSessionCount()
            val totalAlarms = sessionRepository.getTotalAlarmCount()
            if (totalSessions > 0) {
                parts.add("- Sailing history: $totalSessions completed anchoring sessions, $totalAlarms total alarms")
            }
        } catch (_: Exception) { /* History is optional context */ }

        return parts.joinToString("\n")
    }
}
