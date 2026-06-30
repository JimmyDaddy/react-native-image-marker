package com.jimmydaddy.imagemarker.base

import org.junit.Assert
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
}
