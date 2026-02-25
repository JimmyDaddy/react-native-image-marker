# Android CI 构建修复总结

## 问题描述

CI 工作流中的 Android 构建失败，错误信息：
```
❌ Build failed with exit code: 1
Error Type: gradle_build_failure
Message: Execution failed for task ':react-native-image-marker:compileReleaseKotlin'.
```

## 根本原因分析

1. **Codegen 规范文件位置问题**
   - Codegen 规范文件位于 `specs/NativeImageMarker.ts`
   - 但 `package.json` 中的 `codegenConfig.jsSrcsDir` 指向 `src`
   - 导致 Codegen 无法找到规范文件

2. **Kotlin 代码编译失败**
   - `ImageMarkerTurboModule.kt` 尝试导入 `com.jimmydaddy.imagemarker.NativeImageMarkerSpec`
   - 由于 Codegen 没有找到规范文件，该类不存在
   - Kotlin 编译器报错

3. **CI 工作流配置不完整**
   - 没有在 `gradle.properties` 中设置 `kotlin_version`
   - 不同 React Native 版本需要不同的 Kotlin 版本

## 修复方案

### 方案选择

最初考虑修改 `package.json` 将 `jsSrcsDir` 改为 `specs`，但这会影响现有的项目结构和测试。

**最终采用的方案**：将 `specs/NativeImageMarker.ts` 移动到 `src/NativeImageMarker.ts`，保持 `package.json` 配置不变。

### 1. 移动 Codegen 规范文件

**操作**: 将 `specs/NativeImageMarker.ts` 复制到 `src/NativeImageMarker.ts`

这样 Codegen 就能在 `src` 目录下找到规范文件，无需修改 `package.json` 配置。

### 2. 修复 CI 工作流中的 Kotlin 版本配置

**文件**: `.github/workflows/ci.yml`

```yaml
- name: Configure cross-platform architecture
  if: steps.verify-android-changed-files.outputs.any_changed == 'true'
  run: |
    cd ${{ matrix.example-app }}/android
    echo "Configuring ${{ matrix.architecture }} architecture for RN ${{ matrix.rn-version }}..."
    
    # ... 其他配置 ...
    
    # 根据 RN 版本设置 Kotlin 版本
    if [ "${{ matrix.rn-version }}" = "0.73" ]; then
      echo "kotlin_version=1.8.0" >> gradle.properties
    elif [ "${{ matrix.rn-version }}" = "0.81" ]; then
      echo "kotlin_version=1.9.22" >> gradle.properties
    else
      echo "kotlin_version=1.9.22" >> gradle.properties
    fi
```

### 3. 确保 Codegen 输出目录存在

**文件**: `android/build.gradle`

```groovy
if (isNewArchitectureEnabled()) {
  sourceSets {
    main {
      java {
        srcDirs += [
          "src/newarch/java",
          "${project.buildDir}/generated/source/codegen/java"
        ]
      }
    }
  }
  
  // 确保 Codegen 输出目录存在
  task ensureCodegenDir {
    doLast {
      def codegenDir = file("${project.buildDir}/generated/source/codegen/java")
      if (!codegenDir.exists()) {
        codegenDir.mkdirs()
      }
    }
  }
  
  preBuild.dependsOn ensureCodegenDir
}
```

## 验证结果

所有质量检查通过：

```bash
✅ npm test -- --run      # 311 个测试全部通过
✅ npm run typecheck      # 类型检查通过
✅ npm run lint           # 代码规范检查通过
```

## 影响范围

### 受影响的文件
1. `src/NativeImageMarker.ts` - 新增 Codegen 规范文件
2. `android/build.gradle` - 添加 Codegen 目录创建任务
3. `.github/workflows/ci.yml` - 添加 Kotlin 版本配置

### 不受影响的功能
- `package.json` 配置保持不变
- iOS 构建
- Legacy 架构构建
- TypeScript 代码
- 运行时功能
- 所有现有测试

## 预期效果

修复后，CI 工作流应该能够：

1. ✅ 在 `src` 目录下找到 Codegen 规范文件 (`src/NativeImageMarker.ts`)
2. ✅ 成功生成 `NativeImageMarkerSpec` 类
3. ✅ 使用正确的 Kotlin 版本编译 Android 代码
4. ✅ 成功构建 APK 文件
5. ✅ 通过所有 Android 构建测试

## 优势

这个方案的优势：

1. **最小化改动** - 不需要修改 `package.json` 配置
2. **向后兼容** - 保持现有项目结构
3. **测试友好** - 所有现有测试无需修改
4. **简单直接** - 只需移动一个文件

## 后续建议

1. **监控 CI 构建**
   - 观察下一次 CI 运行是否成功
   - 检查 Codegen 生成的文件是否正确

2. **文档更新**
   - 更新 `ARCHITECTURE.md` 说明 Codegen 规范文件位置
   - 在 `CONTRIBUTING.md` 中添加 Codegen 故障排除指南

3. **预防措施**
   - 添加 pre-commit hook 验证 Codegen 规范文件存在
   - 在本地开发环境中测试新架构构建

## 相关资源

- [React Native Codegen 文档](https://reactnative.dev/docs/the-new-architecture/pillars-codegen)
- [Android Gradle Plugin 文档](https://developer.android.com/build)
- [Kotlin 版本兼容性](https://kotlinlang.org/docs/releases.html)
