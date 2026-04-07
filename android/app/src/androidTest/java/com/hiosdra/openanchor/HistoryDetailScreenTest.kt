package com.hiosdra.openanchor

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.data.db.AnchorSessionDao
import com.hiosdra.openanchor.data.db.AnchorSessionEntity
import com.hiosdra.openanchor.helpers.*
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import androidx.test.rule.GrantPermissionRule
import javax.inject.Inject

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class HistoryDetailScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @get:Rule(order = 2)
    val grantPermissionRule: GrantPermissionRule = GrantPermissionRule.grant(
        android.Manifest.permission.ACCESS_FINE_LOCATION,
        android.Manifest.permission.ACCESS_COARSE_LOCATION,
        android.Manifest.permission.ACCESS_BACKGROUND_LOCATION,
        android.Manifest.permission.CAMERA
    )

    @Inject
    lateinit var sessionDao: AnchorSessionDao

    @Before
    fun setUp() {
        hiltRule.inject()
        runBlocking {
            sessionDao.insert(
                AnchorSessionEntity(
                    anchorLat = 54.3520,
                    anchorLng = 18.6466,
                    startTime = 1705312800000, // 2024-01-15T12:00:00Z
                    endTime = 1705320000000,   // 2024-01-15T14:00:00Z (2h session)
                    zoneType = "CIRCLE",
                    radiusMeters = 30.0,
                    alarmTriggered = true,
                    alarmCount = 2,
                    maxDistanceMeters = 25.5,
                    maxSog = 1.2
                )
            )
        }
        composeTestRule.skipOnboardingIfPresent()
    }

    private fun navigateToHistory() {
        composeTestRule.navigateFromHome("History")
        composeTestRule.waitForText("History", timeoutMs = 10_000)
    }

    private fun navigateToDetail() {
        navigateToHistory()
        // Click on the seeded session entry (should show date/time)
        composeTestRule.waitForText("Jan", timeoutMs = 5_000).performClick()
        composeTestRule.waitForText("Session Details", timeoutMs = 5_000)
    }

    // --- 1. History Screen Shows Seeded Data ---

    @Test
    fun historyScreen_showsSessionEntry() {
        navigateToHistory()
        composeTestRule.onNodeWithText("No anchoring history yet").assertDoesNotExist()
    }

    @Test
    fun historyScreen_sessionIsClickable() {
        navigateToHistory()
        composeTestRule.waitForText("Jan", timeoutMs = 5_000).assertIsDisplayed()
    }

    // --- 2. Detail Screen Navigation ---

    @Test
    fun historyDetail_isReachable() {
        navigateToDetail()
        composeTestRule.assertTextDisplayed("Session Details")
    }

    @Test
    fun historyDetail_hasBackButton() {
        navigateToDetail()
        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun historyDetail_backNavigation_returnsToHistory() {
        navigateToDetail()
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("History", timeoutMs = 5_000)
    }

    // --- 3. Detail Screen Content ---

    @Test
    fun historyDetail_showsStartTime() {
        navigateToDetail()
        composeTestRule.assertTextDisplayed("Start time")
    }

    @Test
    fun historyDetail_showsAlarmInfo() {
        navigateToDetail()
        composeTestRule.assertTextDisplayed("Alarms triggered")
    }

    @Test
    fun historyDetail_showsExportButton() {
        navigateToDetail()
        composeTestRule.onNodeWithContentDescription("Export GPX").assertIsDisplayed()
    }
}
