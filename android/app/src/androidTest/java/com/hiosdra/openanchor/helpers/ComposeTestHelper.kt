package com.hiosdra.openanchor.helpers

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.ext.junit.rules.ActivityScenarioRule

fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.assertTextDisplayed(text: String) {
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
 * Polls a condition with Thread.sleep instead of relying on Compose idle state.
 * The onboarding screen with permission checks and DataStore loading can keep
 * Compose busy, causing waitUntil to never evaluate the condition.
 */
private fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.waitForCondition(
    timeoutMs: Long,
    condition: () -> Boolean
) {
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

/**
 * If the permission onboarding screen is visible, dismiss it by clicking "Skip for now".
 * Call this after activity launch and before any test assertions on Home screen content.
 */
fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.skipOnboardingIfPresent() {
    try {
        waitForCondition(15_000) {
            onAllNodesWithText("Skip for now", substring = true, ignoreCase = true)
                .fetchSemanticsNodes()
                .isNotEmpty() ||
            onAllNodesWithText("Drop Anchor", substring = true, ignoreCase = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }
        val skipNodes = onAllNodesWithText("Skip for now", substring = true, ignoreCase = true)
            .fetchSemanticsNodes()
        if (skipNodes.isNotEmpty()) {
            onNodeWithText("Skip for now", substring = true, ignoreCase = true).performClick()
            waitForCondition(10_000) {
                onAllNodesWithText("Drop Anchor", substring = true, ignoreCase = true)
                    .fetchSemanticsNodes()
                    .isNotEmpty()
            }
        }
    } catch (_: ComposeTimeoutException) {
        // Neither onboarding nor home appeared — proceed anyway
    }
}
