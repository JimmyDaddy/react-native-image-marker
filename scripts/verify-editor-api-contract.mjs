import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const editorRoot = join(repositoryRoot, 'packages/editor');
const contract = JSON.parse(
  await readFile(join(editorRoot, 'api-contract.json'), 'utf8')
);
const manifest = JSON.parse(
  await readFile(join(editorRoot, 'package.json'), 'utf8')
);

function assertEqual(label, actual, expected) {
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();
  if (
    normalizedActual.length !== normalizedExpected.length ||
    normalizedActual.some((value, index) => value !== normalizedExpected[index])
  ) {
    throw new Error(
      `${label} changed.\nExpected: ${normalizedExpected.join(
        ', '
      )}\nActual:   ${normalizedActual.join(', ')}`
    );
  }
}

assertEqual(
  'Editor package export map',
  Object.keys(manifest.exports ?? {}),
  contract.packageExports
);

for (const [name, range] of Object.entries(contract.peerDependencies)) {
  if (manifest.peerDependencies?.[name] !== range) {
    throw new Error(
      `Editor peer dependency ${name} must remain ${range}; received ${
        manifest.peerDependencies?.[name] ?? 'missing'
      }.`
    );
  }
}

for (const [name, range] of Object.entries(contract.dependencies ?? {})) {
  if (manifest.dependencies?.[name] !== range) {
    throw new Error(
      `Editor dependency ${name} must remain ${range}; received ${
        manifest.dependencies?.[name] ?? 'missing'
      }.`
    );
  }
}

const rootNames = Object.values(contract.entries).map(({ source }) =>
  join(editorRoot, source)
);
const program = ts.createProgram(rootNames, {
  jsx: ts.JsxEmit.ReactJSX,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  skipLibCheck: true,
  target: ts.ScriptTarget.ESNext,
});
const checker = program.getTypeChecker();

for (const [subpath, entry] of Object.entries(contract.entries)) {
  const filename = join(editorRoot, entry.source);
  const sourceFile = program.getSourceFile(filename);
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
  if (!sourceFile || !moduleSymbol) {
    throw new Error(`Unable to inspect Editor API source ${entry.source}.`);
  }

  const values = [];
  const types = [];
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const target =
      exported.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(exported)
        : exported;
    if (target.flags & ts.SymbolFlags.Value) {
      values.push(exported.name);
    } else {
      types.push(exported.name);
    }
  }

  assertEqual(`${subpath} runtime exports`, values, entry.values);
  assertEqual(`${subpath} type exports`, types, entry.types);
}

await Promise.all([
  access(join(editorRoot, 'lib/module/index.d.ts')),
  access(join(editorRoot, 'lib/module/core-adapter.d.ts')),
  access(join(editorRoot, 'lib/commonjs/index.js')),
  access(join(editorRoot, 'lib/commonjs/core-adapter.js')),
]);

process.stdout.write(
  'Verified Editor export map, peer ranges, runtime/type API contract, and build artifacts.\n'
);
