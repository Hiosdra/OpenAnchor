package com.hiosdra.openanchor.ui.theme

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class ThemeTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun `theme renders content without night filter`() {
        composeRule.setContent {
            OpenAnchorTheme(nightFilterEnabled = false) {
                Text("Hello")
            }
        }
        composeRule.onNodeWithText("Hello").assertIsDisplayed()
    }

    @Test
    fun `theme renders content with night filter enabled`() {
        composeRule.setContent {
            OpenAnchorTheme(nightFilterEnabled = true) {
                Text("Night mode")
            }
        }
        composeRule.onNodeWithText("Night mode").assertIsDisplayed()
    }

    @Test
    fun `theme applies dark color scheme`() {
        var primaryColor: androidx.compose.ui.graphics.Color? = null
        var backgroundColor: androidx.compose.ui.graphics.Color? = null
        var errorColor: androidx.compose.ui.graphics.Color? = null

        composeRule.setContent {
            OpenAnchorTheme {
                primaryColor = MaterialTheme.colorScheme.primary
                backgroundColor = MaterialTheme.colorScheme.background
                errorColor = MaterialTheme.colorScheme.error
                Text("Colors")
            }
        }
        composeRule.waitForIdle()

        assertEquals(OceanBlue, primaryColor)
        assertEquals(NavyDark, backgroundColor)
        assertEquals(AlarmRed, errorColor)
    }

    @Test
    fun `theme provides secondary as SafeGreen`() {
        var secondaryColor: androidx.compose.ui.graphics.Color? = null

        composeRule.setContent {
            OpenAnchorTheme {
                secondaryColor = MaterialTheme.colorScheme.secondary
                Text("Secondary")
            }
        }
        composeRule.waitForIdle()

        assertEquals(SafeGreen, secondaryColor)
    }

    @Test
    fun `LocalNightFilterEnabled is false by default`() {
        var nightFilter: Boolean? = null

        composeRule.setContent {
            OpenAnchorTheme(nightFilterEnabled = false) {
                nightFilter = LocalNightFilterEnabled.current
                Text("Default")
            }
        }
        composeRule.waitForIdle()

        assertFalse(nightFilter!!)
    }

    @Test
    fun `LocalNightFilterEnabled is true when night filter enabled`() {
        var nightFilter: Boolean? = null

        composeRule.setContent {
            OpenAnchorTheme(nightFilterEnabled = true) {
                nightFilter = LocalNightFilterEnabled.current
                Text("Night")
            }
        }
        composeRule.waitForIdle()

        assertTrue(nightFilter!!)
    }

    @Test
    fun `theme with night filter wraps content in Box with overlay`() {
        composeRule.setContent {
            OpenAnchorTheme(nightFilterEnabled = true) {
                Box(modifier = Modifier.fillMaxSize()) {
                    Text("Wrapped content")
                }
            }
        }
        composeRule.onNodeWithText("Wrapped content").assertIsDisplayed()
    }

    @Test
    fun `theme default parameter is no night filter`() {
        var nightFilter: Boolean? = null

        composeRule.setContent {
            OpenAnchorTheme {
                nightFilter = LocalNightFilterEnabled.current
                Text("Default param")
            }
        }
        composeRule.waitForIdle()

        assertFalse(nightFilter!!)
    }
}
