package com.hiosdra.openanchor.data.ai

import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.Content
import com.google.ai.client.generativeai.type.GenerateContentResponse
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.data.weather.CurrentWeather
import com.hiosdra.openanchor.data.weather.MarineWeatherResponse
import com.hiosdra.openanchor.data.weather.WeatherRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class GeminiServiceTest {

    private lateinit var sessionRepository: AnchorSessionRepository
    private lateinit var weatherRepository: WeatherRepository
    private lateinit var service: GeminiService

    @Before
    fun setUp() {
        sessionRepository = mockk(relaxed = true)
        weatherRepository = mockk(relaxed = true)
        service = GeminiService(sessionRepository, weatherRepository)
    }

    // ========== isConfigured / configure ==========

    @Test
    fun `isConfigured returns false before configure is called`() {
        assertFalse(service.isConfigured)
    }

    @Test
    fun `isConfigured returns true after configure is called`() {
        service.configure("test-api-key")
        assertTrue(service.isConfigured)
    }

    // ========== askAdvisor - not configured ==========

    @Test
    fun `askAdvisor returns failure when not configured`() = runTest {
        val result = service.askAdvisor("How is the weather?", null, null)
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()!!.message!!.contains("not configured"))
    }

    // ========== askAdvisor - configured with mocked model ==========

    @Test
    fun `askAdvisor returns success with response text`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "Stay safe, sailor!"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse
        coEvery { sessionRepository.getCompletedSessionCount() } returns 5
        coEvery { sessionRepository.getTotalAlarmCount() } returns 2

        injectModel(service, mockModel)

        val result = service.askAdvisor("Is it safe?", null, null)
        assertTrue(result.isSuccess)
        assertEquals("Stay safe, sailor!", result.getOrNull())
    }

    @Test
    fun `askAdvisor returns failure when response text is null`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns null
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse
        coEvery { sessionRepository.getCompletedSessionCount() } returns 0
        coEvery { sessionRepository.getTotalAlarmCount() } returns 0

        injectModel(service, mockModel)

        val result = service.askAdvisor("Is it safe?", null, null)
        assertTrue(result.isFailure)
        assertEquals("Empty response from AI", result.exceptionOrNull()!!.message)
    }

    @Test
    fun `askAdvisor returns failure when model throws exception`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        coEvery { mockModel.generateContent(any<Content>()) } throws RuntimeException("API error")
        coEvery { sessionRepository.getCompletedSessionCount() } returns 0
        coEvery { sessionRepository.getTotalAlarmCount() } returns 0

        injectModel(service, mockModel)

        val result = service.askAdvisor("Is it safe?", null, null)
        assertTrue(result.isFailure)
        assertEquals("API error", result.exceptionOrNull()!!.message)
    }

    @Test
    fun `askAdvisor includes position context when provided`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "Advice"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse
        coEvery { sessionRepository.getCompletedSessionCount() } returns 0
        coEvery { sessionRepository.getTotalAlarmCount() } returns 0

        injectModel(service, mockModel)

        val position = Position(latitude = 43.695, longitude = 7.265, accuracy = 5f, timestamp = 1000L)
        val result = service.askAdvisor("Question?", position, null)
        assertTrue(result.isSuccess)

        coVerify { mockModel.generateContent(any<Content>()) }
    }

    @Test
    fun `askAdvisor includes session context when provided`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "Advice"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse
        coEvery { sessionRepository.getCompletedSessionCount() } returns 3
        coEvery { sessionRepository.getTotalAlarmCount() } returns 1

        injectModel(service, mockModel)

        val anchor = Position(latitude = 43.695, longitude = 7.265, timestamp = 0L)
        val session = AnchorSession(
            id = 1,
            anchorPosition = anchor,
            zone = AnchorZone.Circle(anchor, 50.0),
            startTime = System.currentTimeMillis() - 3600000,
            alarmCount = 2
        )
        val result = service.askAdvisor("Question?", anchor, session)
        assertTrue(result.isSuccess)
        coVerify { mockModel.generateContent(any<Content>()) }
    }

    @Test
    fun `askAdvisor includes track points context`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "Advice"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse
        coEvery { sessionRepository.getCompletedSessionCount() } returns 0
        coEvery { sessionRepository.getTotalAlarmCount() } returns 0

        injectModel(service, mockModel)

        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val trackPoints = (1..5).map { i ->
            TrackPoint(sessionId = 1, position = pos, distanceToAnchor = i * 10f)
        }
        val result = service.askAdvisor("Question?", pos, null, trackPoints)
        assertTrue(result.isSuccess)
    }

    @Test
    fun `askAdvisor includes weather context when available`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "Weather advice"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse
        coEvery { sessionRepository.getCompletedSessionCount() } returns 0
        coEvery { sessionRepository.getTotalAlarmCount() } returns 0

        val weather = MarineWeatherResponse(
            latitude = 43.695, longitude = 7.265,
            generationTimeMs = 1.0, utcOffsetSeconds = 0,
            current = CurrentWeather(
                time = "2024-01-01T00:00",
                waveHeight = 1.5, waveDirection = 180.0, wavePeriod = 8.0,
                windWaveHeight = 0.8, windWaveDirection = 190.0, windWavePeriod = null,
                swellWaveHeight = 1.2, swellWaveDirection = 200.0, swellWavePeriod = 10.0,
                oceanCurrentVelocity = 0.3, oceanCurrentDirection = 270.0
            ),
            currentUnits = null, hourly = null, hourlyUnits = null
        )
        coEvery { weatherRepository.getMarineWeather(any(), any()) } returns Result.success(weather)

        injectModel(service, mockModel)

        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val result = service.askAdvisor("Question?", pos, null)
        assertTrue(result.isSuccess)
    }

    @Test
    fun `askAdvisor handles weather repository failure gracefully`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "Advice without weather"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse
        coEvery { sessionRepository.getCompletedSessionCount() } returns 0
        coEvery { sessionRepository.getTotalAlarmCount() } returns 0
        coEvery { weatherRepository.getMarineWeather(any(), any()) } throws RuntimeException("Network error")

        injectModel(service, mockModel)

        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val result = service.askAdvisor("Question?", pos, null)
        assertTrue(result.isSuccess)
        assertEquals("Advice without weather", result.getOrNull())
    }

    @Test
    fun `askAdvisor handles session history failure gracefully`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "Advice"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse
        coEvery { sessionRepository.getCompletedSessionCount() } throws RuntimeException("DB error")

        injectModel(service, mockModel)

        val result = service.askAdvisor("Question?", null, null)
        assertTrue(result.isSuccess)
    }

    // ========== generateLogbookSummary ==========

    @Test
    fun `generateLogbookSummary returns failure when not configured`() = runTest {
        val anchor = Position(latitude = 43.695, longitude = 7.265, timestamp = 0L)
        val session = AnchorSession(
            anchorPosition = anchor,
            zone = AnchorZone.Circle(anchor, 50.0),
            startTime = 0L,
            endTime = 3600000L
        )
        val result = service.generateLogbookSummary(session, emptyList())
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()!!.message!!.contains("not configured"))
    }

    @Test
    fun `generateLogbookSummary returns success with response text`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "SUMMARY: Calm night\nLOG: Details...\nSAFETY: All good"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse

        injectModel(service, mockModel)

        val anchor = Position(latitude = 43.695, longitude = 7.265, timestamp = 0L)
        val session = AnchorSession(
            anchorPosition = anchor,
            zone = AnchorZone.Circle(anchor, 50.0),
            startTime = 0L,
            endTime = 3600000L
        )
        val result = service.generateLogbookSummary(session, emptyList())
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.contains("SUMMARY"))
    }

    @Test
    fun `generateLogbookSummary returns failure on null response`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns null
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse

        injectModel(service, mockModel)

        val anchor = Position(latitude = 43.695, longitude = 7.265, timestamp = 0L)
        val session = AnchorSession(
            anchorPosition = anchor,
            zone = AnchorZone.Circle(anchor, 50.0),
            startTime = 0L,
            endTime = 3600000L
        )
        val result = service.generateLogbookSummary(session, emptyList())
        assertTrue(result.isFailure)
        assertEquals("Empty response from AI", result.exceptionOrNull()!!.message)
    }

    @Test
    fun `generateLogbookSummary computes metrics from track points`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "Summary"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse

        injectModel(service, mockModel)

        val anchor = Position(latitude = 43.695, longitude = 7.265, timestamp = 0L)
        val session = AnchorSession(
            anchorPosition = anchor,
            zone = AnchorZone.Circle(anchor, 50.0),
            startTime = 0L,
            endTime = 7200000L,
            alarmCount = 3
        )
        val trackPoints = listOf(
            TrackPoint(sessionId = 1, position = anchor, distanceToAnchor = 10f, isAlarm = false),
            TrackPoint(sessionId = 1, position = anchor, distanceToAnchor = 30f, isAlarm = true),
            TrackPoint(sessionId = 1, position = anchor, distanceToAnchor = 20f, isAlarm = false)
        )

        val result = service.generateLogbookSummary(session, trackPoints)
        assertTrue(result.isSuccess)
        coVerify { mockModel.generateContent(any<Content>()) }
    }

    @Test
    fun `generateLogbookSummary includes weather summary when provided`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "Summary with weather"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse

        injectModel(service, mockModel)

        val anchor = Position(latitude = 43.695, longitude = 7.265, timestamp = 0L)
        val session = AnchorSession(
            anchorPosition = anchor,
            zone = AnchorZone.Circle(anchor, 50.0),
            startTime = 0L,
            endTime = 3600000L
        )
        val result = service.generateLogbookSummary(session, emptyList(), "Wind NW 15kn, seas 1.5m")
        assertTrue(result.isSuccess)
    }

    @Test
    fun `generateLogbookSummary handles exception from model`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        coEvery { mockModel.generateContent(any<Content>()) } throws RuntimeException("API quota exceeded")

        injectModel(service, mockModel)

        val anchor = Position(latitude = 43.695, longitude = 7.265, timestamp = 0L)
        val session = AnchorSession(
            anchorPosition = anchor,
            zone = AnchorZone.Circle(anchor, 50.0),
            startTime = 0L,
            endTime = 3600000L
        )
        val result = service.generateLogbookSummary(session, emptyList())
        assertTrue(result.isFailure)
        assertEquals("API quota exceeded", result.exceptionOrNull()!!.message)
    }

    @Test
    fun `generateLogbookSummary uses current time when endTime is null`() = runTest {
        val mockModel = mockk<GenerativeModel>()
        val mockResponse = mockk<GenerateContentResponse>()
        every { mockResponse.text } returns "Summary"
        coEvery { mockModel.generateContent(any<Content>()) } returns mockResponse

        injectModel(service, mockModel)

        val anchor = Position(latitude = 43.695, longitude = 7.265, timestamp = 0L)
        val session = AnchorSession(
            anchorPosition = anchor,
            zone = AnchorZone.Circle(anchor, 50.0),
            startTime = System.currentTimeMillis() - 3600000L,
            endTime = null
        )
        val result = service.generateLogbookSummary(session, emptyList())
        assertTrue(result.isSuccess)
    }

    // ========== Helper to inject mocked model via reflection ==========

    private fun injectModel(service: GeminiService, model: GenerativeModel) {
        val apiKeyField = GeminiService::class.java.getDeclaredField("apiKey")
        apiKeyField.isAccessible = true
        apiKeyField.set(service, "test-key")

        val modelField = GeminiService::class.java.getDeclaredField("model")
        modelField.isAccessible = true
        modelField.set(service, model)
    }
}
