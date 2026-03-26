package com.hiosdra.openanchor.helpers

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.espresso.IdlingRegistry
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
 * Polls a condition with Thread.sleep, temporarily unregistering the Compose
 * IdlingResource from Espresso so that fetchSemanticsNodes() → getRoots() →
 * waitForIdle() → Espresso.onIdle() returns immediately instead of blocking
 * on infinite animations (e.g. OceanBackground's rememberInfiniteTransition).
 */
private fun <A : ComponentActivity> AndroidComposeTestRule<ActivityScenarioRule<A>, A>.waitForCondition(
    timeoutMs: Long,
    condition: () -> Boolean
) {
    val registry = IdlingRegistry.getInstance()
    val composeIdling = registry.resources.filter {
        it.name.contains("Compose", ignoreCase = true)
    }
    composeIdling.forEach { registry.unregister(it) }

    try {
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
    } finally {
        composeIdling.forEach { registry.register(it) }
    }
}
