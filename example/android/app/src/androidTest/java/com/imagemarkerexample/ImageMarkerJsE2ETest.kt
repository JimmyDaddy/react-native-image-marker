package com.imagemarkerexample

import android.view.View
import android.widget.ScrollView
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.NoMatchingViewException
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom
import androidx.test.espresso.matcher.ViewMatchers.isDisplayingAtLeast
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.Matchers.allOf
import org.hamcrest.Matchers.anything
import org.hamcrest.Matchers.startsWith
import org.hamcrest.TypeSafeMatcher
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Exercises the public JS API through the real React Native screen and native renderer. */
@RunWith(AndroidJUnit4::class)
class ImageMarkerJsE2ETest {
  @get:Rule
  val activityRule = ActivityScenarioRule(MainActivity::class.java)

  @Test
  fun rotationOutputPolicyRunsThroughJsNativeAndPreview() {
    val feature = allOf(
      withReactTestId("feature-rotation-output-policy"),
      withContentDescription("Rotation output policy")
    )
    val visibleFeature = allOf(feature, isDisplayingAtLeast(90))
    waitForView(withText("Image Marker Lab"), 90_000)
    onView(isAssignableFrom(ScrollView::class.java)).perform(fullScroll(View.FOCUS_DOWN))
    waitForView(visibleFeature, 5_000)
    onView(visibleFeature).perform(click())

    // The feature clears the previous preview before invoking Marker.markImage. Reaching this
    // state therefore proves the Promise resolved and the generated file reached the JS preview.
    onView(isAssignableFrom(ScrollView::class.java)).perform(fullScroll(View.FOCUS_UP))
    waitForView(withReactTestId("result-preview-ready"), 60_000)
    waitForView(withReactTestId("rotation-output-validated"), 5_000)
  }

  @Test
  fun watermarkOrientationMatchesUprightPixelReference() {
    val feature = allOf(
      withReactTestId("feature-watermark-orientation"),
      withContentDescription("Watermark orientation")
    )
    val visibleFeature = allOf(feature, isDisplayingAtLeast(90))
    waitForView(withText("Image Marker Lab"), 90_000)
    onView(isAssignableFrom(ScrollView::class.java)).perform(fullScroll(View.FOCUS_DOWN))
    waitForView(visibleFeature, 5_000)
    onView(visibleFeature).perform(click())

    // JS reads both native PNG files and exposes this contract only when their raster payloads
    // match, so the check fails if the watermark path mirrors the asymmetric pixel probe.
    onView(isAssignableFrom(ScrollView::class.java)).perform(fullScroll(View.FOCUS_UP))
    waitForView(withReactTestId("result-preview-ready"), 60_000)
    waitForView(withReactTestId("watermark-orientation-validated"), 5_000)
  }

  @Test
  fun editorUndoAndPreviewRunThroughCore() {
    waitForView(withText("Image Marker Lab"), 90_000)
    waitForView(withReactTestId("surface-editor"), 5_000)
    onView(withReactTestId("surface-editor")).perform(click())

    waitForView(withReactTestId("editor-canvas"), 5_000)
    waitForView(withReactTestId("editor-layer-editor-title"), 5_000)
    waitForView(withReactTestId("editor-layer-editor-logo"), 5_000)

    onView(withReactTestId("editor-add-text")).perform(click())
    waitForView(withReactTestId("editor-layer-layer-editor-3"), 5_000)
    onView(withReactTestId("editor-toolbar-undo")).perform(click())

    onView(withReactTestId("editor-preview")).perform(click())
    waitForView(withReactTestId("editor-result-image"), 60_000)
    waitForView(withText(startsWith("Preview ready")), 5_000)
  }

  @Test
  fun editorOriginalExportRunsThroughCore() {
    waitForView(withText("Image Marker Lab"), 90_000)
    waitForView(withReactTestId("surface-editor"), 5_000)
    onView(withReactTestId("surface-editor")).perform(click())

    waitForView(withReactTestId("editor-canvas"), 5_000)
    onView(withReactTestId("editor-export")).perform(click())
    waitForView(withReactTestId("editor-result-image"), 60_000)
    waitForView(withText(startsWith("Export ready")), 60_000)
  }

  private fun fullScroll(direction: Int): ViewAction {
    return object : ViewAction {
      override fun getConstraints(): Matcher<View> = isAssignableFrom(ScrollView::class.java)

      override fun getDescription(): String = "fully scroll React Native content"

      override fun perform(uiController: UiController, view: View) {
        (view as ScrollView).fullScroll(direction)
        uiController.loopMainThreadUntilIdle()
      }
    }
  }

  private fun waitForView(matcher: Matcher<View>, timeoutMs: Long) {
    val deadline = System.currentTimeMillis() + timeoutMs
    var lastFailure: Throwable? = null
    while (System.currentTimeMillis() < deadline) {
      try {
        onView(matcher).check(matches(anything()))
        return
      } catch (error: NoMatchingViewException) {
        lastFailure = error
      } catch (error: AssertionError) {
        lastFailure = error
      }
      Thread.sleep(250)
    }
    throw AssertionError("Timed out waiting for view $matcher", lastFailure)
  }

  private fun withReactTestId(testId: String): Matcher<View> {
    return object : TypeSafeMatcher<View>() {
      override fun describeTo(description: Description) {
        description.appendText("with React Native testID $testId")
      }

      override fun matchesSafely(view: View): Boolean {
        return view.getTag(com.facebook.react.R.id.react_test_id) == testId
      }
    }
  }
}
