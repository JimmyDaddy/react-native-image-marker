# Web SDK example

This is a minimal strict TypeScript + Vite consumer. It imports only public
`@image-marker/web` entries and keeps the selected `File` in the browser.

After publishing, install the versioned package normally:

```sh
npm install
npm run build
npm run dev
```

To test local package tarballs after building them from the repository, install
both the Web SDK and its Recipe dependency:

```sh
npm install \
  /absolute/path/to/image-marker-recipe-0.1.0.tgz \
  /absolute/path/to/image-marker-web-0.1.0.tgz
npm run build
```

The example checks strict declarations with `skipLibCheck: false`, uses Vite's
`?url` Worker import, demonstrates `File` input and `Blob` output, and shows
where an `AbortSignal` belongs. It does not use aliases, TypeScript paths, or
sibling source imports.
