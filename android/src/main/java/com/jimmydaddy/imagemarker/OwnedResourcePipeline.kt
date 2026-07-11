package com.jimmydaddy.imagemarker

/** Makes input/output ownership explicit across render and encode cancellation points. */
internal object OwnedResourcePipeline {
  suspend fun <Input, Output : Any, Result> run(
    inputs: List<Input>,
    releaseInput: (Input) -> Unit,
    render: suspend () -> Output,
    encode: suspend (Output) -> Result,
    releaseOutput: (Output) -> Unit
  ): Result {
    var output: Output? = null
    var inputsReleased = false
    try {
      output = render()
      inputs.forEach(releaseInput)
      inputsReleased = true
      return encode(checkNotNull(output))
    } finally {
      output?.let(releaseOutput)
      if (!inputsReleased) {
        inputs.forEach(releaseInput)
      }
    }
  }
}
