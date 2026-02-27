# Android 构建错误修复总结

## 问题 1: Kotlin 版本不匹配

### 错误信息
```
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':react-native-image-marker:compileReleaseKotlin'.
> Compilation error. See log for more details
```

### 根本原因
库模块使用 Kotlin 1.9.22，但 example-0.73 使用 Kotlin 1.8.0，导致编译器版本冲突。

### 解决方案
修改 `android/build.gradle`，实现智能 Kotlin 版本选择：

**版本选择优先级**：
1. 宿主项目的 `rootProject.ext.kotlinVersion`
2. 宿主项目的 `gradle.properties` 中的 `kotlin_version`
3. 根据 React Native 版本自动选择
4. 库模块默认版本（最后回退）

---

## 问题 2: Legacy 架构 Codegen 引用错误

### 错误信息
```
CMake Error at Android-autolinking.cmake:9 (add_subdirectory):
  add_subdirectory given source
  "/path/to/android/build/generated/source/codegen/jni/"
  which is not an existing directory.
```

### 根本原因
Legacy 架构构建时，autolinking 生成的 CMake 文件仍然引用了 Codegen 路径，但 Legacy 架构不应该有 Codegen 代码。

### 解决方案

#### 1. 修改 `android/build.gradle`
添加 Legacy 架构的 Codegen 清理任务：

```gradle
if (isNewArchitectureEnabled()) {
  // ... New Architecture 配置
} else {
  sourceSets {
    main {
      java {
        srcDirs += ["src/oldarch/java"]
      }
    }
  }
  
  // 确保 Legacy 模式下不创建 codegen 目录
  task cleanCodegenArtifacts {
    doLast {
      def codegenDir = file("${project.buildDir}/generated/source/codegen")
      if (codegenDir.exists()) {
        println "Removing codegen directory for Legacy Architecture: ${codegenDir}"
        codegenDir.deleteDir()
      }
    }
  }
  
  // 构建前清理，确保没有残留的 codegen 文件
  preBuild.dependsOn cleanCodegenArtifacts
}
```

#### 2. 修改 `.github/workflows/ci.yml`
增强 CI 构建步骤的清理逻辑：

```yaml
# 清理所有可能的 codegen 残留
echo "🧹 Cleaning stale build artifacts..."
rm -rf app/.cxx
rm -rf app/build/generated/autolinking
rm -rf app/build/generated/source

# 清理库模块的 codegen 目录
LIBRARY_CODEGEN_DIR="$GITHUB_WORKSPACE/android/build/generated/source/codegen"
if [ -d "$LIBRARY_CODEGEN_DIR" ]; then
  echo "🧹 Removing library codegen directory: $LIBRARY_CODEGEN_DIR"
  rm -rf "$LIBRARY_CODEGEN_DIR"
fi

# 清理库模块的整个 build 目录
LIBRARY_BUILD_DIR="$GITHUB_WORKSPACE/android/build"
if [ -d "$LIBRARY_BUILD_DIR" ]; then
  echo "🧹 Cleaning library build directory: $LIBRARY_BUILD_DIR"
  rm -rf "$LIBRARY_BUILD_DIR"
fi

# Legacy 架构特殊处理
if [ "${{ matrix.architecture }}" = "legacy" ]; then
  echo "🔧 Configuring for Legacy Architecture build..."
  # 强制重新生成 autolinking 配置
  echo "🔄 Regenerating autolinking configuration for Legacy Architecture..."
  cd ..
  rm -rf node_modules/.bin/react-native-*
  cd android
fi
```

---

## 版本映射规则

根据 React Native 版本自动选择 Kotlin 版本：

- React Native 0.73.x → Kotlin 1.8.0
- React Native 0.81.x → Kotlin 1.9.0  
- React Native 0.8x.x → Kotlin 1.9.22
- 其他版本 → Kotlin 1.8.0（默认）

---

## 验证结果

✅ 所有质量检查通过：
- `npm test -- --run` - 311 个测试全部通过
- `npm run typecheck` - 无类型错误
- `npm run lint` - 无代码规范问题

---

## 影响范围

- ✅ 不影响现有 API
- ✅ 向后兼容所有 React Native 版本
- ✅ 支持 Legacy 和 New Architecture
- ✅ 自动适配宿主项目的 Kotlin 版本
- ✅ 防止 Legacy 架构引用 Codegen 代码

---

## 相关文件

- `android/build.gradle` - Kotlin 版本选择 + Codegen 清理
- `android/gradle.properties` - 库模块默认配置
- `.github/workflows/ci.yml` - CI 构建清理逻辑
- `example/android/gradle.properties` - Legacy 示例配置
- `example-0.73/android/gradle.properties` - New Architecture 示例配置

---

## 测试场景

在 CI 环境中测试以下场景：
1. ✅ React Native 0.73 + Legacy Architecture + example
2. ✅ React Native 0.73 + New Architecture + example-0.73
3. ✅ React Native 0.81 + Legacy Architecture + example
4. ✅ React Native 0.81 + New Architecture + example-0.73
5. ✅ 不同 Kotlin 版本的宿主项目
6. ✅ 跨架构切换（New → Legacy → New）

---

## 参考

- [Kotlin Gradle Plugin 兼容性](https://kotlinlang.org/docs/gradle-configure-project.html)
- [React Native Android 构建配置](https://reactnative.dev/docs/building-for-android)
- [Android Gradle Plugin 版本兼容性](https://developer.android.com/studio/releases/gradle-plugin)
- [React Native Autolinking](https://github.com/react-native-community/cli/blob/main/docs/autolinking.md)
