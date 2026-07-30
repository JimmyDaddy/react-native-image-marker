import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [manifestSource, outputSource, exportName] = process.argv.slice(2);
if (!manifestSource || !outputSource || !exportName) {
  throw new Error(
    'Usage: generate-package-version.mjs <package.json> <output.ts> <EXPORT_NAME>'
  );
}
if (!/^[A-Z][A-Z0-9_]*$/.test(exportName)) {
  throw new Error(`Invalid version export name "${exportName}".`);
}

const manifestPath = resolve(manifestSource);
const outputPath = resolve(outputSource);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (
  typeof manifest.version !== 'string' ||
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)
) {
  throw new Error(`${manifestPath} does not contain a valid version.`);
}

await writeFile(
  outputPath,
  `// Generated from package.json by scripts/generate-package-version.mjs.\nexport const ${exportName} = '${manifest.version}';\n`
);
