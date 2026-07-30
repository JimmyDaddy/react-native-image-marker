---
title: 命令行工具
description: 在终端或 CI 中验证、迁移、渲染、检查并批量处理 Recipe v2。
---

`@image-marker/cli@0.1` 将 Node 渲染器暴露为 `image-marker` 命令，面向脚本
与 CI 提供稳定退出码、JSON 输出、stdin/stdout、原子写入、并发限制与信号取消。

```sh
npm install --global @image-marker/cli@^0.1
image-marker --help
```

需要 Node.js 20.19 或更高版本。

## 创建、验证并渲染

```sh
image-marker init
image-marker validate --recipe image-marker.recipe.json

image-marker render \
  --recipe image-marker.recipe.json \
  --input photo.jpg \
  --output marked.webp \
  --format webp \
  --quality 86 \
  --var recipient=Alice
```

除非显式传入 `--force`，命令不会覆盖已有输出。图片图层的相对路径以 Recipe
文件为基准解析。二进制 stdin/stdout 使用 `-`，机器可读结果使用 `--json`。

## 命令一览

- `init`：创建可编辑的 Recipe v2 文档。
- `validate`：验证 Recipe v2 文档。
- `migrate`：将受支持的 v1 Recipe 转为规范 v2。
- `render`：渲染一张图片。
- `batch`：按顺序批量渲染，支持并发与重试。
- `inspect`：以 JSON 输出图片元数据。
- `embed`：写入认证的无损 PNG locator。
- `detect`：恢复并验证 locator。

Locator 密钥从环境变量读取，不进入命令行参数。退出码固定为：`0` 成功、
`1` 运行时失败、`2` 用法错误、`3` 未检测到 locator、`130` 被中断。

JavaScript 进程需要直接控制时使用
[`@image-marker/node` API](/zh-cn/node/)；只需要创建和验证文档时使用
[Recipe 包](/zh-cn/recipe/)。
