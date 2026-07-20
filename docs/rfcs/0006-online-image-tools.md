# RFC 0006：面向任务的在线图片工具

- 状态：Accepted
- 目标版本：网站持续交付，不改变 npm SDK 版本
- 适用平台：现代桌面与移动浏览器

## 背景

网站现有 Playground 适合开发者验证完整 Marker API，但功能持续增加后，第一次访问的用户需要先理解 API 分类、多个标签和大量参数，才能完成“给一张图加水印”这类直接任务。SDK 已经具备可见水印、批处理 Recipe、隐形追踪、稳健检测和 Content Credentials 适配边界，网站可以把这些能力组合成无需安装、图片留在本地的在线工具。

## 目标

1. 建立 `/tools/` 与 `/zh-cn/tools/` 双语工具中心，用户进入具体页面后首屏即可选择图片并操作。
2. 第一阶段交付单图水印、批量水印、保密水印、隐形水印嵌入和追踪检查五个工具。
3. 第二阶段交付 Recipe 构建器、收件人追踪包、追踪稳健性实验室和 Content Credentials 检查器四个工具。
4. 所有图片处理默认在当前浏览器中完成，不上传文件，不保存检测密钥。
5. 工具页共享 SDK、文件校验、状态、预览、下载和响应式布局，避免复制九套编辑器。
6. 每个工具具有独立的中英文标题、说明、限制与搜索入口，并进入 HTML/XML sitemap。

## 非目标

- 不实现水印移除、通用图片压缩转换、PDF 或视频处理。
- 不把隐形水印描述为 DRM、所有权证明或“图片未被修改”的证明。
- 不在浏览器中提供生产级主密钥管理，也不把收件人姓名、邮箱等个人信息直接写进水印 payload。
- 不检测 SynthID、任意第三方水印或 AI 生成内容；追踪检查器只验证 Image Marker `dct-qim-v1`。
- 不在浏览器中签发 Content Credentials；Content Credentials 工具只读取并展示已有 manifest。
- 不替代 Playground 的完整 API 调试与代码生成能力。

## 信息架构

### 第一阶段

- `/tools/watermark/`：文字、Logo 或组合水印；单次/平铺、位置、旋转、透明度、描边、输出格式。
- `/tools/batch-watermark/`：多图应用同一 Recipe，支持 `{{filename}}` 与 `{{index}}`，显示进度并导出 ZIP。
- `/tools/confidential-watermark/`：以 `CONFIDENTIAL`、`DRAFT`、`仅供内部` 等高频模板快速生成保密水印。
- `/tools/invisible-watermark/`：嵌入 1–12 字节随机 locator，下载 PNG 与本地记录 JSON。
- `/tools/trace-checker/`：独立选择疑似图片并输入同一密钥，显示 payload、置信度、误码率和估计缩放。

### 第二阶段

- `/tools/recipe-builder/`：可视化编辑、导入/导出 Recipe JSON、预览并复制 Web/React Native 调用代码。
- `/tools/recipient-trace-package/`：根据收件人标识生成随机 locator，批量输出图片与只保存在本地的映射表 ZIP。
- `/tools/trace-lab/`：对带追踪图片执行 JPEG 重编码、缩放和有限裁剪，生成可重复的检测矩阵。
- `/tools/content-credentials/`：按需加载官方 `@contentauth/c2pa-web`，读取 C2PA manifest store 并显示原始 JSON。

## 共享实现

Astro 继续负责静态内容、双语路由、搜索和 sitemap。`OnlineImageTool.astro` 根据页面传入的工具类型渲染任务表单，`online-tools.ts` 按工具类型绑定行为，`online-tools.css` 提供统一的工作区、控件、状态和响应式布局。

公共浏览器工具负责：

- JPEG/PNG/WebP 输入校验、12 MB 文件限制与 16 MP 像素限制。
- Data URL、Blob、Canvas 变换、对象 URL 生命周期和安全文件名。
- 明确的 busy/success/error 状态、下载动作和屏幕阅读器通知。
- 默认示例图，让用户不上传也能立即预览；选择本地文件后不发出网络请求。

核心渲染继续直接调用仓库 `src/index.ts` 的 Web Marker，不维护第二套 Canvas 水印算法。ZIP 使用小型纯浏览器依赖并在批量工具中动态加载；C2PA WASM 只在检查器开始读取时动态加载。

## 隐私与安全边界

- 工具页显著显示“图片不上传”，实现不得使用分析接口或远程图片处理服务。
- 文件选择、结果 Blob、Recipe、recipient mapping 与 key 只保存在当前页面内存；刷新页面即清除。
- 示例密钥只能用于体验。页面必须说明生产系统应在可信服务端管理密钥并只向客户端返回随机 locator。
- recipient mapping 中保存调用者输入的标识与随机 locator，但 locator 本身不包含个人信息。
- 追踪检测的 positive 仅表示通过 magic、CRC 与认证校验，不声明图片真实、原创或未修改。
- Content Credentials 页面展示 manifest 中已有的数据；用户应在读取前自行判断其中是否包含敏感 metadata。

## 可访问性与响应式

- 每个 input 有可见 label；按钮、状态、错误和结果表可由键盘与屏幕阅读器操作。
- 桌面端使用控制区与预览区双栏；窄屏改为单栏，页面不得产生横向滚动。
- 上传入口与主要操作必须出现在首屏附近；高级解释放在工具下方。
- 原生 select 使用站点统一的视觉样式，不依赖浏览器默认外观。

## SEO 与文档

- 顶部导航新增 Tools / 在线工具，工具中心与所有工具页进入 Starlight sidebar。
- 每个 MDX 页面设置独立 title、description、use case、限制和相关工具链接。
- HTML sitemap 与 `astro-sitemap` 生成的 XML sitemap 必须包含两种语言的所有工具 URL。
- Pagefind 索引工具页正文；不索引用户在运行时生成的文件、密钥或结果。

## 验收与 CI

1. Astro check/build 通过，构建检查验证所有英文与中文工具页和 sitemap URL。
2. Chromium 本地 smoke 覆盖工具中心、单图可见水印、批量 ZIP、隐形嵌入与独立检测、Recipe 导入导出和移动端无横向溢出。
3. CI 中 Firefox 与 WebKit 至少覆盖可见水印和隐形追踪关键路径。
4. C2PA 页面可在没有 manifest、无效图片和正常 manifest 三种情况下给出明确结果，WASM 不进入其他工具页面的入口 chunk。
5. 根 SDK 的类型检查、单测、lint、prepack 与生产依赖审计继续通过。

## 发布策略

两个阶段在同一个网站 PR 中交付。工具是现有 SDK 能力的浏览器组合，不改变公共 npm API，因此不单独发布 SDK 版本。合并后由 Pages 工作流部署；若真实使用数据表明表单需要进一步拆分，只调整工具层，不把任务型交互反向塞回 Playground。
