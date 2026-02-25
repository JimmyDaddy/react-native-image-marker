# Android CI 构建日志增强实现总结 (v2)

## 问题分析

### 原始问题
在 GitHub Actions CI 中,Android 构建失败时只显示简短的错误信息:
```
❌ Build failed with exit code: 1
🔍 Analyzing build failure (exit code: 1)
Error Type: gradle_build_failure
Message: Execution failed for task ':app:configureCMakeRelWithDebInfo[arm64-v8a]'.
```

但没有显示详细的 CMake 配置错误,导致无法定位具体问题。

### 根本原因
1. **日志输出被 ci-error-handler.js 包装器截断**：使用 `stdio: ['inherit', 'pipe', 'pipe']` 时,stdout 和 stderr 被捕获但没有实时输出
2. **CMake 错误信息丢失**：真正的错误是 CMake 配置失败,不是 Kotlin 编译错误
3. **`--build-cache` 参数**：可能导致缓存的构建状态与实际代码不一致

## 实施的修复 (v2 - 简化方案)

### 1. 移除 ci-error-handler.js 包装器

**问题**：`ci-error-handler.js` 的 stdio 配置导致输出被截断或延迟显示

**解决方案**：直接运行 Gradle 命令,使用 `tee` 保存日志的同时实时输出到控制台

#### 修改前:
```yaml
node ../../scripts/ci-error-handler.js monitor "./gradlew assembleRelease --stacktrace --build-cache"
```

#### 修改后:
```yaml
# Run Gradle directly with tee to capture log while showing output
./gradlew assembleRelease --stacktrace --no-build-cache --info 2>&1 | tee build.log

# Check exit code
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "❌ Build failed!"
  echo "📄 Showing last 200 lines of build log:"
  tail -200 build.log
  exit 1
fi
```

### 2. 使用 tee 命令同时输出和保存日志

**优势**:
- ✅ 实时显示完整的构建输出到控制台
- ✅ 同时保存完整日志到 `build.log` 文件
- ✅ 使用 `${PIPESTATUS[0]}` 正确捕获 Gradle 的退出码
- ✅ 失败时显示最后 200 行日志,便于快速定位问题

### 3. 移除 `--build-cache` 参数

所有 Gradle 命令改用 `--no-build-cache`:

**依赖安装**:
```bash
./gradlew clean --stacktrace --no-build-cache
./gradlew dependencies --stacktrace --no-build-cache
```

**单元测试**:
```bash
./gradlew test --stacktrace --no-build-cache --info
```

**APK 构建**:
```bash
./gradlew assembleRelease --stacktrace --no-build-cache --info 2>&1 | tee build.log
```

**集成测试**:
```bash
./gradlew connectedCheck --stacktrace --no-build-cache --info
```

### 4. 添加 `--info` 标志

在关键构建步骤中添加 `--info` 标志,提供详细的 Gradle 输出:
- 显示任务执行详情
- 显示依赖解析过程
- 显示 CMake 配置详细信息
- 显示 Kotlin 编译详细信息
- 显示插件应用过程

## 预期效果

### 1. 完整的实时日志输出
- ✅ 在 CI 控制台中实时显示完整的构建输出
- ✅ 保存完整日志到 `build.log` 文件
- ✅ 失败时自动显示最后 200 行日志

### 2. 详细的 CMake 错误信息
使用 `--info` 标志后,CMake 配置错误将显示:
```
> Task :app:configureCMakeRelWithDebInfo[arm64-v8a]
CMake configuration started
CMake Error at CMakeLists.txt:123 (find_package):
  Could not find a package configuration file provided by "SomePackage"
  
Call Stack (most recent call first):
  CMakeLists.txt:456 (include)

-- Configuring incomplete, errors occurred!
```

### 3. 避免缓存问题
- ✅ 使用 `--no-build-cache` 确保每次构建都是干净的
- ✅ 避免缓存的构建状态导致的误导性错误
- ✅ 更容易重现和调试构建问题

### 4. 简化的错误处理
不再需要复杂的 JavaScript 包装器:
```bash
# 简单直接的错误处理
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "❌ Build failed!"
  tail -200 build.log
  exit 1
fi
```

## 技术细节

### tee 命令说明
```bash
./gradlew assembleRelease --stacktrace --no-build-cache --info 2>&1 | tee build.log
```
- `2>&1` - 将 stderr 重定向到 stdout
- `| tee build.log` - 同时输出到控制台和文件
- `${PIPESTATUS[0]}` - 获取管道中第一个命令(gradlew)的退出码

### Gradle 参数说明
- `--no-build-cache`: 禁用构建缓存,确保干净构建
- `--info`: 显示详细的构建信息
- `--stacktrace`: 显示完整的异常堆栈跟踪

## 与 v1 方案的对比

| 特性 | v1 (ci-error-handler.js) | v2 (直接 Gradle + tee) |
|------|-------------------------|----------------------|
| 实时输出 | ❌ 延迟或截断 | ✅ 完全实时 |
| 日志完整性 | ⚠️ 可能截断 | ✅ 100% 完整 |
| 复杂度 | ⚠️ 需要 Node.js 包装器 | ✅ 简单的 shell 命令 |
| 错误诊断 | ⚠️ 需要解析日志 | ✅ 直接显示 |
| 维护成本 | ⚠️ 需要维护 JS 代码 | ✅ 标准 shell 命令 |

## 保留 ci-error-handler.js 的用途

虽然我们移除了 `monitor` 命令的使用,但 `ci-error-handler.js` 仍然保留用于:
- `health-check`: 运行 CI 健康检查
- `diagnose`: 诊断现有构建日志
- `report`: 生成 CI 报告
- `retry`: 自动重试失败的构建

## 下一步

1. **提交更改**:
   ```bash
   git add .github/workflows/ci.yml .kiro/specs/android-ci-build-fix/
   git commit -m "fix(ci): use direct Gradle execution with tee for complete logs

   - Remove ci-error-handler.js wrapper for build commands
   - Use tee to capture logs while showing real-time output
   - Add --info flag for detailed CMake and Kotlin logs
   - Remove --build-cache to avoid cache-related issues
   - Show last 200 lines on failure for quick diagnosis
   
   This ensures complete CMake configuration errors are visible
   Fixes: Android CI build failures with insufficient error details"
   ```

2. **推送并观察 CI**:
   ```bash
   git push origin <branch-name>
   ```

3. **验证改进**:
   - 检查 CI 日志是否显示完整的 CMake 配置错误
   - 验证 `build.log` 文件是否包含完整输出
   - 确认失败时显示的最后 200 行是否足够诊断问题

## 参考资料

- [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [Gradle Logging](https://docs.gradle.org/current/userguide/logging.html)
- [Bash tee Command](https://man7.org/linux/man-pages/man1/tee.1.html)
- [Bash PIPESTATUS](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)
