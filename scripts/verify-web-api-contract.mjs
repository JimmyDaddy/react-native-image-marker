import assert from 'node:assert/strict';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(root, 'packages/web');
const manifest = JSON.parse(
  await readFile(path.join(webRoot, 'package.json'), 'utf8')
);
const entries = {
  '.': 'index',
  './headless': 'headless',
  './editor-adapter': 'editor-adapter',
};
const program = ts.createProgram(
  Object.values(entries).map((entry) =>
    path.join(webRoot, 'lib/module', `${entry}.d.ts`)
  ),
  {
    strict: true,
    skipLibCheck: false,
    types: [],
    target: ts.ScriptTarget.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
  }
);
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(
  diagnostics.length,
  0,
  diagnostics
    .map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n'))
    .join('\n')
);
const checker = program.getTypeChecker();
const actual = {
  packageExports: Object.keys(manifest.exports),
  dependencies: manifest.dependencies,
  peerDependencies: manifest.peerDependencies ?? {},
  entries: {},
};
for (const [subpath, entry] of Object.entries(entries)) {
  const filename = path.join(webRoot, 'lib/module', `${entry}.d.ts`);
  const source = program.getSourceFile(filename);
  const symbol = source && checker.getSymbolAtLocation(source);
  assert(symbol, `Missing ${entry} declaration module`);
  const values = [];
  const types = [];
  for (const exported of checker.getExportsOfModule(symbol)) {
    const target =
      exported.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(exported)
        : exported;
    (target.flags & ts.SymbolFlags.Value ? values : types).push(exported.name);
  }
  actual.entries[subpath] = { values: values.sort(), types: types.sort() };
  for (const format of ['module', 'commonjs']) {
    await access(path.join(webRoot, 'lib', format, `${entry}.js`));
    await access(path.join(webRoot, 'lib', format, `${entry}.d.ts`));
  }
}
assert.deepEqual(actual.dependencies, { '@image-marker/recipe': '^0.1.0' });
assert.deepEqual(actual.peerDependencies, {});
for (const legacyPackage of ['package.json', 'packages/editor/package.json']) {
  const legacy = JSON.parse(
    await readFile(path.join(root, legacyPackage), 'utf8')
  );
  assert(
    !legacy.dependencies?.[manifest.name],
    `${legacy.name} must not start depending on the independent Web package`
  );
}
assert(
  !actual.entries['./headless'].values.some((name) =>
    /^(?:useImage|ImageMarkerEditor(?:Toolbar|Inspector|LayerPanel|AssetPanel)?$)/.test(
      name
    )
  )
);
await access(path.join(webRoot, manifest.exports['./worker']));
const contractPath = path.join(webRoot, 'api-contract.json');
if (process.argv.includes('--update')) {
  await writeFile(contractPath, JSON.stringify(actual, null, 2) + '\n');
  console.log('Updated Web SDK API contract; review its diff before delivery.');
} else {
  const expected = JSON.parse(await readFile(contractPath, 'utf8'));
  assert.deepEqual(actual, expected, 'Web SDK public API contract changed');
  console.log(
    'Verified Web SDK exports, strict self-contained declarations, dependency boundary and API contract.'
  );
}
