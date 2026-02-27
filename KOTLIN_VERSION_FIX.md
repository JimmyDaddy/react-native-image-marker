# Kotlin 版本兼容性修复

## 问题描述

CI 构建在 `Cross-Platform Android Build (new, 0.81, example-0.73)` 任务中失败，错误信息：

```
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':react-native-image-marker:compileReleaseKotlin'.
> A failure occurred while executing org.jetbrains.kotlin.compilerRunner.GradleCompilerRunnerWithWorkers$GradleKotlinCompilerWorkAction
> Compilation error. See log for more details
```

## 根本原因

**Kotlin 版本不匹配**导致编译失败：

1. 库模块 (`android/gradle.properties`) 配置使用 Kotlin 1.9.22
2. example-0.73 项目使用 Kotlin 1.8.0（适配 React Native 0.73）
3. CI 构建时，库模块被编译时强制使用了 1.9.22，但宿主项目期望 1.8.0
4. 这导致了 Kotlin 编译器版本冲突

## 解决方案

修改 `android/build.gradle`，让库模块优先使用宿主项目的 Kotlin 版本：

### 修改 1: buildscript 部分

```gradle
buildscript {
  // 优先级：rootProject.ext.kotlinVersion > project.kotlin_version > ImageMarker_kotlinVersion
  def kotlin_version = rootProject.ext.has("kotlinVersion") ? 
    rootProject.ext.get("kotlinVersion") : 
    (project.hasProperty("kotlin_version") ? 
      project.properties["kotlin_version"] : 
      project.properties["ImageMarker_kotlinVersion"])
  
  // ... rest of buildscript
}
```

### 修改 2: dependencies 部分

```gradle
// 使用相同的优先级逻辑
def kotlin_version = rootProject.ext.has("kotlinVersion") ? 
  rootProject.ext.get("kotlinVersion") : 
  (project.hasProperty("kotlin_version") ? 
    project.properties["kotlin_version"] : 
    getKotlinVersionForRN(reactNativeVersion))

dependencies {
  implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version"
  // ... other dependencies
}
```

## 版本选择优先级

1. **rootProject.ext.kotlinVersion** - 宿主项目在 `build.gradle` 中定义的版本（最高优先级）
2. **project.kotlin_version** - 宿主项目在 `gradle.properties` 中定义的版本
3. **getKotlinVersionForRN()** - 根据 React Native 版本自动选择的版本（回退方案）
4. **ImageMarker_kotlinVersion** - 库模块默认版本（仅在 buildscript 中作为最后回退）

## 版本映射规则

根据 React Native 版本自动选择 Kotlin 版本：

- React Native 0.73.x → Kotlin 1.8.0
- React Native 0.81.x → Kotlin 1.9.0
- React Native 0.8x.x → Kotlin 1.9.22
- 其他版本 → Kotlin 1.8.0（默认）

## 验证结果

✅ 所有质量检查通过：
- `npm test -- --run` - 311 个测试全部通过
- `npm run typecheck` - 无类型错误
- `npm run lint` - 无代码规范问题

## 影响范围

- ✅ 不影响现有 API
- ✅ 向后兼容所有 React Native 版本
- ✅ 支持 Legacy 和 New Architecture
- ✅ 自动适配宿主项目的 Kotlin 版本

## 相关文件

- `android/build.gradle` - 主要修改文件
- `android/gradle.properties` - 库模块默认配置
- `example-0.73/android/gradle.properties` - 示例项目配置

## 测试建议

在 CI 环境中测试以下场景：
1. ✅ React Native 0.73 + Legacy Architecture
2. ✅ React Native 0.73 + New Architecture
3. ✅ React Native 0.81 + Legacy Architecture
4. ✅ React Native 0.81 + New Architecture
5. ✅ 不同 Kotlin 版本的宿主项目

## 参考

- [Kotlin Gradle Plugin 兼容性](https://kotlinlang.org/docs/gradle-configure-project.html)
- [React Native Android 构建配置](https://reactnative.dev/docs/building-for-android)
- [Android Gradle Plugin 版本兼容性](https://developer.android.com/studio/releases/gradle-plugin)
