package com.jimmydaddy.imagemarker

import android.system.Os
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

/** Writes beside the destination and exposes the new file only after encoding succeeds. */
internal object AtomicFileWriter {
  internal fun write(
    destination: File,
    rename: (File, File) -> Unit = ::atomicRename,
    encode: (OutputStream) -> Unit
  ) {
    val parent = destination.parentFile
      ?: throw IllegalArgumentException("Output file must have a parent directory")
    val temporary = File.createTempFile(".${destination.name}.", ".tmp", parent)
    try {
      FileOutputStream(temporary).use { fileStream ->
        val buffered = BufferedOutputStream(fileStream)
        encode(buffered)
        buffered.flush()
        fileStream.fd.sync()
      }
      rename(temporary, destination)
    } finally {
      // rename(2) removes the source path. On every failure path this removes the partial file.
      temporary.delete()
    }
  }

  private fun atomicRename(source: File, destination: File) {
    Os.rename(source.absolutePath, destination.absolutePath)
  }
}
