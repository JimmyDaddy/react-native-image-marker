# Documentation site

The public website is built with Astro Starlight. API pages are generated from `../src/index.ts` during each build.
English is served from the site root, and Simplified Chinese content in `src/content/docs/zh-cn/` is served from `/zh-cn/`.

```sh
npm install
npm run dev
```

Run the production validation before opening a pull request:

```sh
npm run build
```

The output is written to `dist/`. Legacy TypeDoc URLs are added after the Astro build so existing links continue to reach the current API reference.
