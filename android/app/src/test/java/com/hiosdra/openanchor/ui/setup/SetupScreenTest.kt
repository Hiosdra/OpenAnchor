package com.hiosdra.openanchor.ui.setup

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.domain.model.ZoneType
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class SetupScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private val viewModel = mockk<SetupViewModel>(relaxed = true)
    private val state = MutableStateFlow(SetupState())

    private var createdSessionId: Long? = null

    @Before
    fun setup() {
        every { viewModel.state } returns state
        createdSessionId = null
    }

    private fun setScreen() {
        composeRule.setContentWithTheme {
            SetupScreen(
                onSessionCreated = { createdSessionId = it },
                onBack = {},
                viewModel = viewModel
            )
        }
    }

    // ── Drop Point Step ──

    @Test
    fun `drop point step shows title`() {
        state.value = SetupState(currentStep = SetupStep.DROP_POINT, hasLocation = false)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.setup_drop_point)).assertIsDisplayed()
    }

    @Test
    fun `drop point step without location shows waiting for GPS`() {
        state.value = SetupState(currentStep = SetupStep.DROP_POINT, hasLocation = false)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.waiting_for_gps)).assertIsDisplayed()
    }

    @Test
    fun `drop point step shows next button`() {
        state.value = SetupState(currentStep = SetupStep.DROP_POINT, hasLocation = false)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.next)).assertIsDisplayed()
    }

    @Test
    fun `clicking next button calls viewModel nextStep`() {
        state.value = SetupState(currentStep = SetupStep.DROP_POINT, hasLocation = false)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.next)).performClick()
        composeRule.waitForIdle()
        verify { viewModel.nextStep() }
    }

    // ── Zone Type Step ──

    @Test
    fun `zone type step shows title`() {
        state.value = SetupState(currentStep = SetupStep.ZONE_TYPE)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.setup_zone_type)).assertIsDisplayed()
    }

    @Test
    fun `zone type step shows circle and sector options`() {
        state.value = SetupState(currentStep = SetupStep.ZONE_TYPE)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.simple_circle)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.circle_with_sector)).assertIsDisplayed()
    }

    @Test
    fun `zone type step shows descriptions`() {
        state.value = SetupState(currentStep = SetupStep.ZONE_TYPE)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.simple_circle_desc)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.circle_with_sector_desc)).assertIsDisplayed()
    }

    @Test
    fun `clicking sector card calls viewModel setZoneType`() {
        state.value = SetupState(currentStep = SetupStep.ZONE_TYPE)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.circle_with_sector)).performClick()
        composeRule.waitForIdle()
        verify { viewModel.setZoneType(ZoneType.SECTOR) }
    }

    @Test
    fun `clicking circle card calls viewModel setZoneType`() {
        state.value = SetupState(currentStep = SetupStep.ZONE_TYPE, zoneType = ZoneType.SECTOR)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.simple_circle)).performClick()
        composeRule.waitForIdle()
        verify { viewModel.setZoneType(ZoneType.CIRCLE) }
    }

    // ── Radius Step ──

    @Test
    fun `radius step shows title`() {
        state.value = SetupState(currentStep = SetupStep.RADIUS)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.setup_radius)).assertIsDisplayed()
    }

    @Test
    fun `radius step shows calculator toggle`() {
        state.value = SetupState(currentStep = SetupStep.RADIUS)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.use_calculator)).assertIsDisplayed()
    }

    @Test
    fun `radius step shows radius input`() {
        state.value = SetupState(currentStep = SetupStep.RADIUS)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.radius_label)).assertIsDisplayed()
    }

    @Test
    fun `radius step with calculator enabled shows depth field`() {
        state.value = SetupState(currentStep = SetupStep.RADIUS, useCalculator = true)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.depth_m)).assertIsDisplayed()
    }

    @Test
    fun `radius step with sector zone shows inner circle hint`() {
        state.value = SetupState(currentStep = SetupStep.RADIUS, zoneType = ZoneType.SECTOR)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.radius_inner_circle_hint)).assertIsDisplayed()
    }

    @Test
    fun `radius step shows buffer zone toggle`() {
        state.value = SetupState(currentStep = SetupStep.RADIUS)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.use_buffer_zone)).assertIsDisplayed()
    }

    @Test
    fun `radius step with buffer zone enabled shows buffer radius`() {
        state.value = SetupState(currentStep = SetupStep.RADIUS, useBufferZone = true)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.buffer_radius_label)).assertExists()
    }

    // ── Sector Config Step ──

    @Test
    fun `sector config step shows title`() {
        state.value = SetupState(currentStep = SetupStep.SECTOR_CONFIG)
        setScreen()
        // Both the TopAppBar and heading use "Sector Configuration"
        composeRule.onAllNodesWithText(composeRule.string(R.string.setup_sector))
            .assertCountEquals(2)
    }

    @Test
    fun `sector config step shows auto bearing toggle`() {
        state.value = SetupState(currentStep = SetupStep.SECTOR_CONFIG)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.auto_bearing)).assertExists()
    }

    @Test
    fun `sector config step shows sector radius and angle fields`() {
        state.value = SetupState(currentStep = SetupStep.SECTOR_CONFIG)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.sector_radius)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.sector_half_angle)).assertIsDisplayed()
    }

    // ── Confirm Step ──

    @Test
    fun `confirm step shows title`() {
        state.value = SetupState(currentStep = SetupStep.CONFIRM)
        setScreen()
        // Both TopAppBar and heading show "Confirm Setup"
        composeRule.onAllNodesWithText(composeRule.string(R.string.setup_confirm))
            .assertCountEquals(2)
    }

    @Test
    fun `confirm step shows start monitoring button`() {
        state.value = SetupState(currentStep = SetupStep.CONFIRM)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.start_monitoring)).assertIsDisplayed()
    }

    @Test
    fun `clicking start monitoring calls viewModel confirmAndCreateSession`() {
        state.value = SetupState(currentStep = SetupStep.CONFIRM)
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.start_monitoring)).performClick()
        composeRule.waitForIdle()
        verify { viewModel.confirmAndCreateSession() }
    }

    @Test
    fun `confirm step shows summary rows for circle zone`() {
        state.value = SetupState(
            currentStep = SetupStep.CONFIRM,
            anchorLat = 54.123456,
            anchorLng = 18.654321,
            zoneType = ZoneType.CIRCLE,
            radiusMeters = "35"
        )
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.anchor_position)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.zone_type_label)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.radius_label)).assertIsDisplayed()
        composeRule.onNodeWithText("35 m").assertIsDisplayed()
    }

    @Test
    fun `confirm step shows sector details when sector zone`() {
        state.value = SetupState(
            currentStep = SetupStep.CONFIRM,
            zoneType = ZoneType.SECTOR,
            sectorRadiusMeters = "40",
            sectorHalfAngleDeg = "60",
            sectorBearingDeg = "180"
        )
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.sector_radius)).assertIsDisplayed()
        composeRule.onNodeWithText("40 m").assertIsDisplayed()
    }

    @Test
    fun `confirm step shows buffer radius when enabled`() {
        state.value = SetupState(
            currentStep = SetupStep.CONFIRM,
            useBufferZone = true,
            bufferRadiusMeters = "60"
        )
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.buffer_radius_label)).assertIsDisplayed()
        composeRule.onNodeWithText("60 m").assertIsDisplayed()
    }

    @Test
    fun `confirm step shows error when present`() {
        state.value = SetupState(
            currentStep = SetupStep.CONFIRM,
            error = "Failed to create session"
        )
        setScreen()
        composeRule.onNodeWithText("Failed to create session").assertIsDisplayed()
    }

    @Test
    fun `confirm step shows chain length when filled`() {
        state.value = SetupState(
            currentStep = SetupStep.CONFIRM,
            chainLengthM = "42"
        )
        setScreen()
        composeRule.onNodeWithText("42 m").assertIsDisplayed()
    }

    @Test
    fun `confirm step shows depth when filled`() {
        state.value = SetupState(
            currentStep = SetupStep.CONFIRM,
            depthM = "7"
        )
        setScreen()
        composeRule.onNodeWithText("7 m").assertIsDisplayed()
    }

    // ── Navigation ──

    @Test
    fun `back button on non-first step calls viewModel previousStep`() {
        state.value = SetupState(currentStep = SetupStep.ZONE_TYPE)
        setScreen()
        composeRule.onNodeWithContentDescription("Back").performClick()
        composeRule.waitForIdle()
        verify { viewModel.previousStep() }
    }
}

private fun <A : ComponentActivity> AndroidComposeTestRule<*, A>.string(
    resId: Int,
    vararg formatArgs: Any
): String = activity.getString(resId, *formatArgs)

private fun AndroidComposeTestRule<*, ComponentActivity>.setContentWithTheme(
    content: @androidx.compose.runtime.Composable () -> Unit
) {
    setContent {
        OpenAnchorTheme {
            content()
        }
    }
}
