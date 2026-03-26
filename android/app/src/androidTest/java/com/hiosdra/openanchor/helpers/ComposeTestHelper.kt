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
    timeoutMs: Long = 5000
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
    timeoutMs: Long = 5000
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
 * Polls a condition with manual clock advancement.
 * Unlike [waitUntil], this does not call waitForIdle() with auto-advance,
 * which would block indefinitely when infinite animations (e.g. OceanBackground) are present.
 */
private fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.waitForCondition(
    timeoutMs: Long,
    condition: () -> Boolean
) {
    val startNanos = System.nanoTime()
    val timeoutNanos = timeoutMs * 1_000_000L
    val savedAutoAdvance = mainClock.autoAdvance
    mainClock.autoAdvance = false
    try {
        while (true) {
            mainClock.advanceTimeBy(32)
            waitForIdle()
            if (condition()) return
            if (System.nanoTime() - startNanos > timeoutNanos) {
                throw ComposeTimeoutException(
                    "Condition still not satisfied after $timeoutMs ms"
                )
            }
        }
    } finally {
        mainClock.autoAdvance = savedAutoAdvance
    }
}
