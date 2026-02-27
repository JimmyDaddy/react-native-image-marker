# Create Example Script 修复与增强说明

## 修复日期
2024年

## 变更概述

创建通用的 `scripts/create-example.sh` 脚本，支持创建任意版本的 React Native 示例应用，替代原有的版本专用脚本。

## 背景

原项目中存在版本专用的脚本（如 `create-example-0.81.sh`），每个版本都需要单独维护一个脚本，不够灵活。新脚本通过参数化实现了通用性。

## 常见问题（历史记录）

在开发通用脚本之前，版本专用脚本遇到过以下问题：

### 问题 1: React Native CLI 命令已弃用

**错误信息**:
```
WARNING: You should run npx react-native@latest to ensure you're always using the most current version of the CLI.
🚨️ The `init` command is deprecated.
- Switch to npx @react-native-community/cli init for the identical behavior.
```

**原因**: 
- `npx react-native@0.81.0 init` 命令已被弃用
- 应该使用 `@react-native-community/cli` 替代

### 问题 2: Podfile 修改语法错误

**错误信息**:
```
[!] Invalid `Podfile` file: syntax error, unexpected constant, expecting ']'
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

**原因**:
- 使用 `sed` 命令的 `a\` 追加功能在 macOS 上语法复杂且容易出错
- ENV 变量被错误地插入到 `require` 语句的中间，破坏了 Ruby 语法

## 新功能：通用版本脚本

### 创建 `scripts/create-example.sh`

新脚本支持以下功能：

1. **指定 React Native 版本**
   - 可以创建任意版本的示例应用
   - 自动根据版本号命名目录（如 0.81.0 → example-0.81）

2. **选择架构类型**
   - 支持 Legacy 架构（默认）
   - 支持 New Architecture
   - 自动配置相应的环境变量和构建设置

3. **智能配置**
   - 自动检测并复制 demo 应用代码
   - 自动配置 Android 和 iOS 的架构设置
   - 自动安装依赖和 iOS pods

### 使用方法

```bash
# 基本用法（创建 Legacy 架构的 0.81.0 示例）
./scripts/create-example.sh 0.81.0

# 创建 New Architecture 的 0.81.0 示例
./scripts/create-example.sh 0.81.0 new

# 创建 Legacy 架构的 0.73.0 示例
./scripts/create-example.sh 0.73.0 legacy

# 创建 New Architecture 的 0.74.0 示例
./scripts/create-example.sh 0.74.0 new
```

### 参数说明

```bash
./scripts/create-example.sh [version] [architecture]
```

- `version`: React Native 版本号（如 0.81.0, 0.73.0）
  - 默认值: 0.81.0
  - 目录名会自动去掉补丁版本号（0.81.0 → example-0.81）

- `architecture`: 架构类型
  - `legacy`: Legacy 架构（默认）
  - `new`: New Architecture
  - 自动配置对应的环境变量

### 生成的配置

#### Legacy 架构
```properties
# Android (gradle.properties)
newArchEnabled=false

# iOS (.xcode.env.local)
export RCT_NEW_ARCH_ENABLED=0

# iOS (Podfile)
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

#### New Architecture
```properties
# Android (gradle.properties)
newArchEnabled=true

# iOS (.xcode.env.local)
export RCT_NEW_ARCH_ENABLED=1

# iOS (Podfile)
ENV['RCT_NEW_ARCH_ENABLED'] = '1'
```

## 解决方案（原问题修复）

### 修复 1: 更新 React Native CLI 命令

**修改前**:
```bash
npx react-native@0.81.0 init ImageMarkerExample081 --version 0.81.0 --skip-install
```

**修改后**:
```bash
npx @react-native-community/cli@latest init ImageMarkerExample081 --version 0.81.0 --skip-install
```

### 修复 2: 使用 Ruby 脚本安全修改 Podfile

**修改前** (使用 sed):
```bash
if ! grep -q "ENV\['RCT_NEW_ARCH_ENABLED'\]" ios/Podfile; then
    line_num=$(grep -n "require" ios/Podfile | tail -1 | cut -d: -f1)
    sed -i.bak "${line_num}a\\
\\
# React Native New Architecture\\
ENV['RCT_NEW_ARCH_ENABLED'] = '0'\\
" ios/Podfile
    rm ios/Podfile.bak
fi
```

**修改后** (使用 Ruby):
```bash
if ! grep -q "ENV\['RCT_NEW_ARCH_ENABLED'\]" ios/Podfile; then
    ruby -i.bak -e '
    lines = ARGF.readlines
    last_require_index = lines.rindex { |line| line =~ /^require / }
    
    if last_require_index
      lines.insert(last_require_index + 1, "\n")
      lines.insert(last_require_index + 2, "# React Native New Architecture\n")
      lines.insert(last_require_index + 3, "ENV['\''RCT_NEW_ARCH_ENABLED'\''] = '\''0'\''\n")
      lines.insert(last_require_index + 4, "\n")
    end
    
    puts lines.join
    ' ios/Podfile
    
    rm -f ios/Podfile.bak
fi
```

## 修复优势

### 使用 @react-native-community/cli 的优势
1. **官方推荐**: React Native 官方推荐的新方式
2. **持续维护**: 社区持续维护和更新
3. **更好的兼容性**: 与最新版本的 React Native 更好地兼容

### 使用 Ruby 修改 Podfile 的优势
1. **语法安全**: Ruby 是 Podfile 的原生语言，处理更可靠
2. **精确定位**: 使用 `rindex` 找到最后一个 `require` 语句
3. **正确插入**: 在 `require` 语句之后插入，不会破坏语法
4. **跨平台兼容**: 在 macOS 和 Linux 上都能正常工作

## 测试验证

修复后的脚本应该能够：
1. ✅ 成功初始化 React Native 0.81 项目
2. ✅ 正确配置 Android gradle.properties
3. ✅ 正确配置 iOS .xcode.env.local
4. ✅ 安全修改 Podfile 而不破坏语法
5. ✅ 成功安装 iOS pods
6. ✅ 创建可运行的示例应用

## 使用方法

### 通用脚本（推荐）

```bash
# 创建 Legacy 架构示例
./scripts/create-example.sh 0.81.0 legacy

# 创建 New Architecture 示例
./scripts/create-example.sh 0.73.0 new

# 创建其他版本
./scripts/create-example.sh 0.74.0 new
./scripts/create-example.sh 0.82.0 legacy
```

## 脚本特性

| 特性 | 通用脚本 (create-example.sh) |
|------|------------------------------|
| 支持多版本 | ✅ 任意版本 |
| 架构选择 | ✅ Legacy/New |
| 参数化 | ✅ 命令行参数 |
| 灵活性 | ✅ 高 |
| 维护成本 | ✅ 低（单一脚本） |

## 相关文件

- `scripts/create-example.sh`: 通用版本脚本
- `example-*/`: 生成的示例应用目录
- `example-*/ios/Podfile`: 自动配置的 Podfile

## 后续改进建议

1. ✅ **版本参数化**: 已实现，支持任意版本
2. ✅ **架构选择**: 已实现，支持 Legacy 和 New Architecture
3. **错误处理**: 添加更多的错误检查和友好的错误提示
4. **日志输出**: 增加详细的进度日志，方便调试
5. **回滚机制**: 如果某步失败，自动清理已创建的文件
6. **依赖版本管理**: 根据 RN 版本自动调整依赖版本
7. **测试脚本**: 创建自动化测试验证脚本的正确性

## 迁移指南

### 使用新脚本

如果你之前手动创建示例应用，现在可以使用新脚本：

```bash
# 创建 React Native 0.81 Legacy 架构示例
./scripts/create-example.sh 0.81.0 legacy

# 等效于之前的手动步骤
```

### 创建不同版本

```bash
# React Native 0.73 (New Architecture)
./scripts/create-example.sh 0.73.0 new

# React Native 0.74 (New Architecture)
./scripts/create-example.sh 0.74.0 new

# React Native 0.81 (Legacy)
./scripts/create-example.sh 0.81.0 legacy

# React Native 0.82 (New Architecture)
./scripts/create-example.sh 0.82.0 new
```

## 参考资源

- [React Native CLI 文档](https://reactnative.dev/docs/getting-started)
- [@react-native-community/cli](https://github.com/react-native-community/cli)
- [Ruby 文档](https://ruby-doc.org/)
- [Podfile 语法](https://guides.cocoapods.org/syntax/podfile.html)
