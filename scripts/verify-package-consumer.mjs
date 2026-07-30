import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
    await readFile(join(repositoryRoot, 'packages/editor/package.json'), 'utf8')
  );
  const expectedRecipeManifest = JSON.parse(
    await readFile(join(repositoryRoot, 'packages/recipe/package.json'), 'utf8')
  );
  const expectedNodeManifest = JSON.parse(
    await readFile(join(repositoryRoot, 'packages/node/package.json'), 'utf8')
  );
  const coreTarball = pack('.');
  const editorTarball = pack('./packages/editor');
  const nodeTarball = pack('./packages/node');
  const recipeTarball = pack('./packages/recipe');
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
    nodeTarball,
    recipeTarball,
  ]);
  run('npm', ['audit', '--omit=dev', '--audit-level=moderate']);

  run('node', [
    '-e',
    [
      "const core = require('react-native-image-marker');",
      "if (core.ImageFormat.webp !== 'webp') process.exit(1);",
    ].join(''),
  ]);

  const nodeManifest = JSON.parse(
    await readFile(
      join(consumerDirectory, 'node_modules/@image-marker/node/package.json'),
      'utf8'
    )
  );
  if (
    nodeManifest.version !== expectedNodeManifest.version ||
    nodeManifest.dependencies?.['@image-marker/recipe'] !== '^0.1.0' ||
    nodeManifest.peerDependencies?.sharp !== '>=0.33.0' ||
    nodeManifest.dependencies?.react ||
    nodeManifest.dependencies?.['react-native'] ||
    nodeManifest.peerDependencies?.react ||
    nodeManifest.peerDependencies?.['react-native']
  ) {
    throw new Error(
      'The packed Node manifest has an invalid version or dependency graph.'
    );
  }
  run('node', [
    '-e',
    [
      "const node = require('@image-marker/node');",
      "if(typeof node.createNodeImageMarker!=='function') process.exit(1);",
      'if(node.WATERMARK_RECIPE_SCHEMA_VERSION!==2) process.exit(1);',
    ].join(''),
  ]);
  run('node', [
    '--input-type=module',
    '-e',
    [
      "const node = await import('@image-marker/node');",
      "if(typeof node.createNodeImageMarker!=='function') process.exit(1);",
      'if(node.WATERMARK_RECIPE_SCHEMA_VERSION!==2) process.exit(1);',
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

  const recipeManifest = JSON.parse(
    await readFile(
      join(consumerDirectory, 'node_modules/@image-marker/recipe/package.json'),
      'utf8'
    )
  );
  if (
    recipeManifest.version !== expectedRecipeManifest.version ||
    recipeManifest.dependencies ||
    recipeManifest.exports?.['./schema.json'] !== './recipe.schema.json'
  ) {
    throw new Error(
      'The packed Recipe manifest has an invalid version, schema export, or runtime dependency graph.'
    );
  }
  const recipeSchema = JSON.parse(
    await readFile(
      join(
        consumerDirectory,
        'node_modules/@image-marker/recipe/recipe.schema.json'
      ),
      'utf8'
    )
  );
  if (recipeSchema.properties?.schemaVersion?.const !== 2) {
    throw new Error('The packed Recipe JSON Schema is missing or invalid.');
  }
  run('node', [
    '-e',
    [
      "const recipe = require('@image-marker/recipe');",
      'const value = recipe.createWatermarkRecipeDefinition({layers:[{type:"text",text:"Hello"}]});',
      'if (value.layers[0]?.id !== "layer-1") process.exit(1);',
    ].join(''),
  ]);
  run('node', [
    '--input-type=module',
    '-e',
    [
      "const recipe = await import('@image-marker/recipe');",
      'const value = recipe.createWatermarkRecipeDefinition({layers:[{type:"text",text:"Hello"}]});',
      'if (value.layers[0]?.id !== "layer-1") process.exit(1);',
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
    editorManifest.peerDependencies?.['react-native-image-marker'] !==
      expectedEditorManifest.peerDependencies?.['react-native-image-marker'] ||
    editorManifest.dependencies?.['@image-marker/recipe'] !==
      expectedEditorManifest.dependencies?.['@image-marker/recipe']
  ) {
    throw new Error(
      'The packed Editor manifest has an invalid version or dependency graph.'
    );
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
    ].join(''),
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
  ImageMarkerEditor,
  ImageMarkerEditorAssetPanel,
  ImageMarkerEditorController,
  ImageMarkerEditorInspector,
  ImageMarkerEditorLayerPanel,
  ImageMarkerEditorToolbar,
  createEditorTemplate,
  type ImageMarkerEditorProps,
  type ImageMarkerEditorToolbarProps,
  type EditorRenderRequest,
} from 'react-native-image-marker-editor';
import { createCoreEditorAdapter } from 'react-native-image-marker-editor/core-adapter';
import { createInvisibleWatermarkRuntime } from 'react-native-image-marker/trace-runtime';
import {
  createNodeImageMarker,
  type NodeRenderResult,
} from '@image-marker/node';
import {
  createWatermarkRecipeDefinition,
  type WatermarkRecipeDefinition as SharedRecipeDefinition,
} from '@image-marker/recipe';

const definition: WatermarkRecipeDefinition = {
  schemaVersion: 2,
  layers: [{ id: 'title', type: 'text', text: 'Hello' }],
  output: { saveFormat: ImageFormat.png },
};
const sharedDefinition: SharedRecipeDefinition =
  createWatermarkRecipeDefinition(definition);
const result: Promise<MarkerResult> = Marker.createRecipe(definition).apply(
  { backgroundImage: { src: '/source.png' } },
  { timeoutMs: 5_000 }
);
const editor = new ImageMarkerEditorController(definition);
const adapter = createCoreEditorAdapter();
const editorProps: ImageMarkerEditorProps = {
  adapter,
  controller: editor,
  source: '/source.png',
  testID: 'consumer-editor',
  width: 360,
  height: 240,
};
const toolbarProps: ImageMarkerEditorToolbarProps = {
  controller: editor,
  testID: 'consumer-toolbar',
};
const request: EditorRenderRequest = {
  recipe: editor.exportRecipe(),
  input: { backgroundImage: { src: '/source.png' } },
};
const nodeRenderer = createNodeImageMarker();
const nodeResult: Promise<NodeRenderResult> = nodeRenderer.render(
  definition,
  { backgroundImage: { src: Buffer.from('fixture') } }
);
void result;
void sharedDefinition;
void ImageMarkerEditor;
void ImageMarkerEditorAssetPanel;
void ImageMarkerEditorInspector;
void ImageMarkerEditorLayerPanel;
void ImageMarkerEditorToolbar;
void createEditorTemplate;
void adapter;
void editorProps;
void toolbarProps;
void request;
void createInvisibleWatermarkRuntime;
void nodeResult;
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
    'Verified packed Recipe, Core, Editor, and Node CommonJS/ESM, peer metadata, and consumer types.\n'
  );
} finally {
  await rm(consumerDirectory, { recursive: true, force: true });
}
