package com.jimmydaddy.imagemarker

import com.jimmydaddy.imagemarker.base.Utils
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

class RecipeConformanceTest {
  @Test
  fun core21FixtureKeepsAndroidTextSemantics() {
    val stream = checkNotNull(
      javaClass.classLoader?.getResourceAsStream("core-2.1-recipe.json")
    )
    val document = stream.bufferedReader().use { it.readText() }
    val root = JSONObject(document)
    val style = root
      .getJSONArray("layers")
      .getJSONObject(0)
      .getJSONObject("style")

    assertEquals(2, root.getInt("schemaVersion"))
    assertEquals(200f, Utils.parseSpreadValue(style.getString("maxWidth"), 320f))
    assertEquals(40.0, style.getDouble("lineHeight"), 0.0)
    assertEquals(1.0, style.getDouble("letterSpacing"), 0.0)
    assertEquals("auto", style.getString("direction"))
    assertEquals("character", style.getString("wrap"))
    assertEquals(2, style.getInt("maxLines"))
    assertEquals("ellipsis", style.getString("overflow"))
  }
}
