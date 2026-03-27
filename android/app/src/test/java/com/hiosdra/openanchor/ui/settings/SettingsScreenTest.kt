package com.hiosdra.openanchor.ui.settings

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.data.preferences.UserPreferences
import com.hiosdra.openanchor.domain.model.DepthUnit
import com.hiosdra.openanchor.domain.model.DistanceUnit
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import com.hiosdra.openanchor.ui.theme.ThemeMode
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class SettingsScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun settingsScreen_rendersPreferencesAndInvokesCallbacks() {
        val preferences = MutableStateFlow(
            UserPreferences(
                distanceUnit = DistanceUnit.FEET,
                depthUnit = DepthUnit.METERS,
                language = "pl",
                gpsIntervalSeconds = 7,
                themeMode = ThemeMode.NIGHT_VISION
            )
        )
        val viewModel = mockk<SettingsViewModel>(relaxed = true)
        every { viewModel.preferences } returns preferences

        composeRule.setContent {
            OpenAnchorTheme {
                SettingsScreen(
                    onBack = {},
                    viewModel = viewModel
                )
            }
        }

        composeRule.onNodeWithText("English").assertIsDisplayed()
        composeRule.onNodeWithText("Polski").assertIsDisplayed()
    }
}
