import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

const repository = 'https://github.com/JimmyDaddy/react-native-image-marker';

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
  integrations: [
    starlight({
      title: 'React Native Image Marker',
      description:
        'Add text and image watermarks on iOS, Android, and the web.',
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
      favicon: '/favicon.png',
      customCss: [
        './src/styles/custom.css',
        './src/styles/preference-menu.css',
      ],
      components: {
        Header: './src/components/Header.astro',
        LanguageSelect: './src/components/LanguageSelect.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
        PageTitle: './src/components/PageTitle.astro',
      },
      editLink: {
        baseUrl: `${repository}/edit/master/website/`,
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
            content:
              'https://image-marker.corerobin.com/media/watermark-after-dark.jpg',
          },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:width', content: '1586' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:height', content: '992' },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:alt',
            content:
              'A multi-layer watermark composition made with React Native Image Marker',
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
            content:
              'https://image-marker.corerobin.com/media/watermark-after-dark.jpg',
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
            gitRevision: 'master',
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
