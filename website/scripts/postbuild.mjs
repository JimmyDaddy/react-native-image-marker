import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const outputRoot = new URL('../dist/', import.meta.url);
const base = '';

const redirects = new Map([
  ['classes/Marker.html', '/api/classes/marker/'],
  ['enums/ImageFormat.html', '/api/enumerations/imageformat/'],
  ['enums/Position.html', '/api/enumerations/position/'],
  ['enums/RotationCanvasMode.html', '/api/enumerations/rotationcanvasmode/'],
  ['enums/TextBackgroundType.html', '/api/enumerations/textbackgroundtype/'],
  ['hierarchy.html', '/api/'],
  ['modules.html', '/api/'],
  ['usage-guide.html', '/cookbook/'],
  ['v1.0.x/index.html', '/migration/'],
]);

for (const typeName of [
  'CornerRadius',
  'ImageMarkOptions',
  'ImageOptions',
  'ImageWatermarkLayer',
  'MarkOptions',
  'PositionOptions',
  'RadiusValue',
  'ShadowLayerStyle',
  'TextBackgroundStyle',
  'TextMarkOptions',
  'TextOptions',
  'TextStyle',
  'TextWatermarkLayer',
  'WatermarkImageOptions',
]) {
  redirects.set(
    `interfaces/${typeName}.html`,
    `/api/interfaces/${typeName.toLowerCase()}/`
  );
}

redirects.set('types/WatermarkLayer.html', '/api/type-aliases/watermarklayer/');

async function writeRedirect(legacyPath, targetPath) {
  const destination = join(outputRoot.pathname, legacyPath);
  const target = `${base}${targetPath}`;
  const escapedTarget = JSON.stringify(target);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <link rel="canonical" href="https://mage-marker.corerobin.com${target}">
    <meta http-equiv="refresh" content="0; url=${target}">
    <title>Documentation moved</title>
  </head>
  <body>
    <p>This page moved to <a href="${target}">the current documentation</a>.</p>
    <script>location.replace(${escapedTarget} + location.search + location.hash.toLowerCase());</script>
  </body>
</html>
`;

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html, 'utf8');
}

for (const [legacyPath, targetPath] of redirects) {
  await writeRedirect(legacyPath, targetPath);
  await writeRedirect(`react-native-image-marker/${legacyPath}`, targetPath);
}

await writeRedirect('react-native-image-marker/index.html', '/');
