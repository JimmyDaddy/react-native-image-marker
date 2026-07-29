export const toolGroups = [
  {
    id: 'create',
    label: {
      en: 'Create and batch',
      zh: '创建与批处理',
    },
    description: {
      en: 'Add a visible watermark to one image or a local batch.',
      zh: '为单张图片或本地批次添加可见水印。',
    },
    tools: [
      {
        id: 'watermark',
        slug: 'watermark',
        label: { en: 'Watermark an image', zh: '图片加水印' },
        description: {
          en: 'Add text, a logo, or a tiled pattern and export one image.',
          zh: '文字、Logo、单个或平铺，一张图马上导出。',
        },
        badge: { en: 'Popular', zh: '常用' },
      },
      {
        id: 'batch-watermark',
        slug: 'batch-watermark',
        label: { en: 'Batch watermark', zh: '批量加水印' },
        description: {
          en: 'Apply one recipe to several images and download a ZIP.',
          zh: '同一个 Recipe 处理多张图片，打包下载 ZIP。',
        },
        badge: { en: 'Batch', zh: '批处理' },
      },
      {
        id: 'confidential-watermark',
        slug: 'confidential-watermark',
        label: { en: 'Confidential watermark', zh: '保密水印' },
        description: {
          en: 'Cover a document image with CONFIDENTIAL, DRAFT, or your own label.',
          zh: '用“仅供内部”、DRAFT 等模板快速覆盖整张图。',
        },
        badge: { en: 'Preset', zh: '模板' },
      },
    ],
  },
  {
    id: 'developer',
    label: {
      en: 'Developer workflows',
      zh: '开发工作流',
    },
    description: {
      en: 'Build and edit reusable Recipe v2 documents before shipping them.',
      zh: '在集成前构建并编辑可复用的 Recipe v2 文档。',
    },
    tools: [
      {
        id: 'recipe-builder',
        slug: 'recipe-builder',
        label: { en: 'Recipe builder', zh: 'Recipe 构建器' },
        description: {
          en: 'Edit, validate, preview, and export reusable Recipe JSON.',
          zh: '编辑、验证、预览并导出可复用的 Recipe JSON。',
        },
        badge: { en: 'Developer', zh: '开发者' },
      },
      {
        id: 'editor',
        workflow: 'editor',
        fragment: 'editor-playground',
        label: { en: 'Interactive layer editor', zh: '交互式图层编辑器' },
        description: {
          en: 'Drag, scale, rotate, and reorder layers, then render Recipe v2 through Core.',
          zh: '拖动、缩放、旋转和排序图层，再通过 Core 渲染 Recipe v2。',
        },
        badge: { en: 'Editor 0.1.0', zh: 'Editor 0.1.0' },
      },
    ],
  },
  {
    id: 'trace',
    label: {
      en: 'Trace and provenance',
      zh: '追踪与凭证',
    },
    description: {
      en: 'Embed, recover, test, and inspect local trace or provenance data.',
      zh: '在本地嵌入、恢复、测试并检查追踪或来源信息。',
    },
    tools: [
      {
        id: 'invisible-watermark',
        slug: 'invisible-watermark',
        label: { en: 'Embed an invisible trace', zh: '嵌入隐形水印' },
        description: {
          en: 'Write an authenticated short locator into the image pixels.',
          zh: '在像素中写入经过认证的短追踪 locator。',
        },
        badge: { en: 'Trace', zh: '追踪' },
      },
      {
        id: 'trace-checker',
        slug: 'trace-checker',
        label: { en: 'Check a trace watermark', zh: '检查追踪水印' },
        description: {
          en: 'Upload a suspect image and recover its Image Marker locator.',
          zh: '上传一张疑似图片，恢复 Image Marker locator。',
        },
        badge: { en: 'Detect', zh: '检测' },
      },
      {
        id: 'recipient-trace-package',
        slug: 'recipient-trace-package',
        label: { en: 'Recipient trace package', zh: '收件人追踪包' },
        description: {
          en: 'Give each recipient a random locator and keep the mapping locally.',
          zh: '为每个收件人生成不同 locator 和本地映射表。',
        },
        badge: { en: 'Distribution', zh: '分发' },
      },
      {
        id: 'trace-lab',
        slug: 'trace-lab',
        label: { en: 'Trace robustness lab', zh: '追踪稳健性实验室' },
        description: {
          en: 'Check recovery after JPEG recompression, resizing, and a limited crop.',
          zh: '在 JPEG、缩放与裁剪后检查 locator 是否可恢复。',
        },
        badge: { en: 'Experiment', zh: '实验' },
      },
      {
        id: 'content-credentials',
        slug: 'content-credentials',
        label: {
          en: 'Content Credentials inspector',
          zh: 'Content Credentials 检查器',
        },
        description: {
          en: 'Read an existing C2PA manifest locally without signing the file.',
          zh: '读取图片中已有的 C2PA manifest，不上传文件。',
        },
        badge: { en: 'C2PA', zh: 'C2PA' },
      },
    ],
  },
];

export const tools = toolGroups.flatMap((group) => group.tools);

export function toolHref(tool, locale = 'en') {
  const prefix = locale === 'zh' ? '/zh-cn' : '';
  if (tool.workflow) {
    return `${prefix}/playground/?workflow=${tool.workflow}#${tool.fragment}`;
  }
  return `${prefix}/tools/${tool.slug}/`;
}

export function toolSidebarGroups() {
  return toolGroups.map((group) => ({
    label: group.label.en,
    translations: { 'zh-CN': group.label.zh },
    collapsed: true,
    items: group.tools.map((tool) =>
      tool.workflow
        ? {
            label: tool.label.en,
            translations: { 'zh-CN': tool.label.zh },
            link: toolHref(tool),
          }
        : {
            label: tool.label.en,
            translations: { 'zh-CN': tool.label.zh },
            slug: `tools/${tool.slug}`,
          }
    ),
  }));
}
