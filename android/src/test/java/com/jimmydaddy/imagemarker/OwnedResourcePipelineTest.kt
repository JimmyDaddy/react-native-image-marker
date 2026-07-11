package com.jimmydaddy.imagemarker

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class OwnedResourcePipelineTest {
  @Test
  fun releasesInputsAfterRenderAndBeforeEncode() = runBlocking {
    val events = mutableListOf<String>()

    val result = OwnedResourcePipeline.run(
      inputs = listOf("background", "watermark"),
      releaseInput = { events += "release $it" },
      render = {
        events += "render"
        "output"
      },
      encode = {
        events += "encode $it"
        "result"
      },
      releaseOutput = { events += "release $it" }
    )

    assertEquals("result", result)
    assertEquals(
      listOf(
        "render",
        "release background",
        "release watermark",
        "encode output",
        "release output"
      ),
      events
    )
  }

  @Test
  fun renderFailureStillReleasesAllInputs() {
    val released = mutableListOf<String>()

    assertThrows(IllegalStateException::class.java) {
      runBlocking {
        OwnedResourcePipeline.run<String, String, String>(
          inputs = listOf("background", "watermark"),
          releaseInput = { released += it },
          render = { throw IllegalStateException("render failed") },
          encode = { "unreachable" },
          releaseOutput = {}
        )
      }
    }

    assertEquals(listOf("background", "watermark"), released)
  }
}
