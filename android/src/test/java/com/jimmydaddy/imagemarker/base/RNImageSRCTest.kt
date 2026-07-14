package com.jimmydaddy.imagemarker.base

import com.facebook.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.Mockito

class RNImageSRCTest {
  @Test
  fun nullableUriDoesNotBecomeLiteralNull() {
    val source = Mockito.mock(ReadableMap::class.java)
    Mockito.`when`(source.hasKey("uri")).thenReturn(true)
    Mockito.`when`(source.getString("uri")).thenReturn(null)

    assertEquals("", RNImageSRC(source).uri)
  }
}
