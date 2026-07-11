package com.jimmydaddy.imagemarker

import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit

/** Bounds decode/render/encode pipelines so several large requests cannot exhaust the heap. */
internal class MarkerJobLimiter(parallelism: Int = 1) {
  private val semaphore: Semaphore

  init {
    require(parallelism > 0) { "parallelism must be greater than zero" }
    semaphore = Semaphore(parallelism)
  }

  suspend fun <T> run(block: suspend () -> T): T {
    return semaphore.withPermit { block() }
  }
}
