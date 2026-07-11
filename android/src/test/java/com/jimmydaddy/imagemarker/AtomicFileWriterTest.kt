package com.jimmydaddy.imagemarker

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Test
import java.io.File
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.StandardCopyOption

class AtomicFileWriterTest {
  @Test
  fun successfulWriteAtomicallyReplacesExistingDestination() {
    val directory = Files.createTempDirectory("atomic-image-writer").toFile()
    val destination = File(directory, "same-name.png").apply { writeText("old") }

    AtomicFileWriter.write(destination, ::replace) { stream ->
      stream.write("new".toByteArray(StandardCharsets.UTF_8))
    }

    assertEquals("new", destination.readText())
    assertFalse(directory.listFiles().orEmpty().any { it.extension == "tmp" })
    directory.deleteRecursively()
  }

  @Test
  fun failedEncodeKeepsOldDestinationAndCleansTemporaryFile() {
    val directory = Files.createTempDirectory("atomic-image-writer").toFile()
    val destination = File(directory, "result.png").apply { writeText("old") }

    assertThrows(IllegalStateException::class.java) {
      AtomicFileWriter.write(destination, ::replace) { stream ->
        stream.write("partial".toByteArray(StandardCharsets.UTF_8))
        throw IllegalStateException("encoder failed")
      }
    }

    assertEquals("old", destination.readText())
    assertFalse(directory.listFiles().orEmpty().any { it.extension == "tmp" })
    directory.deleteRecursively()
  }

  @Test
  fun failedRenameKeepsOldDestinationAndCleansTemporaryFile() {
    val directory = Files.createTempDirectory("atomic-image-writer").toFile()
    val destination = File(directory, "result.png").apply { writeText("old") }

    assertThrows(IllegalStateException::class.java) {
      AtomicFileWriter.write(destination, { _, _ -> throw IllegalStateException("rename failed") }) {
        it.write("new".toByteArray(StandardCharsets.UTF_8))
      }
    }

    assertEquals("old", destination.readText())
    assertFalse(directory.listFiles().orEmpty().any { it.extension == "tmp" })
    directory.deleteRecursively()
  }

  private fun replace(source: File, destination: File) {
    Files.move(
      source.toPath(),
      destination.toPath(),
      StandardCopyOption.ATOMIC_MOVE,
      StandardCopyOption.REPLACE_EXISTING
    )
  }
}
