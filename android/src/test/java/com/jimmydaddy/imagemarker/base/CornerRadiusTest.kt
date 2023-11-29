package com.jimmydaddy.imagemarker.base

import android.graphics.RectF
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableMapKeySetIterator
import org.junit.Assert
import org.junit.Test
import org.mockito.Mockito

class CornerRadiusTest {

  @Test
  fun testRadii() {
    // 创建一个 mock 的 ReadableMap
    val mockMap = Mockito.mock(ReadableMap::class.java)
    val mockMapTopLeft = Mockito.mock(ReadableMap::class.java)

    val mockIterator = Mockito.mock(ReadableMapKeySetIterator::class.java)

    // 设置 mock 对象的行为
    Mockito.`when`(mockMap.keySetIterator()).thenReturn(mockIterator)
    Mockito.`when`(mockIterator.hasNextKey()).thenReturn(true, false)
    Mockito.`when`(mockIterator.nextKey()).thenReturn("topLeft")
    Mockito.`when`(mockMap.getMap("topLeft")).thenReturn(mockMapTopLeft)

    // 创建一个 CornerRadius 对象
    val cornerRadius = CornerRadius(mockMap)

    // 测试 radii 方法
    val rect = RectF(0f, 0f, 100f, 100f)
    val radii = cornerRadius.radii(rect)

    // 验证结果
    Assert.assertEquals(8, radii.size)
  }
}

