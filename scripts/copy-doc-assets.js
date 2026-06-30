const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const latestDir = path.join(root, 'docs', 'latest');
const outDir = path.join(root, 'docs', 'latest', 'media');
const docs = ['README.MD', path.join('docs', 'usage-guide.md')];
const assets = new Set();

fs.mkdirSync(outDir, { recursive: true });

for (const doc of docs) {
  const docPath = path.join(root, doc);
  if (!fs.existsSync(docPath)) {
    continue;
  }

  const content = fs.readFileSync(docPath, 'utf8');
  const assetMatches = content.matchAll(
    /(?:src=["']|\]\()(?:\.\.\/)?assets\/([^"')\s]+)/g
  );

  for (const match of assetMatches) {
    assets.add(match[1]);
  }
}

for (const asset of assets) {
  const source = path.join(root, 'assets', asset);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing docs asset: ${source}`);
  }

  fs.copyFileSync(source, path.join(outDir, path.basename(asset)));
}

const usageGuideSource = path.join(root, 'docs', 'usage-guide.md');
if (!fs.existsSync(usageGuideSource)) {
  throw new Error(`Missing usage guide: ${usageGuideSource}`);
}

const staleUsageGuideMedia = path.join(outDir, 'usage-guide.md');
if (fs.existsSync(staleUsageGuideMedia)) {
  fs.unlinkSync(staleUsageGuideMedia);
}

const usageGuide = fs
  .readFileSync(usageGuideSource, 'utf8')
  .replaceAll('../assets/', 'media/');
fs.writeFileSync(
  path.join(latestDir, 'usage-guide.md'),
  `---\nlayout: default\ntitle: Usage Guide\n---\n\n${usageGuide}`
);

const latestIndexPath = path.join(latestDir, 'index.html');
if (fs.existsSync(latestIndexPath)) {
  const latestIndex = fs
    .readFileSync(latestIndexPath, 'utf8')
    .replaceAll('href="media/usage-guide.md"', 'href="usage-guide.html"');
  fs.writeFileSync(latestIndexPath, latestIndex);
}
