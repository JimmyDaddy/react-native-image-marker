import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : fileURLToPath(new URL('../lib/module/', import.meta.url));
const declarationDirectories = [
  moduleDirectory,
  ...process.argv.slice(3).map((directory) => resolve(process.cwd(), directory)),
];

async function listFiles(directory, predicate) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path, predicate) : path;
    })
  );

  return files.flat().filter(predicate);
}

function addJavaScriptExtension(specifier) {
  if (!specifier.startsWith('.') || extname(specifier)) {
    return specifier;
  }

  return `${specifier}.js`;
}

function normalizeRelativeSpecifiers(source) {
  return source
    .replace(
      /(\bfrom\s+['"])([^'"]+)(['"])/g,
      (_, prefix, specifier, suffix) =>
        `${prefix}${addJavaScriptExtension(specifier)}${suffix}`
    )
    .replace(
      /(\bimport\s*\(\s*['"])([^'"]+)(['"]\s*\))/g,
      (_, prefix, specifier, suffix) =>
        `${prefix}${addJavaScriptExtension(specifier)}${suffix}`
    );
}

for (const file of await listFiles(moduleDirectory, (path) =>
  path.endsWith('.js')
)) {
  const source = await readFile(file, 'utf8');
  const normalized = normalizeRelativeSpecifiers(source);
  if (normalized !== source) {
    await writeFile(file, normalized);
  }
}

for (const directory of new Set(declarationDirectories)) {
  for (const file of await listFiles(directory, (path) =>
    path.endsWith('.d.ts')
  )) {
    const source = await readFile(file, 'utf8');
    const normalized = normalizeRelativeSpecifiers(source);
    if (normalized !== source) {
      await writeFile(file, normalized);
    }
  }
}

await writeFile(join(moduleDirectory, 'package.json'), '{"type":"module"}\n');
