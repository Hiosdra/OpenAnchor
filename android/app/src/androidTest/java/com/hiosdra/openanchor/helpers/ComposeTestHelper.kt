package com.hiosdra.openanchor.helpers

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.espresso.IdlingRegistry
import androidx.test.ext.junit.rules.ActivityScenarioRule

/**
 * Unregisters Compose IdlingResources from Espresso and waits a short time.
 * Replaces composeTestRule.waitForIdle() which blocks forever when infinite
 * animations are present (OceanBackground, rememberPulsingAlpha).
 */
fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.safeWaitForIdle(
    delayMs: Long = 500
) {
    unregisterComposeIdling()
    Thread.sleep(delayMs)
}

fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.assertTextDisplayed(text: String) {
    unregisterComposeIdling()
    val nodes = onAllNodesWithText(text, substring = true, ignoreCase = true)
    val count = nodes.fetchSemanticsNodes().size
    if (count == 0) throw AssertionError("No nodes found with text containing '$text'")
    for (i in 0 until count) {
        try {
            nodes[i].assertIsDisplayed()
            return  // At least one is displayed, success
        } catch (_: AssertionError) {
            continue
        }
    }
    throw AssertionError("Found $count nodes with text '$text' but none are displayed")
}

fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.waitForText(
    text: String,
    timeoutMs: Long = 15_000
): SemanticsNodeInteraction {
    waitForCondition(timeoutMs) {
        onAllNodesWithText(text, substring = true, ignoreCase = true)
            .fetchSemanticsNodes()
            .isNotEmpty()
    }
    return onAllNodesWithText(text, substring = true, ignoreCase = true).onFirst()
}

fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.waitForTag(
    tag: String,
    timeoutMs: Long = 15_000
): SemanticsNodeInteraction {
    waitForCondition(timeoutMs) {
        onAllNodesWithTag(tag)
            .fetchSemanticsNodes()
            .isNotEmpty()
    }
    return onNodeWithTag(tag)
}

fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.assertTagDisplayed(tag: String) {
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
 * Permanently unregisters Compose IdlingResources from Espresso.
 * Safe to call multiple times (no-op if already unregistered).
 */
private fun unregisterComposeIdling() {
    val registry = IdlingRegistry.getInstance()
    registry.resources
        .filter { it.name.contains("Compose", ignoreCase = true) }
        .forEach { registry.unregister(it) }
}

/**
 * Polls a condition with Thread.sleep, permanently unregistering the Compose
 * IdlingResource from Espresso so that ALL Compose test operations (including
 * fetchSemanticsNodes, performClick, performScrollTo, assertIsDisplayed) bypass
 * the idle check that blocks on infinite animations (OceanBackground).
 */
private fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.waitForCondition(
    timeoutMs: Long,
    condition: () -> Boolean
) {
    unregisterComposeIdling()

    val startNanos = System.nanoTime()
    val timeoutNanos = timeoutMs * 1_000_000L
    while (true) {
        if (condition()) return
        if (System.nanoTime() - startNanos > timeoutNanos) {
            throw ComposeTimeoutException(
                "Condition still not satisfied after $timeoutMs ms"
            )
        }
        Thread.sleep(100)
    }
}
