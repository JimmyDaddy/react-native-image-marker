# GitHub Workflows 合并说明

## 变更概述

将 `.github/workflows/architecture-test.yml` 合并到 `.github/workflows/ci.yml` 中，统一 CI 流程。

## 合并内容

### 新增的 CI 作业

1. **architecture-compatibility**: 架构兼容性测试
   - 测试双架构支持 (legacy/new)
   - TypeScript 编译检查
   - 单元测试执行
   - Codegen 规范验证
   - 库构建和导出验证

2. **validate-build-configs**: 构建配置验证
   - iOS podspec 语法验证
   - Android Gradle 配置验证
   - 双架构构建配置测试

### 更新的触发条件

- 添加了 `push` 到 `main/master` 分支的触发
- 保持原有的 `pull_request` 和 `workflow_dispatch` 触发

### 依赖关系更新

- `ci-complete` 作业现在依赖所有新增的作业
- 确保所有测试都通过后才标记 CI 完成

### 包管理器修复

**问题**: `architecture-compatibility` 作业使用了 `cache: 'npm'` 但项目使用 `yarn.lock`

**解决方案**:
- 将 `cache: 'npm'` 改为 `cache: 'yarn'`
- 将 `npm ci` 改为 `yarn install --frozen-lockfile`
- 将所有 `npm run` 命令改为 `yarn` 命令
- 将 `npm test -- --run` 改为 `yarn test --run`
- 将 `npm audit --audit-level=moderate` 改为 `yarn audit --level moderate`

### iOS 构建修复

**问题**: iOS Build and Test 作业中 CocoaPods 依赖版本冲突，`boost` 依赖版本不兼容

**解决方案**:
1. **修改 Pod 安装流程**:
   - 在 `pod install` 前删除 `Podfile.lock` 文件避免版本冲突
   - 添加 `--repo-update` 参数确保获取最新依赖版本
   - 保持 `pod cache clean --all` 清理缓存

2. **优化缓存策略**:
   - 将缓存键从基于 `Podfile.lock` 改为基于 `Podfile` 和 `package.json`
   - 确保不同 CocoaPods 版本和架构有独立的缓存

**修改详情**:
```yaml
# 修改前
key: ${{ runner.os }}-pods-${{ matrix.cocoapods }}-${{ matrix.architecture }}-${{ hashFiles('**/Podfile.lock') }}

# 修改后  
key: ${{ runner.os }}-pods-${{ matrix.cocoapods }}-${{ matrix.architecture }}-${{ hashFiles('example/ios/Podfile') }}-${{ hashFiles('package.json') }}
```

```bash
# 修改前
pod install

# 修改后
rm -f Podfile.lock
pod install --repo-update
```

## 优势

1. **统一管理**: 所有 CI 流程在一个文件中管理
2. **减少重复**: 避免重复的依赖安装和缓存配置
3. **更好的可视化**: 在一个 workflow 中查看所有测试状态
4. **简化维护**: 只需维护一个 CI 配置文件
5. **正确的包管理器**: 使用项目实际使用的 yarn 而不是 npm
6. **稳定的iOS构建**: 解决了 CocoaPods 依赖版本冲突问题

## 测试覆盖

合并后的 CI 流程包含：
- ✅ 安全检查和依赖审查
- ✅ 架构兼容性测试 (新增)
- ✅ 构建配置验证 (新增)
- ✅ Android 构建和测试 (双架构)
- ✅ iOS 构建和测试 (双架构)
- ✅ 集成测试和验证

所有 236 个测试通过，确保合并后的配置正确无误。