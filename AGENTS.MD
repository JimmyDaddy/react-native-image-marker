# AI 助手行为准则 (Project Rules)

## 1. 语言与沟通
- **始终使用中文**回复用户的提问和解释。
- 涉及代码、文件名、技术专有名词建议保留英文原词。
- 代码注释和文档字符串使用英文，确保国际化兼容性。
- **🚨 重要**: 每次修改代码后必须运行 `npm test -- --run`、`npm run typecheck`、`npm run lint` 进行质量检查。

## 2. 项目概况
- **项目名称**: `react-native-image-marker`
- **功能**: React Native 图片加水印/文字库，支持文本水印和图片水印。
- **架构**: 同时支持 **React Native New Architecture (TurboModules/Fabric)** 和 Legacy Architecture。
- **核心语言**:
  - JS/TS: TypeScript (严格模式)
  - iOS: Swift (TurboModule) + Objective-C (Legacy)
  - Android: Kotlin (TurboModule + Legacy)
  - Codegen: TypeScript 规范自动生成原生接口

## 3. 项目结构
```
react-native-image-marker/
├── src/                          # TypeScript 核心代码
│   ├── index.ts                  # 统一 API 入口
│   ├── ArchitectureDetector.ts   # 架构检测器
│   ├── TurboModuleImpl.ts        # TurboModule 实现
│   ├── LegacyImpl.ts             # Legacy 实现
│   ├── ErrorHandler.ts           # 统一错误处理
│   ├── FabricImageLoader.ts      # Fabric 图片加载器
│   ├── SerializationOptimizer.ts # 序列化优化器
│   ├── types/index.ts            # 类型定义
│   ├── legacy/index.ts           # Legacy 桥接
│   ├── expo-plugin/              # Expo 配置插件
│   └── __tests__/                # 测试文件
├── specs/                        # Codegen 规范
│   └── NativeImageMarker.ts      # TurboModule 接口定义
├── ios/                          # iOS 原生实现
│   ├── RCTImageMarker/           # Legacy 实现
│   └── ImageMarkerTurboModule/   # TurboModule 实现
├── android/                      # Android 原生实现
│   └── src/main/java/com/jimmydaddy/imagemarker/
├── docs/                         # 文档目录
│   └── dev/                      # 开发相关文档 (问题修复、优化说明等)
├── example/                      # 示例应用 (Legacy)
├── example-0.73/                 # 示例应用 (New Architecture)
├── expo-example/                 # Expo 示例应用
└── .kiro/specs/                  # 规范驱动开发文档
```

### 3.1 文档组织规范
- **开发文档位置**: 所有项目开发相关的文档必须放在 `docs/dev/` 目录下
- **开发文档类型**:
  - 问题修复说明 (如 `KOTLIN_VERSION_FIX.md`)
  - 优化说明文档 (如 `CI_OPTIMIZATION.md`)
  - 功能实现总结 (如 `ENUM_KEY_FIX_SUMMARY.md`)
  - 架构变更记录
  - 性能优化记录
- **用户文档位置**: 用户面向的文档保留在项目根目录
  - `README.md`: 项目介绍和使用指南
  - `CONTRIBUTING.md`: 贡献指南
  - `CHANGELOG.md`: 版本变更日志
  - `LICENSE`: 许可证
- **命名规范**: 开发文档使用大写字母和下划线，如 `FEATURE_NAME.md`

## 4. 编码规范

### 4.1 TypeScript 规范
- **严格类型检查**: 启用 `strict: true`，避免使用 `any`。
- **统一错误处理**: 所有错误必须通过 `ErrorHandler` 处理。
- **架构兼容性**: 新功能必须同时支持 TurboModule 和 Legacy 实现。
- **性能优化**: 使用 `SerializationOptimizer` 减少 JSI 通信开销。
- **导出规范**: 
  ```typescript
  // 正确的导出方式
  export { Position, ImageFormat } from './types';
  export type { TextMarkOptions, ImageMarkOptions } from './types';
  ```

### 4.2 Native Implementation 规范
- **iOS TurboModule**: 
  - 位于 `ios/ImageMarkerTurboModule/`
  - 使用 Swift 实现，遵循 TurboModule 协议
  - 确保所有 Promise 路径都有正确的 resolve/reject
- **iOS Legacy**: 
  - 位于 `ios/RCTImageMarker/`
  - 使用 Swift + Objective-C 桥接
- **Android**: 
  - TurboModule 和 Legacy 都使用 Kotlin
  - 位于 `android/src/main/java/com/jimmydaddy/imagemarker/`
  - 遵循 Android 异步处理最佳实践

### 4.3 Codegen 规范
- **规范文件**: `specs/NativeImageMarker.ts`
- **接口一致性**: Codegen 接口必须与 TypeScript 类型完全匹配
- **命名规范**: 
  - TurboModule 方法: `markWithText`, `markWithImage`
  - TypeScript API: `markText`, `markImage`
- **类型映射**: 复杂对象使用 `Object` 类型，由 Codegen 处理

## 5. 测试策略 (Vitest + Property-Based Testing)

### 5.1 测试框架
- **主框架**: Vitest (替代 Jest，更快的启动和执行)
- **属性测试**: 使用 Property-Based Testing 验证通用正确性
- **架构测试**: 同时测试 Legacy 和 TurboModule 实现

### 5.2 测试文件结构
```
src/__tests__/
├── setup.ts                     # 测试环境配置
├── react-native-mock.js         # React Native 模拟
├── index.test.ts                 # 基础功能测试
├── properties.test.ts            # 属性测试 (PBT)
├── performance.test.ts           # 性能基准测试
├── serialization-optimization.test.ts # 序列化优化测试
└── expo-integration.test.ts      # Expo 集成测试
```

### 5.3 测试命令
```bash
npm test                          # 运行所有测试
npm run test:run                  # 单次运行测试
npm run test:ui                   # 可视化测试界面
npm run test:architecture         # 架构兼容性测试
npm run test:architecture:legacy  # 仅测试 Legacy 架构
npm run test:architecture:new     # 仅测试 New 架构
```

### 5.4 属性测试规范
- **属性定义**: 每个属性必须有明确的验证需求引用
- **测试格式**: 
  ```typescript
  test('Property X: Description', () => {
    /**
     * Feature: react-native-new-architecture-upgrade
     * Property X: 对于任何输入，系统应该满足某个条件
     * Validates: Requirements X.Y, Z.W
     */
    // 测试实现
  });
  ```

## 6. 架构检测与兼容性

### 6.1 架构检测器使用
```typescript
import { ArchitectureDetector } from 'react-native-image-marker';

// 检测新架构
const isNewArch = ArchitectureDetector.isNewArchitecture();

// 获取详细信息
const info = ArchitectureDetector.getArchitectureInfo();
console.log('TurboModules:', info.hasTurboModules);
console.log('JSI:', info.hasJSI);
console.log('Fabric:', info.hasFabric);

// 重置检测缓存 (测试时使用)
ArchitectureDetector.reset();
```

### 6.2 实现选择逻辑
- **自动检测**: 运行时自动选择合适的实现
- **错误回退**: 检测失败时自动回退到 Legacy 实现
- **一致性保证**: 两种实现必须提供相同的 API 和行为

## 7. 性能优化

### 7.1 序列化优化
- **使用场景**: TurboModule 调用前自动优化数据结构
- **优化策略**: 
  - 移除 undefined 和默认值
  - 合并 padding 和 corner radius 值
  - 字符串坐标转数字
  - 移除空的样式对象
- **性能监控**: 开发模式下记录优化效果

### 7.2 Fabric 集成
- **图片加载**: 使用 `FabricImageLoader` 处理图片源
- **缓存机制**: 启用图片缓存以提高性能
- **线程安全**: 确保 Fabric 线程模型兼容性

## 8. Expo 支持

### 8.1 配置插件
- **插件文件**: `src/expo-plugin/withImageMarker.ts`
- **主插件**: `app.plugin.js` (项目根目录)
- **支持功能**: 
  - 自动配置新架构支持
  - EAS Build 兼容性
  - 预构建 (prebuild) 支持

### 8.2 Expo 示例
- **示例应用**: `expo-example/`
- **配置文件**: `app.json` 和 `app.new-arch.json`
- **测试命令**: `npm run expo-example`

## 9. 构建系统

### 9.1 条件编译
- **iOS**: 基于 `RCT_NEW_ARCH_ENABLED` 环境变量
- **Android**: 基于 `newArchEnabled` Gradle 属性
- **Codegen**: 自动生成原生接口代码

### 9.2 构建命令
```bash
npm run prepack                   # 构建库文件
npm run codegen                   # 生成 Codegen 代码
npm run clean                     # 清理构建文件
npm run bootstrap                 # 初始化开发环境
```

## 10. 代码质量保证

### 10.1 **代码修改后必须执行的检查 (重要!)**
**每次修改代码后，AI 助手必须按以下顺序执行检查，确保代码质量：**

```bash
# 1. 运行单元测试 (必须)
npm test -- --run

# 2. 类型检查 (必须)
npm run typecheck

# 3. 代码规范检查 (必须)
npm run lint

# 4. 如果有 lint 错误，尝试自动修复
npm run lint --fix
```

**检查失败处理原则：**
- ❌ **测试失败**: 必须修复测试或代码，不能忽略
- ❌ **类型错误**: 必须修复类型问题，不能使用 `any` 绕过
- ❌ **Lint 错误**: 必须修复代码规范问题
- ✅ **全部通过**: 才能认为代码修改完成

**特殊情况处理：**
- 如果是新增测试文件，确保测试能正常运行
- 如果修改了类型定义，检查所有相关文件的类型兼容性
- 如果修改了核心逻辑，运行架构兼容性测试：`npm run test:architecture`

### 10.2 静态检查工具
- **TypeScript**: `npm run typecheck`
- **ESLint**: `npm run lint` (支持 `--fix`)
- **Prettier**: 自动格式化 (集成在 ESLint 中)

### 10.3 Git Hooks (Lefthook)
- **pre-commit**: 运行 lint 和 typecheck
- **commit-msg**: 验证 Conventional Commits 格式
- **配置文件**: `lefthook.yml`

### 10.4 提交规范
- **格式**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/)
- **类型**: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`
- **示例**: `feat: add TurboModule serialization optimization`

## 11. 发布流程

### 11.1 版本管理
- **工具**: release-it
- **命令**: `npm run release`
- **自动化**: 自动生成 CHANGELOG.md 和 GitHub Release

### 11.2 包配置
- **主入口**: `lib/commonjs/index` (CommonJS)
- **模块入口**: `lib/module/index` (ES Modules)
- **类型定义**: `lib/typescript/index.d.ts`
- **React Native**: `src/index` (开发时)

## 12. 调试与故障排除

### 12.1 质量检查故障排除
**测试失败**:
```bash
# 查看详细测试输出
npm test -- --run --reporter=verbose

# 运行特定测试文件
npm test -- --run src/__tests__/specific.test.ts

# 运行特定测试用例
npm test -- --run -t "test name pattern"
```

**TypeScript 类型错误**:
```bash
# 查看详细类型错误
npm run typecheck

# 检查特定文件
npx tsc --noEmit src/specific-file.ts
```

**Lint 错误**:
```bash
# 查看所有 lint 错误
npm run lint

# 自动修复可修复的错误
npm run lint --fix

# 检查特定文件
npx eslint src/specific-file.ts
```

### 12.2 常见问题
1. **架构检测失败**: 使用 `ArchitectureDetector.reset()` 重置缓存
2. **TurboModule 加载失败**: 检查 Codegen 是否正确运行
3. **构建错误**: 确保环境变量设置正确 (`RCT_NEW_ARCH_ENABLED`)

### 12.3 调试工具
- **架构信息**: `ArchitectureDetector.getArchitectureInfo()`
- **错误日志**: 统一通过 `ErrorHandler` 处理
- **性能监控**: 开发模式下的序列化优化日志

## 13. 开发最佳实践

### 13.1 新功能开发流程
1. **更新 TypeScript 规范**: `specs/NativeImageMarker.ts`
2. **实现 TurboModule**: `src/TurboModuleImpl.ts`
3. **实现 Legacy**: `src/LegacyImpl.ts`
4. **添加原生实现**: iOS Swift + Android Kotlin
5. **编写测试**: 包括单元测试和属性测试
6. **🔥 执行质量检查** (必须):
   ```bash
   npm test -- --run      # 运行所有测试
   npm run typecheck      # TypeScript 类型检查
   npm run lint           # 代码规范检查
   ```
7. **更新文档**: README 和 TypeDoc 注释

### 13.2 代码修改工作流 (AI 助手必须遵循)
```
代码修改 → 运行测试 → 类型检查 → Lint 检查 → 全部通过 ✅
    ↓           ↓          ↓         ↓
   如有失败 → 修复问题 → 重新检查 → 直到通过
```

**重要提醒**: 任何代码修改都不能跳过质量检查步骤！

### 13.3 代码审查要点
- **架构兼容性**: 确保两种架构都能正常工作
- **错误处理**: 所有错误路径都有适当处理
- **性能影响**: 考虑序列化和通信开销
- **测试覆盖**: 新功能必须有对应测试
- **文档更新**: API 变更需要更新文档

### 13.4 规范驱动开发
- **规范文档**: `.kiro/specs/react-native-new-architecture-upgrade/`
- **需求文档**: `requirements.md`
- **设计文档**: `design.md`
- **任务列表**: `tasks.md`
- **属性验证**: 每个需求都有对应的属性测试

## 14. 相关资源

### 14.1 官方文档
- [React Native New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [TurboModules](https://reactnative.dev/docs/the-new-architecture/pillars-turbomodules)
- [Fabric Renderer](https://reactnative.dev/docs/the-new-architecture/pillars-fabric-components)
- [Codegen](https://reactnative.dev/docs/the-new-architecture/pillars-codegen)

### 14.2 项目文档
- **架构说明**: `ARCHITECTURE.md`
- **贡献指南**: `CONTRIBUTING.md`
- **变更日志**: `CHANGELOG.md`
- **在线文档**: https://jimmydaddy.github.io/react-native-image-marker
