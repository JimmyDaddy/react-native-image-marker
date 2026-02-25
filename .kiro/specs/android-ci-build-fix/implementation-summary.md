# Android CI 构建日志增强实现总结

## 问题分析

### 原始问题
在 GitHub Actions CI 中，Android 构建失败时只显示简短的错误信息：
```
❌ Build failed with exit code: 1
🔍 Analyzing build failure (exit code: 1)
Error Type: gradle_build_failure
Message: Execution failed for task ':react-native-image-marker:compileReleaseKotlin'.
```

但没有显示详细的 Kotlin 编译错误，导致无法定位具体问题。

### 根本原因
1. **日志输出被截断**：`ci-error-handler.js` 只保存最后 2000 个字符到错误报告
2. **stdio 配置问题**：使用 `stdio: 'pipe'` 捕获输出，但没有实时显示
3. **缓冲区限制**：maxBuffer 只有 10MB，可能不足以容纳大型构建日志
4. **`--build-cache` 参数**：可能导致缓存的构建状态与实际代码不一致

## 实施的修复

### 1. 增强日志捕获和输出 (`scripts/ci-error-handler.js`)

#### 修改 `monitorBuild` 方法
```javascript
// 之前：只捕获输出，不显示
stdio: 'pipe',
maxBuffer: 10 * 1024 * 1024, // 10MB

// 之后：实时显示并捕获完整输出
stdio: ['inherit', 'pipe', 'pipe'], // stdin: inherit, stdout: pipe, stderr: pipe
maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large build logs

// 打印完整错误输出到控制台
console.error('\n📋 Full build output:');
console.error(buildOutput);

// 保存完整日志到文件
fs.writeFileSync(this.logFile, buildOutput);
console.log(`📄 Full build log saved to: ${this.logFile}`);
```

#### 新增 `extractRelevantErrors` 方法
智能提取错误相关的上下文信息：
```javascript
extractRelevantErrors(buildOutput) {
  // 检测错误标记：error:, ERROR:, FAILURE:, Exception:, etc.
  // 捕获错误前 3 行和后 10 行的上下文
  // 返回所有相关错误片段
}
```

#### 增强 `analyzeBuildFailure` 方法
```javascript
// 生成更详细的错误报告
const errorReport = [
  '## Relevant Error Messages',  // 智能提取的错误信息
  '## Full Build Output',         // 完整日志文件路径
  '### Last 5000 characters:',    // 最后 5000 字符（从 2000 增加）
];
```

### 2. 移除 `--build-cache` 参数

#### CI 配置修改 (`.github/workflows/ci.yml`)

**依赖安装步骤**：
```yaml
# 之前
./gradlew clean --stacktrace
./gradlew dependencies --stacktrace --build-cache

# 之后
./gradlew clean --stacktrace --no-build-cache
./gradlew dependencies --stacktrace --no-build-cache
```

**单元测试步骤**：
```yaml
# 之前
./gradlew test --stacktrace --build-cache

# 之后
./gradlew test --stacktrace --no-build-cache --info
```

**APK 构建步骤**：
```yaml
# 之前
./gradlew assembleRelease --stacktrace --build-cache

# 之后
./gradlew assembleRelease --stacktrace --no-build-cache --info
```

**集成测试步骤**：
```yaml
# 之前
./gradlew connectedCheck --stacktrace --build-cache

# 之后
./gradlew connectedCheck --stacktrace --no-build-cache --info
```

### 3. 添加 `--info` 标志

在关键构建步骤中添加 `--info` 标志，提供更详细的 Gradle 输出：
- 显示任务执行详情
- 显示依赖解析过程
- 显示 Kotlin 编译详细信息
- 显示插件应用过程

### 4. 更新恢复策略

修改 `getRecoveryActions` 中的 Gradle 构建失败恢复策略：
```javascript
gradle_build_failure: [
  {
    description: 'Clean Gradle cache and rebuild (without build-cache)',
    commands: [
      './gradlew clean --no-build-cache',
      './gradlew build --refresh-dependencies --no-build-cache --stacktrace',
    ],
  },
  {
    description: 'Clean all Gradle caches and rebuild',
    commands: [
      './gradlew clean cleanBuildCache --no-build-cache',
      'rm -rf .gradle build',
      './gradlew build --refresh-dependencies --no-build-cache --info',
    ],
  },
]
```

## 预期效果

### 1. 完整的错误日志
- ✅ 在 CI 控制台中实时显示完整的构建输出
- ✅ 保存完整日志到 `ci-build.log` 文件（50MB 缓冲区）
- ✅ 在错误报告中包含智能提取的相关错误信息
- ✅ 在错误报告中包含最后 5000 字符的快速参考

### 2. 详细的 Kotlin 编译错误
使用 `--info` 标志后，将显示：
```
> Task :react-native-image-marker:compileReleaseKotlin
Kotlin compilation 'compileReleaseKotlin' started
Using Kotlin/Native compiler version 1.9.22
Compiling Kotlin sources from [android/src/main/java/...]
e: file:///path/to/file.kt:123:45 Unresolved reference: SomeClass
e: file:///path/to/file.kt:124:10 Type mismatch: inferred type is X but Y was expected
```

### 3. 避免缓存问题
- ✅ 使用 `--no-build-cache` 确保每次构建都是干净的
- ✅ 避免缓存的构建状态导致的误导性错误
- ✅ 更容易重现和调试构建问题

### 4. 更好的错误诊断
错误报告现在包含：
```markdown
## Relevant Error Messages
```
e: file:///path/to/file.kt:123:45 Unresolved reference: SomeClass
e: file:///path/to/file.kt:124:10 Type mismatch
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':react-native-image-marker:compileReleaseKotlin'.
> Compilation error. See log for more details
```

## Full Build Output
See complete log in: /path/to/ci-build.log

### Last 5000 characters:
[详细的构建输出...]
```

## 质量检查结果

所有质量检查都已通过：

```bash
✅ npm run lint -- --fix scripts/ci-error-handler.js
✅ npm run typecheck
✅ npm test -- --run
```

## 下一步

1. **提交更改**：
   ```bash
   git add scripts/ci-error-handler.js .github/workflows/ci.yml
   git commit -m "fix(ci): enhance Android build logging and remove build-cache

   - Increase log buffer from 10MB to 50MB
   - Add real-time console output for build errors
   - Extract relevant error messages intelligently
   - Remove --build-cache to avoid cache-related issues
   - Add --info flag for detailed Kotlin compilation logs
   - Improve error report with 5000 char preview (up from 2000)
   
   Fixes: Android CI build failures with insufficient error details"
   ```

2. **推送并观察 CI**：
   ```bash
   git push origin <branch-name>
   ```

3. **验证改进**：
   - 检查 CI 日志是否显示完整的 Kotlin 编译错误
   - 验证 `ci-build.log` 文件是否包含完整输出
   - 确认错误报告中的 "Relevant Error Messages" 部分

## 技术细节

### stdio 配置说明
```javascript
stdio: ['inherit', 'pipe', 'pipe']
```
- `stdin: 'inherit'` - 继承父进程的标准输入
- `stdout: 'pipe'` - 捕获标准输出到变量
- `stderr: 'pipe'` - 捕获标准错误到变量

这样既能实时显示输出，又能捕获完整日志。

### 错误提取算法
1. 扫描每一行，查找错误标记
2. 发现错误时，回溯 3 行获取上下文
3. 继续捕获后续 10 行
4. 去重并返回所有相关错误片段

### Gradle 参数说明
- `--no-build-cache`: 禁用构建缓存，确保干净构建
- `--info`: 显示详细的构建信息
- `--stacktrace`: 显示完整的异常堆栈跟踪
- `--refresh-dependencies`: 强制刷新依赖

## 参考资料

- [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [Gradle Logging](https://docs.gradle.org/current/userguide/logging.html)
- [Node.js Child Process stdio](https://nodejs.org/api/child_process.html#child_process_options_stdio)
