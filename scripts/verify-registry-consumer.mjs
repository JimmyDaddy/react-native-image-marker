import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const packageName = argument('--package-name');
const version = argument('--version');
const channel = argument('--channel');
if (!packageName || !version || !channel) {
  throw new Error('--package-name, --version, and --channel are required.');
}

const consumerDirectory = await mkdtemp(
  join(tmpdir(), 'image-marker-registry-consumer-')
);

function run(command, args) {
  execFileSync(command, args, {
    cwd: consumerDirectory,
    stdio: 'inherit',
  });
}

try {
  await writeFile(
    join(consumerDirectory, 'package.json'),
    JSON.stringify(
      {
        name: 'image-marker-registry-consumer',
        private: true,
        type: 'module',
      },
      null,
      2
    )
  );
  const dependencies = [`${packageName}@${version}`, 'typescript@5.9.3'];
  if (
    packageName === 'react-native-image-marker' ||
    packageName === 'react-native-image-marker-editor'
  ) {
    dependencies.push('react@18.2.0', 'react-native@0.73.3');
  }
  if (packageName === 'react-native-image-marker-editor') {
    dependencies.push('react-native-image-marker@^2.1.0');
  }
  if (packageName === '@image-marker/node') {
    dependencies.push('sharp@^0.34.4');
  }
  run('npm', [
    'install',
    '--ignore-scripts',
    '--legacy-peer-deps',
    ...dependencies,
  ]);

  const manifestPath = join(
    consumerDirectory,
    'node_modules',
    packageName,
    'package.json'
  );
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.name !== packageName || manifest.version !== version) {
    throw new Error(
      `Installed ${String(manifest.name)}@${String(
        manifest.version
      )}; expected ${packageName}@${version}.`
    );
  }

  let consumerSource;
  if (channel === 'core-v1') {
    run('node', [
      '-e',
      "const core=require('react-native-image-marker'); if(!core.default) process.exit(1)",
    ]);
    consumerSource = `import Marker, {
  ImageFormat,
  Position,
} from 'react-native-image-marker';

const output: Promise<string> = Marker.markText({
  backgroundImage: { src: '/source.png' },
  watermarkTexts: [{
    text: 'LTS',
    position: { position: Position.center },
    style: { color: '#FFFFFF', fontSize: 16 },
  }],
  saveFormat: ImageFormat.png,
});
void output;
`;
  } else if (packageName === 'react-native-image-marker') {
    run('node', [
      '-e',
      "const core=require('react-native-image-marker'); if(core.ImageFormat.webp!=='webp') process.exit(1)",
    ]);
    run('node', [
      '--input-type=module',
      '-e',
      "const core=await import('react-native-image-marker'); if(core.ImageFormat.webp!=='webp') process.exit(1)",
    ]);
    consumerSource = `import Marker, {
  ImageFormat,
  type MarkerResult,
  type WatermarkRecipeDefinition,
} from 'react-native-image-marker';

const definition: WatermarkRecipeDefinition = {
  schemaVersion: 2,
  layers: [{ id: 'title', type: 'text', text: 'Current' }],
  output: { saveFormat: ImageFormat.png },
};
const output: Promise<MarkerResult> = Marker.createRecipe(definition).apply(
  { backgroundImage: { src: '/source.png' } },
  { timeoutMs: 5_000 }
);
void output;
`;
  } else if (packageName === 'react-native-image-marker-editor') {
    const peerRange = manifest.peerDependencies?.['react-native-image-marker'];
    if (peerRange !== '^2.1.0') {
      throw new Error(
        `Editor published an invalid Core peer range: ${peerRange}.`
      );
    }
    run('node', [
      '-e',
      [
        "const {dirname,join}=require('node:path');",
        "const root=dirname(require.resolve('react-native-image-marker-editor/package.json'));",
        "const {ImageMarkerEditorController}=require(join(root,'lib/commonjs/controller.js'));",
        "const editor=new ImageMarkerEditorController({schemaVersion:2,layers:[{id:'title',type:'text',text:'Hello'}],output:{}});",
        "if(editor.exportRecipe().layers[0].id!=='title') process.exit(1);",
      ].join(''),
    ]);
    consumerSource = `import { ImageFormat } from 'react-native-image-marker';
import {
  ImageMarkerEditorController,
  type EditorRenderRequest,
} from 'react-native-image-marker-editor';

const editor = new ImageMarkerEditorController({
  schemaVersion: 2,
  layers: [{ id: 'title', type: 'text', text: 'Hello' }],
  output: { saveFormat: ImageFormat.png },
});
const request: EditorRenderRequest = {
  recipe: editor.exportRecipe(),
  input: { backgroundImage: { src: '/source.png' } },
};
void request;
`;
  } else if (packageName === '@image-marker/recipe') {
    run('node', [
      '-e',
      "const recipe=require('@image-marker/recipe'); if(recipe.WATERMARK_RECIPE_SCHEMA_VERSION!==2) process.exit(1)",
    ]);
    run('node', [
      '--input-type=module',
      '-e',
      "const recipe=await import('@image-marker/recipe'); if(recipe.WATERMARK_RECIPE_SCHEMA_VERSION!==2) process.exit(1)",
    ]);
    consumerSource = `import {
  createWatermarkRecipeDefinition,
  materializeWatermarkRecipe,
  type WatermarkRecipeDefinition,
} from '@image-marker/recipe';

const definition: WatermarkRecipeDefinition =
  createWatermarkRecipeDefinition({
    layers: [{ id: 'title', type: 'text', text: 'Hello {{name}}' }],
    output: { saveFormat: 'png' },
  });
const materialized = materializeWatermarkRecipe(definition, {
  variables: { name: 'Alice' },
});
void materialized;
`;
  } else if (packageName === '@image-marker/node') {
    if (
      manifest.dependencies?.['@image-marker/recipe'] !== '^0.1.0' ||
      manifest.peerDependencies?.sharp !== '>=0.33.0' ||
      manifest.dependencies?.react ||
      manifest.dependencies?.['react-native'] ||
      manifest.peerDependencies?.react ||
      manifest.peerDependencies?.['react-native']
    ) {
      throw new Error('Node published an invalid dependency graph.');
    }
    run('node', [
      '-e',
      "const node=require('@image-marker/node'); if(typeof node.createNodeImageMarker!=='function') process.exit(1)",
    ]);
    run('node', [
      '--input-type=module',
      '-e',
      "const node=await import('@image-marker/node'); if(typeof node.createNodeImageMarker!=='function') process.exit(1)",
    ]);
    consumerSource = `import {
  createNodeImageMarker,
  type NodeRenderResult,
} from '@image-marker/node';

const renderer = createNodeImageMarker();
const result: Promise<NodeRenderResult> = renderer.render(
  {
    schemaVersion: 2,
    layers: [{ id: 'title', type: 'text', text: 'Server' }],
    output: { saveFormat: 'png' },
  },
  { backgroundImage: { src: Buffer.from('fixture') } }
);
void result;
`;
  } else {
    throw new Error(`Unsupported release consumer target: ${packageName}.`);
  }

  await writeFile(join(consumerDirectory, 'consumer.ts'), consumerSource);
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
        },
        files: ['consumer.ts'],
      },
      null,
      2
    )
  );
  run(join(consumerDirectory, 'node_modules/.bin/tsc'), [
    '-p',
    'tsconfig.json',
  ]);

  process.stdout.write(
    `Verified registry consumer for ${packageName}@${version} (${channel}).\n`
  );
} finally {
  await rm(consumerDirectory, { recursive: true, force: true });
}
