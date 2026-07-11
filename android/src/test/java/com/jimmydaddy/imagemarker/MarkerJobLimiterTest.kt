package com.jimmydaddy.imagemarker

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.concurrent.atomic.AtomicInteger

class MarkerJobLimiterTest {
  @Test
  fun permitsOnlyOneHeavyPipelineAtATime() = runBlocking {
    val limiter = MarkerJobLimiter(parallelism = 1)
    val active = AtomicInteger(0)
    val maximumActive = AtomicInteger(0)
    val releaseFirst = CompletableDeferred<Unit>()

    val jobs = List(3) { index ->
      async {
        limiter.run {
          val nowActive = active.incrementAndGet()
          maximumActive.updateAndGet { current -> maxOf(current, nowActive) }
          if (index == 0) releaseFirst.await() else delay(5)
          active.decrementAndGet()
        }
      }
    }
    while (active.get() == 0) delay(1)
    releaseFirst.complete(Unit)
    jobs.awaitAll()

    assertEquals(1, maximumActive.get())
  }

  @Test
  fun cancellingAQueuedPipelineDoesNotConsumeThePermit() = runBlocking {
    val limiter = MarkerJobLimiter(parallelism = 1)
    val releaseFirst = CompletableDeferred<Unit>()
    val firstEntered = CompletableDeferred<Unit>()
    val first = async {
      limiter.run {
        firstEntered.complete(Unit)
        releaseFirst.await()
      }
    }
    firstEntered.await()
    val cancelled = async { limiter.run { "should not run" } }
    cancelled.cancelAndJoin()
    releaseFirst.complete(Unit)
    first.await()

    val result = withTimeout(1_000) { limiter.run { "permit released" } }

    assertEquals("permit released", result)
  }
}
