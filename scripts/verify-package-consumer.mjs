import { execFileSync } from 'node:child_process';
import {
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..'
);
const consumerDirectory = await mkdtemp(
  join(tmpdir(), 'image-marker-consumer-')
);

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: consumerDirectory,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    ...options,
  });
}

function pack(packagePath) {
  const output = execFileSync(
    'npm',
    [
      'pack',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      consumerDirectory,
      packagePath,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' }
  );
  const result = JSON.parse(output);
  const filename = result[0]?.filename;
  if (!filename) {
    throw new Error(`npm pack did not report a tarball for ${packagePath}.`);
  }
  return join(consumerDirectory, filename);
}

try {
  const expectedEditorManifest = JSON.parse(
    await readFile(
      join(repositoryRoot, 'packages/editor/package.json'),
      'utf8'
    )
  );
  const coreTarball = pack('.');
  const editorTarball = pack('./packages/editor');
  await writeFile(
    join(consumerDirectory, 'package.json'),
    JSON.stringify(
      {
        name: 'image-marker-consumer-fixture',
        private: true,
        type: 'module',
      },
      null,
      2
    )
  );
  run('npm', [
    'install',
    '--ignore-scripts',
    '--legacy-peer-deps',
    coreTarball,
    editorTarball,
  ]);
  run('npm', ['audit', '--omit=dev', '--audit-level=moderate']);

  run('node', [
    '-e',
    [
      "const core = require('react-native-image-marker');",
      "if (core.ImageFormat.webp !== 'webp') process.exit(1);",
    ].join(''),
  ]);
  run('node', [
    '--input-type=module',
    '-e',
    [
      "const core = await import('react-native-image-marker');",
      "if (core.ImageFormat.webp !== 'webp') process.exit(1);",
    ].join(''),
  ]);

  const editorManifest = JSON.parse(
    await readFile(
      join(
        consumerDirectory,
        'node_modules/react-native-image-marker-editor/package.json'
      ),
      'utf8'
    )
  );
  if (
    editorManifest.version !== expectedEditorManifest.version ||
    editorManifest.peerDependencies?.['react-native-image-marker'] !== '^2.0.0'
  ) {
    throw new Error('The packed Editor manifest has an invalid version or Core peer range.');
  }

  run('node', [
    '--input-type=module',
    '-e',
    [
      "const { pathToFileURL } = await import('node:url');",
      "const { resolve } = await import('node:path');",
      "const url = pathToFileURL(resolve('node_modules/react-native-image-marker-editor/lib/module/controller.js'));",
      'const { ImageMarkerEditorController } = await import(url);',
      "const editor = new ImageMarkerEditorController({schemaVersion:2,layers:[{id:'title',type:'text',text:'Hello'}],output:{}});",
      "if (editor.exportRecipe().layers[0]?.id !== 'title') process.exit(1);",
    ].join('')
  ]);
  run('node', [
    '-e',
    [
      "const { ImageMarkerEditorController } = require('./node_modules/react-native-image-marker-editor/lib/commonjs/controller.js');",
      "const editor = new ImageMarkerEditorController({schemaVersion:2,layers:[{id:'title',type:'text',text:'Hello'}],output:{}});",
      "if (editor.exportRecipe().layers[0]?.id !== 'title') process.exit(1);",
    ].join(''),
  ]);

  for (const peer of ['react', 'react-native']) {
    await symlink(
      join(repositoryRoot, 'node_modules', peer),
      join(consumerDirectory, 'node_modules', peer),
      'junction'
    );
  }

  await writeFile(
    join(consumerDirectory, 'consumer.ts'),
    `import Marker, {
  ImageFormat,
  type MarkerResult,
  type WatermarkRecipeDefinition,
} from 'react-native-image-marker';
import {
  ImageMarkerEditorController,
  type EditorRenderRequest,
} from 'react-native-image-marker-editor';
import { createInvisibleWatermarkRuntime } from 'react-native-image-marker/trace-runtime';

const definition: WatermarkRecipeDefinition = {
  schemaVersion: 2,
  layers: [{ id: 'title', type: 'text', text: 'Hello' }],
  output: { saveFormat: ImageFormat.png },
};
const result: Promise<MarkerResult> = Marker.createRecipe(definition).apply(
  { backgroundImage: { src: '/source.png' } },
  { timeoutMs: 5_000 }
);
const editor = new ImageMarkerEditorController(definition);
const request: EditorRenderRequest = {
  recipe: editor.exportRecipe(),
  input: { backgroundImage: { src: '/source.png' } },
};
void result;
void request;
void createInvisibleWatermarkRuntime;
`
  );
  await writeFile(
    join(consumerDirectory, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          esModuleInterop: true,
          jsx: 'react-jsx',
          lib: ['esnext', 'dom'],
          module: 'esnext',
          moduleResolution: 'bundler',
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: 'esnext',
          typeRoots: [join(repositoryRoot, 'node_modules/@types')],
        },
        files: ['consumer.ts'],
      },
      null,
      2
    )
  );
  run(join(repositoryRoot, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.json']);

  process.stdout.write(
    'Verified packed Core CommonJS/ESM, Editor CommonJS/ESM, peer metadata, and consumer types.\n'
  );
} finally {
  await rm(consumerDirectory, { recursive: true, force: true });
}
