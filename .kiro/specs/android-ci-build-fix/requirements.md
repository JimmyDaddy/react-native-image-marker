# 需求文档

## 介绍

修复 React Native 项目中的 Android CI 构建错误，特别是解决 `codegenConfig` 属性配置问题。该问题导致 GitHub Actions CI 中的 Android Build (new) 任务失败，错误信息为："Could not set unknown property 'codegenConfig' for extension 'react' of type com.facebook.react.ReactExtension"。

## 术语表

- **System**: React Native 构建系统
- **CI_Pipeline**: GitHub Actions 持续集成流水线
- **Codegen**: React Native 新架构的代码生成工具
- **TurboModule**: React Native 新架构的原生模块系统
- **Build_Configuration**: Android Gradle 构建配置
- **Legacy_Architecture**: React Native 传统架构
- **New_Architecture**: React Native 新架构 (TurboModules + Fabric)

## 需求

### 需求 1

**用户故事:** 作为开发者，我希望 Android CI 构建能够成功通过，以便确保代码质量和持续集成流程的正常运行。

#### 验收标准

1. WHEN CI 流水线运行 Android Build (new) 任务 THEN THE System SHALL 成功完成构建而不出现 codegenConfig 相关错误
2. WHEN 使用 React Native 0.73+ 版本构建项目 THEN THE Build_Configuration SHALL 使用正确的 Codegen 配置语法
3. WHEN 构建过程中遇到配置错误 THEN THE System SHALL 提供清晰的错误信息和解决建议
4. WHEN 构建完成后 THEN THE System SHALL 生成有效的 APK 文件
5. WHEN 运行构建验证测试 THEN THE System SHALL 确认所有构建产物的完整性

### 需求 2

**用户故事:** 作为开发者，我希望新架构的 Codegen 功能能够正常工作，以便 TurboModule 接口能够正确生成原生代码。

#### 验收标准

1. WHEN Codegen 处理 TurboModule 规范文件 THEN THE System SHALL 生成对应的 Java 接口代码
2. WHEN 构建新架构版本 THEN THE Codegen SHALL 根据 specs/NativeImageMarker.ts 生成正确的原生绑定代码
3. WHEN 生成的代码被编译 THEN THE System SHALL 确保所有生成的接口与 TypeScript 定义匹配
4. WHEN TurboModule 被加载 THEN THE System SHALL 能够正确识别和调用原生方法
5. WHEN Codegen 配置发生变化 THEN THE System SHALL 重新生成相应的原生代码

### 需求 3

**用户故事:** 作为开发者，我希望构建配置能够同时支持新架构和传统架构，以便保持向后兼容性。

#### 验收标准

1. WHEN newArchEnabled 设置为 true THEN THE Build_Configuration SHALL 启用新架构相关的构建选项
2. WHEN newArchEnabled 设置为 false THEN THE Build_Configuration SHALL 使用传统架构的构建配置
3. WHEN 切换架构模式 THEN THE System SHALL 自动调整源代码目录和依赖项
4. WHEN 构建任一架构版本 THEN THE System SHALL 生成功能完整的应用程序
5. WHEN 运行架构兼容性测试 THEN THE System SHALL 验证两种架构的功能一致性

### 需求 4

**用户故事:** 作为开发者，我希望 CI 流水线能够稳定运行，以便及时发现和修复构建问题。

#### 验收标准

1. WHEN CI 流水线启动 THEN THE CI_Pipeline SHALL 成功完成所有构建和测试步骤
2. WHEN 构建过程中出现错误 THEN THE CI_Pipeline SHALL 提供详细的错误日志和堆栈跟踪
3. WHEN 构建成功完成 THEN THE CI_Pipeline SHALL 上传构建产物作为工件
4. WHEN 运行并行构建任务 THEN THE System SHALL 确保不同架构版本的构建互不干扰
5. WHEN 缓存机制启用 THEN THE CI_Pipeline SHALL 有效利用 Gradle 和依赖项缓存以提高构建速度

### 需求 5

**用户故事:** 作为开发者，我希望构建配置遵循 React Native 最佳实践，以便确保项目的可维护性和未来兼容性。

#### 验收标准

1. WHEN 更新 React Native 版本 THEN THE Build_Configuration SHALL 使用该版本推荐的配置方式
2. WHEN 配置 Codegen 参数 THEN THE System SHALL 遵循官方文档的配置规范
3. WHEN 设置构建选项 THEN THE Build_Configuration SHALL 使用稳定且经过验证的配置值
4. WHEN 处理依赖项 THEN THE System SHALL 确保版本兼容性和安全性
5. WHEN 应用构建优化 THEN THE System SHALL 在保持功能完整性的前提下提高构建性能

### 需求 6

**用户故事:** 作为开发者，我希望项目能够支持 React Native 0.8x 版本的集成和兼容性，以便适应不同项目的版本需求。

#### 验收标准

1. WHEN 使用 React Native 0.8x 版本构建项目 THEN THE Build_Configuration SHALL 使用该版本对应的 Codegen 配置语法
2. WHEN 在 React Native 0.8x 环境中运行新架构 THEN THE System SHALL 正确处理 TurboModule 和 Fabric 组件
3. WHEN 切换不同 React Native 版本 THEN THE Build_Configuration SHALL 自动适配相应版本的构建工具和插件
4. WHEN 构建 React Native 0.8x 项目 THEN THE System SHALL 确保与现有 0.73 版本的功能兼容性
5. WHEN 运行版本兼容性测试 THEN THE System SHALL 验证在不同 React Native 版本下的功能一致性

### 需求 7

**用户故事:** 作为开发者，我希望新架构下能够正确处理不同 React Native 版本的差异，以便确保跨版本的稳定性。

#### 验收标准

1. WHEN 检测到不同的 React Native 版本 THEN THE System SHALL 自动选择对应版本的 Codegen 配置策略
2. WHEN 新架构在不同版本间存在 API 差异 THEN THE System SHALL 提供版本适配层来统一接口
3. WHEN 构建工具版本发生变化 THEN THE Build_Configuration SHALL 相应调整 Gradle 插件和依赖项版本
4. WHEN 团队成员使用不同 React Native 版本 THEN THE System SHALL 确保构建结果的一致性
5. WHEN 版本升级时 THEN THE System SHALL 提供清晰的迁移指南和兼容性检查

### 需求 8

**用户故事:** 作为开发者，我希望能够轻松诊断和修复构建问题，以便快速恢复开发流程。

#### 验收标准

1. WHEN 构建失败时 THEN THE System SHALL 提供具体的错误位置和原因说明
2. WHEN 配置存在问题 THEN THE System SHALL 建议正确的配置方式
3. WHEN 依赖项冲突时 THEN THE System SHALL 指出冲突的具体依赖项和版本
4. WHEN 环境配置不当 THEN THE System SHALL 提供环境检查和修复建议
5. WHEN 需要调试构建过程 THEN THE System SHALL 支持详细的构建日志输出

### 需求 9

**用户故事:** 作为开发者，我希望项目中的示例应用能够支持多个 React Native 版本，以便验证库在不同版本下的兼容性和功能完整性。

#### 验收标准

1. WHEN 更新示例应用 THEN THE System SHALL 保留现有 App.tsx 的核心处理逻辑和功能演示
2. WHEN 创建 React Native 0.73 版本示例 THEN THE System SHALL 确保所有图片水印功能在该版本下正常工作
3. WHEN 创建 React Native 0.8x 版本示例 THEN THE System SHALL 适配最新版本的 API 和构建配置
4. WHEN 更新 Expo 示例应用 THEN THE System SHALL 确保与 Expo SDK 的兼容性和预构建支持
5. WHEN 运行不同版本的示例应用 THEN THE System SHALL 提供一致的用户体验和功能演示

### 需求 10

**用户故事:** 作为开发者，我希望示例应用能够展示库的完整功能，同时作为不同 React Native 版本的集成测试。

#### 验收标准

1. WHEN 示例应用启动 THEN THE System SHALL 正确加载并显示图片水印功能的演示界面
2. WHEN 用户在示例应用中测试功能 THEN THE System SHALL 确保文本水印和图片水印功能正常工作
3. WHEN 示例应用在不同架构下运行 THEN THE System SHALL 自动选择合适的实现（Legacy 或 TurboModule）
4. WHEN 构建示例应用 THEN THE System SHALL 验证库的正确集成和依赖项解析
5. WHEN 示例应用出现错误 THEN THE System SHALL 提供清晰的错误信息和调试支持