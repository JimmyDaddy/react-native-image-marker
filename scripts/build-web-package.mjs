// Compile a closed graph from the authoritative Core and Editor sources.
// The temporary tree is generated, never a second maintained implementation.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(root, 'packages/web');
// Keep staging beneath the workspace so external recipe resolution is normal
// Node resolution. No aliases or paths are required by the published package.
const staging = await mkdtemp(path.join(packageRoot, '.build-'));
const sources = new Map();
const entries = ['index', 'headless', 'editor-adapter'];

function destination(filename) {
  for (const [directory, prefix] of [
    ['packages/web/src', ''],
    ['packages/editor/src', 'editor'],
    ['src', 'core'],
  ]) {
    const relative = path.relative(path.join(root, directory), filename);
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
      return path.join(staging, prefix, relative);
    }
  }
  throw new Error(`Source escaped the Web SDK source graph: ${filename}`);
}

function resolveSource(from, specifier) {
  const base = path.resolve(path.dirname(from), specifier.replace(/\.js$/, ''));
  const found = [`${base}.ts`, path.join(base, 'index.ts')].find(existsSync);
  if (!found) throw new Error(`Cannot resolve ${specifier} from ${from}`);
  return found;
}

async function visit(filename) {
  if (sources.has(filename)) return;
  if (
    /\.native\.|NativeImageMarker|EditorSurface|EditorPanels/.test(filename)
  ) {
    throw new Error(`Native/UI source entered the Web SDK graph: ${filename}`);
  }
  const original = await readFile(filename, 'utf8');
  sources.set(filename, createHash('sha256').update(original).digest('hex'));
  // This is the sole platform binding. Both builds retain Core's migration,
  // normalization and validation wrapper, not just recipe schema migration.
  let source =
    filename === path.join(root, 'packages/editor/src/core-contract.ts')
      ? "export * from '../../../src/index';\nexport { default } from '../../../src/index';\n"
      : original;
  const imports = ts.preProcessFile(source, true, true).importedFiles;
  const replacements = [];
  for (const imported of imports) {
    const specifier = imported.fileName;
    if (!specifier.startsWith('.')) {
      if (specifier !== '@image-marker/recipe') {
        throw new Error(`Forbidden dependency ${specifier} in ${filename}`);
      }
      continue;
    }
    const resolved = resolveSource(filename, specifier);
    await visit(resolved);
    let relative = path
      .relative(path.dirname(destination(filename)), destination(resolved))
      .split(path.sep)
      .join('/')
      .replace(/\.ts$/, '.js');
    if (!relative.startsWith('.')) relative = `./${relative}`;
    // preProcessFile's positions start at the quote and end before the final character.
    replacements.push({
      start: imported.pos + 1,
      end: imported.end + 1,
      value: relative,
    });
  }
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    source =
      source.slice(0, replacement.start) +
      replacement.value +
      source.slice(replacement.end);
  }
  await mkdir(path.dirname(destination(filename)), { recursive: true });
  await writeFile(destination(filename), source);
}

try {
  for (const entry of entries)
    await visit(path.join(packageRoot, 'src', `${entry}.ts`));
  const output = path.join(packageRoot, 'lib');
  await rm(output, { recursive: true, force: true });
  for (const [directory, module, type] of [
    ['module', ts.ModuleKind.ES2020, 'module'],
    ['commonjs', ts.ModuleKind.CommonJS, 'commonjs'],
  ]) {
    const program = ts.createProgram(
      entries.map((entry) => path.join(staging, `${entry}.ts`)),
      {
        target: ts.ScriptTarget.ES2020,
        module,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'],
        types: [],
        strict: true,
        skipLibCheck: false,
        esModuleInterop: true,
        noUncheckedIndexedAccess: true,
        declaration: true,
        rootDir: staging,
        outDir: path.join(output, directory),
      }
    );
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length)
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext(diagnostics, {
          getCurrentDirectory: () => root,
          getCanonicalFileName: (name) => name,
          getNewLine: () => '\n',
        })
      );
    if (program.emit().emitSkipped)
      throw new Error(`Web SDK ${directory} emit failed.`);
    await writeFile(
      path.join(output, directory, 'package.json'),
      JSON.stringify({ type }) + '\n'
    );
  }
  execFileSync(
    process.execPath,
    [
      path.join(root, 'scripts/build-invisible-worker.mjs'),
      path.join(output, 'worker/invisible-watermark.js'),
    ],
    { stdio: 'inherit' }
  );
  await writeFile(
    path.join(output, 'source-manifest.json'),
    JSON.stringify(
      {
        description:
          'Generated from shared authoritative sources; editor/core-contract uses the Web Core binding.',
        sources: Object.fromEntries(
          [...sources]
            .map(([name, hash]) => [
              path.relative(root, name).split(path.sep).join('/'),
              hash,
            ])
            .sort()
        ),
      },
      null,
      2
    ) + '\n'
  );
  console.log(
    `Built standalone Web SDK from ${sources.size} shared source modules (ESM, CJS, strict declarations, Worker).`
  );
} finally {
  await rm(staging, { recursive: true, force: true });
}
