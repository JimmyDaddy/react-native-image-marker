# Android CI 构建日志问题 - 最终解决方案

## 问题描述

CI 构建失败时只显示:
```
Error Type: gradle_build_failure
Message: Execution failed for task ':app:configureCMakeRelWithDebInfo[arm64-v8a]'.
```

但没有显示详细的 CMake 配置错误信息。

## 根本原因

这是一个 **CMake 配置错误**,不是 Kotlin 编译错误。问题在于:
1. `ci-error-handler.js` 的 stdio 配置导致输出被截断
2. 日志没有实时输出到控制台
3. CMake 的详细错误信息丢失

## 最终解决方案

### 核心改进：直接运行 Gradle + tee 命令

移除 `ci-error-handler.js` 包装器,直接运行 Gradle 并使用 `tee` 保存日志:

```yaml
# 之前 (有问题)
node ../../scripts/ci-error-handler.js monitor "./gradlew assembleRelease --stacktrace --build-cache"

# 之后 (正确)
./gradlew assembleRelease --stacktrace --no-build-cache --info 2>&1 | tee build.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "❌ Build failed!"
  echo "📄 Showing last 200 lines of build log:"
  tail -200 build.log
  exit 1
fi
```

### 关键改进点

1. **实时输出**: 使用 `tee` 同时输出到控制台和文件
2. **完整日志**: 不再有任何截断或缓冲问题
3. **正确的退出码**: 使用 `${PIPESTATUS[0]}` 捕获 Gradle 的退出码
4. **失败时显示**: 自动显示最后 200 行日志便于诊断
5. **移除缓存**: 使用 `--no-build-cache` 避免缓存问题
6. **详细信息**: 添加 `--info` 标志显示 CMake 配置详情

## 修改的文件

### `.github/workflows/ci.yml`

修改了以下步骤:
1. `Install Gradle dependencies` - 移除 ci-error-handler.js 包装
2. `Run cross-platform unit tests` - 移除 ci-error-handler.js 包装
3. `Build cross-platform APK` - 使用 tee 命令并添加错误处理
4. `Cross-platform instrumentation tests` - 添加 --no-build-cache 和 --info

## 预期效果

下次 CI 运行时,你将看到:

### 成功构建
```
> Task :app:configureCMakeRelWithDebInfo[arm64-v8a]
-- The C compiler identification is AppleClang 15.0.0.15000100
-- The CXX compiler identification is AppleClang 15.0.0.15000100
-- Configuring done
-- Generating done
-- Build files have been written to: ...
✅ Build completed successfully
```

### 失败构建
```
> Task :app:configureCMakeRelWithDebInfo[arm64-v8a] FAILED
CMake Error at CMakeLists.txt:123 (find_package):
  Could not find a package configuration file provided by "ReactAndroid"
  with any of the following names:
    ReactAndroidConfig.cmake
    reactandroid-config.cmake
  
  Add the installation prefix of "ReactAndroid" to CMAKE_PREFIX_PATH or set
  "ReactAndroid_DIR" to a directory containing one of the above files.

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':app:configureCMakeRelWithDebInfo[arm64-v8a]'.
> com.android.ide.common.process.ProcessException: ninja: Entering directory `/path/to/build'
  ninja: error: loading 'build.ninja': No such file or directory

❌ Build failed!
📄 Showing last 200 lines of build log:
[完整的错误上下文...]
```

## 优势对比

| 特性 | 之前 (ci-error-handler.js) | 现在 (直接 Gradle + tee) |
|------|---------------------------|------------------------|
| 实时输出 | ❌ 延迟/截断 | ✅ 完全实时 |
| 日志完整性 | ⚠️ 可能截断 | ✅ 100% 完整 |
| CMake 错误 | ❌ 丢失 | ✅ 完整显示 |
| 复杂度 | ⚠️ 需要 Node.js | ✅ 标准 shell |
| 维护成本 | ⚠️ 需要维护 JS | ✅ 无需维护 |
| 错误诊断 | ⚠️ 需要解析 | ✅ 直接可见 |

## 验证步骤

1. 提交并推送更改
2. 观察 CI 运行
3. 检查是否显示完整的 CMake 错误信息
4. 验证 `build.log` 文件是否包含完整输出

## 总结

通过移除复杂的 JavaScript 包装器,直接使用标准的 shell 命令和 `tee`,我们实现了:
- ✅ 完整的实时日志输出
- ✅ 详细的 CMake 配置错误信息
- ✅ 简化的错误处理逻辑
- ✅ 更好的可维护性

这是一个更简单、更可靠的解决方案。
