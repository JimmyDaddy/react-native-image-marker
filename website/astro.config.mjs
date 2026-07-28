import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';
import { fileURLToPath } from 'node:url';

const repository = 'https://github.com/JimmyDaddy/react-native-image-marker';
const docsGitRef = process.env.DOCS_GIT_REF || 'master';

const apiSidebarLabels = new Map([
  ['API reference', 'API 参考'],
  ['Classes', '类'],
  ['Enumerations', '枚举'],
  ['Interfaces', '接口'],
  ['Type Aliases', '类型别名'],
]);

const localizeTypeDocSidebar = {
  name: 'localize-typedoc-sidebar',
  hooks: {
    'config:setup'({ config, updateConfig }) {
      const localizeItems = (items = []) =>
        items.map((item) => {
          if (typeof item === 'string' || !('items' in item)) {
            return item;
          }

          const translation = apiSidebarLabels.get(item.label);

          return {
            ...item,
            ...(translation
              ? {
                  translations: {
                    ...item.translations,
                    'zh-CN': translation,
                  },
                }
              : {}),
            items: localizeItems(item.items),
          };
        });

      updateConfig({ sidebar: localizeItems(config.sidebar) });
    },
  },
};

export default defineConfig({
  site: 'https://image-marker.corerobin.com',
  base: '/',
  trailingSlash: 'always',
  vite: {
    resolve: {
      alias: {
        'react-native-image-marker': fileURLToPath(
          new URL('../src/index.ts', import.meta.url)
        ),
      },
    },
  },
  integrations: [
    starlight({
      title: 'React Native Image Marker',
      description:
        'Add text and image watermarks on iOS, Android, and the web.',
      logo: {
        src: '../assets/logo.svg',
        alt: 'React Native Image Marker logo',
      },
      defaultLocale: 'root',
      locales: {
        'root': {
          label: 'English',
          lang: 'en',
        },
        'zh-cn': {
          label: '简体中文',
          lang: 'zh-CN',
        },
      },
      favicon: '/favicon.svg',
      customCss: [
        './src/styles/custom.css',
        './src/styles/preference-menu.css',
      ],
      components: {
        Banner: './src/components/VersionBanner.astro',
        Header: './src/components/Header.astro',
        LanguageSelect: './src/components/LanguageSelect.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
        PageTitle: './src/components/PageTitle.astro',
      },
      editLink: {
        baseUrl: `${repository}/edit/${docsGitRef}/website/`,
      },
      lastUpdated: true,
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: repository,
        },
      ],
      head: [
        {
          tag: 'meta',
          attrs: { property: 'og:type', content: 'website' },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: 'https://image-marker.corerobin.com/social-preview.png',
          },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:width', content: '1200' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:height', content: '630' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:type', content: 'image/png' },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:alt',
            content: 'React Native Image Marker logo and product summary',
          },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image',
            content: 'https://image-marker.corerobin.com/social-preview.png',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image:alt',
            content: 'React Native Image Marker logo and product summary',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'theme-color',
            content: '#3156d9',
          },
        },
      ],
      plugins: [
        starlightTypeDoc({
          entryPoints: ['../src/index.ts'],
          tsconfig: './tsconfig.typedoc.json',
          output: 'api',
          pagination: false,
          sidebar: {
            label: 'API reference',
            collapsed: true,
          },
          typeDoc: {
            excludeExternals: true,
            excludePrivate: true,
            gitRevision: docsGitRef,
            plugin: ['typedoc-plugin-rename-defaults'],
            readme: 'none',
          },
        }),
        localizeTypeDocSidebar,
      ],
      sidebar: [
        {
          label: 'Start here',
          translations: { 'zh-CN': '开始使用' },
          items: [
            {
              label: 'Overview',
              translations: { 'zh-CN': '概览' },
              slug: 'index',
            },
            {
              label: 'Live playground',
              translations: { 'zh-CN': '在线体验' },
              slug: 'playground',
            },
            {
              label: 'Installation',
              translations: { 'zh-CN': '安装' },
              slug: 'getting-started',
            },
            {
              label: 'Compatibility',
              translations: { 'zh-CN': '兼容性' },
              slug: 'compatibility',
            },
          ],
        },
        {
          label: 'Online tools',
          translations: { 'zh-CN': '在线工具' },
          collapsed: true,
          items: [
            {
              label: 'All tools',
              translations: { 'zh-CN': '全部工具' },
              slug: 'tools',
            },
            {
              label: 'Watermark an image',
              translations: { 'zh-CN': '图片加水印' },
              slug: 'tools/watermark',
            },
            {
              label: 'Batch watermark',
              translations: { 'zh-CN': '批量加水印' },
              slug: 'tools/batch-watermark',
            },
            {
              label: 'Confidential watermark',
              translations: { 'zh-CN': '保密水印' },
              slug: 'tools/confidential-watermark',
            },
            {
              label: 'Invisible watermark',
              translations: { 'zh-CN': '嵌入隐形水印' },
              slug: 'tools/invisible-watermark',
            },
            {
              label: 'Trace checker',
              translations: { 'zh-CN': '检查追踪水印' },
              slug: 'tools/trace-checker',
            },
            {
              label: 'Recipe builder',
              translations: { 'zh-CN': 'Recipe 构建器' },
              slug: 'tools/recipe-builder',
            },
            {
              label: 'Interaction editor',
              translations: { 'zh-CN': '交互式图层编辑器' },
              link: '/playground/?workflow=editor#editor-playground',
            },
            {
              label: 'Recipient trace package',
              translations: { 'zh-CN': '收件人追踪包' },
              slug: 'tools/recipient-trace-package',
            },
            {
              label: 'Trace robustness lab',
              translations: { 'zh-CN': '追踪稳健性实验室' },
              slug: 'tools/trace-lab',
            },
            {
              label: 'Content Credentials',
              translations: { 'zh-CN': 'Content Credentials 检查器' },
              slug: 'tools/content-credentials',
            },
          ],
        },
        {
          label: 'Guides',
          translations: { 'zh-CN': '指南' },
          items: [
            {
              label: 'Choose an API',
              translations: { 'zh-CN': '选择 API' },
              slug: 'guides/choose-an-api',
            },
            {
              label: 'Position and style',
              translations: { 'zh-CN': '定位与样式' },
              slug: 'guides/position-and-style',
            },
            {
              label: 'Output and image quality',
              translations: { 'zh-CN': '输出与图像质量' },
              slug: 'guides/output-and-quality',
            },
            {
              label: 'Performance and job control',
              translations: { 'zh-CN': '性能与任务控制' },
              slug: 'guides/performance-and-jobs',
            },
            {
              label: 'Invisible trace watermarks',
              translations: { 'zh-CN': '隐形追踪水印' },
              slug: 'guides/invisible-watermarks',
            },
            {
              label: 'Optional interaction editor',
              translations: { 'zh-CN': '可选交互编辑器' },
              slug: 'guides/editor',
            },
            {
              label: 'Visual cookbook',
              translations: { 'zh-CN': '可视化示例' },
              slug: 'cookbook',
            },
          ],
        },
        {
          label: 'Help',
          translations: { 'zh-CN': '帮助' },
          items: [
            {
              label: 'Troubleshooting',
              translations: { 'zh-CN': '故障排查' },
              slug: 'troubleshooting',
            },
            {
              label: 'Versions and migration',
              translations: { 'zh-CN': '版本与迁移' },
              slug: 'migration',
            },
            {
              label: 'Versions and support',
              translations: { 'zh-CN': '版本与支持政策' },
              slug: 'support-policy',
            },
            {
              label: 'Sitemap',
              translations: { 'zh-CN': '网站地图' },
              slug: 'sitemap',
            },
          ],
        },
        typeDocSidebarGroup,
      ],
    }),
  ],
});
