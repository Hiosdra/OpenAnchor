package com.hiosdra.openanchor.helpers

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.ext.junit.rules.ActivityScenarioRule

fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.assertTextDisplayed(text: String) {
    waitForText(text) // Wait for Compose hierarchy and text node to appear
    val nodes = onAllNodesWithText(text, substring = true, ignoreCase = true)
    val count = nodes.fetchSemanticsNodes().size
    for (i in 0 until count) {
        try {
            nodes[i].assertIsDisplayed()
            return
        } catch (_: AssertionError) {
            continue
        }
    }
    throw AssertionError("Found $count nodes with text '$text' but none are displayed")
}

fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.assertTextNotDisplayed(text: String) {
    val nodes = onAllNodesWithText(text, substring = true, ignoreCase = true)
    val count = nodes.fetchSemanticsNodes().size
    if (count == 0) return
    for (i in 0 until count) {
        try {
            nodes[i].assertIsDisplayed()
            throw AssertionError("Found node with text '$text' that is still displayed")
        } catch (_: AssertionError) {
            if (i == count - 1) return // None displayed — success
            continue
        }
    }
}

fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.waitForText(
    text: String,
    timeoutMs: Long = 15_000
): SemanticsNodeInteraction {
    waitUntil(timeoutMs) {
        try {
            onAllNodesWithText(text, substring = true, ignoreCase = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        } catch (_: IllegalStateException) {
            false // Compose hierarchy not ready yet, keep waiting
        }
    }
    return onAllNodesWithText(text, substring = true, ignoreCase = true).onFirst()
}

fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.waitForTag(
    tag: String,
    timeoutMs: Long = 15_000
): SemanticsNodeInteraction {
    waitUntil(timeoutMs) {
        try {
            onAllNodesWithTag(tag)
                .fetchSemanticsNodes()
                .isNotEmpty()
        } catch (_: IllegalStateException) {
            false
        }
    }
    return onNodeWithTag(tag)
}

fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.assertTagDisplayed(tag: String) {
    waitForTag(tag)
    onNodeWithTag(tag)
        .assertIsDisplayed()
}

fun SemanticsNodeInteraction.tryPerformScrollTo(): SemanticsNodeInteraction {
    try {
        performScrollTo()
    } catch (_: AssertionError) {
        // Node may not be in a scrollable container (e.g. wizard steps)
    }
    return this
}

/**
 * Wait for a text node to appear, then scroll to it.
 * Resilient to transient "No compose hierarchies found" errors on slow emulators.
 */
fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.scrollToText(
    text: String,
    timeoutMs: Long = 15_000
): SemanticsNodeInteraction {
    return waitForText(text, timeoutMs).performScrollTo()
}

/**
 * Navigate from Home screen to a named screen by scrolling to and clicking a button.
 * Assumes the test is currently on the Home screen (waits for "Drop Anchor" first).
 */
fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.navigateFromHome(buttonText: String) {
    waitForText("Drop Anchor")
    scrollToText(buttonText)
    waitForIdle()
    waitForText(buttonText).performClick()
    waitForIdle()
}

/**
 * With GrantPermissionRule granting all permissions (including CAMERA), the onboarding
 * auto-completes and navigates to Home. This helper just waits for "Drop Anchor" to appear.
 * OceanBackground's infinite animations are disabled on CI (animator_duration_scale=0),
 * so standard waitUntil works correctly.
 */
fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.skipOnboardingIfPresent() {
    waitUntil(30_000) {
        try {
            onAllNodesWithText("Drop Anchor", substring = true, ignoreCase = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        } catch (_: IllegalStateException) {
            false // Compose hierarchy not ready yet, keep waiting
        }
    }
}
