package com.jimmydaddy.imagemarker.base

import org.junit.Assert
import org.junit.Assert.assertThrows
import org.junit.Test

class UtilsTest {

  @Test
  fun transRGBColorReturnsNamedColorsUnchanged() {
    Assert.assertEquals("white", Utils.transRGBColor("white"))
    Assert.assertEquals("transparent", Utils.transRGBColor("transparent"))
  }

  @Test
  fun transRGBColorExpandsShortHexColors() {
    Assert.assertEquals("#ffffff", Utils.transRGBColor("#fff"))
    Assert.assertEquals("#ffffffff", Utils.transRGBColor("#ffff"))
  }

  @Test
  fun transRGBColorConvertsTrailingAlphaToAndroidAlpha() {
    Assert.assertEquals("#44112233", Utils.transRGBColor("#11223344"))
  }

  @Test
  fun allocationFailureBecomesARecoverableMarkerError() {
    val error = assertThrows(MarkerError::class.java) {
      Utils.allocateOrThrow<Unit>("test bitmap") {
        throw OutOfMemoryError("simulated")
      }
    }

    Assert.assertEquals(ErrorCode.RENDER_FAILED.value, error.getErrorCode())
    Assert.assertEquals("Unable to allocate test bitmap", error.message)
  }
}
