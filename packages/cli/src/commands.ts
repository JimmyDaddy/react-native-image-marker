import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import {
  createNodeImageMarker,
  type NodeImageMarker,
  type NodeImageSource,
  type NodeRecipeDefinition,
  type NodeRenderResult,
} from '@image-marker/node';
import {
  createWatermarkRecipeDefinition,
  migrateWatermarkRecipe,
  parseWatermarkRecipe,
  serializeWatermarkRecipe,
  validateWatermarkRecipe,
  type WatermarkImageFormat,
} from '@image-marker/recipe';
import {
  assertKnownOptions,
  booleanOption,
  CliUsageError,
  integerOption,
  optionValue,
  optionValues,
  type ParsedCliArguments,
  requiredOption,
} from './args';
import {
  outputExtension,
  parseVariables,
  readInput,
  readUtf8Input,
  replaceExtension,
  writeOutput,
  type CliIo,
} from './io';
export { IMAGE_MARKER_CLI_VERSION } from './version';

const STARTER_RECIPE = createWatermarkRecipeDefinition<string>({
  layers: [
    {
      id: 'title',
      type: 'text',
      text: 'Image Marker',
      position: { position: 'bottomRight', edgeInset: 32 },
      style: {
        color: '#FFFFFF',
        fontSize: 42,
        maxWidth: '70%',
        shadowStyle: {
          color: '#00000099',
          dx: 0,
          dy: 2,
          radius: 4,
        },
      },
    },
  ],
  output: { saveFormat: 'png', quality: 90 },
});

export interface CliCommandContext {
  io: CliIo;
  marker?: NodeImageMarker;
  environment?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
}

export interface CliCommandResult {
  exitCode: number;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

async function report(
  parsed: ParsedCliArguments,
  context: CliCommandContext,
  value: unknown,
  message: string
): Promise<void> {
  if (booleanOption(parsed, 'json')) {
    await context.io.writeStdout(json(value));
    return;
  }
  if (booleanOption(parsed, 'quiet')) return;
  await context.io.writeStderr(`${message}\n`);
}

function recipeSource(parsed: ParsedCliArguments): string {
  return optionValue(parsed, 'recipe') ?? parsed.positionals[0] ?? '';
}

function resolveRecipeImages(
  recipe: NodeRecipeDefinition,
  source: string
): NodeRecipeDefinition {
  const baseDirectory =
    source === '-' ? process.cwd() : dirname(resolve(source));
  return {
    ...recipe,
    layers: recipe.layers.map((layer) => {
      if (
        layer.type !== 'image' ||
        typeof layer.src !== 'string' ||
        isAbsolute(layer.src)
      ) {
        return layer;
      }
      return { ...layer, src: resolve(baseDirectory, layer.src) };
    }),
  };
}

async function loadRecipe(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): Promise<NodeRecipeDefinition> {
  const source = recipeSource(parsed);
  if (!source) {
    throw new CliUsageError(
      'A Recipe file is required through --recipe <path>.'
    );
  }
  return resolveRecipeImages(
    parseWatermarkRecipe<string>(await readUtf8Input(source, context.io)),
    source
  );
}

function withOutputOverrides(
  recipe: NodeRecipeDefinition,
  parsed: ParsedCliArguments
): NodeRecipeDefinition {
  const requestedFormat = optionValue(parsed, 'format');
  let saveFormat: WatermarkImageFormat | undefined;
  if (requestedFormat) {
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(requestedFormat)) {
      throw new CliUsageError(
        'Option "--format" must be jpg, jpeg, png, or webp.'
      );
    }
    saveFormat = (
      requestedFormat === 'jpeg' ? 'jpg' : requestedFormat
    ) as WatermarkImageFormat;
  }
  const qualitySource = optionValue(parsed, 'quality');
  const maxSizeSource = optionValue(parsed, 'max-size');
  const quality =
    qualitySource === undefined ? undefined : Number(qualitySource);
  const maxSize =
    maxSizeSource === undefined ? undefined : Number(maxSizeSource);
  if (
    quality !== undefined &&
    (!Number.isInteger(quality) || quality < 1 || quality > 100)
  ) {
    throw new CliUsageError(
      'Option "--quality" must be an integer from 1-100.'
    );
  }
  if (maxSize !== undefined && (!Number.isInteger(maxSize) || maxSize <= 0)) {
    throw new CliUsageError('Option "--max-size" must be a positive integer.');
  }
  return validateWatermarkRecipe<string>({
    ...recipe,
    output: {
      ...recipe.output,
      ...(saveFormat ? { saveFormat } : {}),
      ...(quality ? { quality } : {}),
      ...(maxSize ? { maxSize } : {}),
    },
  });
}

function marker(context: CliCommandContext): NodeImageMarker {
  return context.marker ?? createNodeImageMarker();
}

async function imageSource(
  source: string,
  context: CliCommandContext
): Promise<NodeImageSource> {
  return source === '-' ? readInput(source, context.io) : resolve(source);
}

function renderSummary(
  input: string,
  output: string,
  result: NodeRenderResult
) {
  return {
    input,
    output,
    format: result.format,
    mimeType: result.mimeType,
    width: result.width,
    height: result.height,
    bytes: result.data.byteLength,
    durationMs: Number(result.durationMs.toFixed(2)),
  };
}

async function renderCommand(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): Promise<CliCommandResult> {
  assertKnownOptions(parsed, [
    'recipe',
    'input',
    'output',
    'var',
    'format',
    'quality',
    'max-size',
    'force',
  ]);
  const input = requiredOption(parsed, 'input');
  const output = requiredOption(parsed, 'output');
  if (input === '-' && recipeSource(parsed) === '-') {
    throw new CliUsageError(
      'Recipe and image cannot both read from standard input.'
    );
  }
  if (output === '-' && booleanOption(parsed, 'json')) {
    throw new CliUsageError(
      'Binary standard output cannot be combined with --json.'
    );
  }
  const recipe = withOutputOverrides(await loadRecipe(parsed, context), parsed);
  const result = await marker(context).render(
    recipe,
    {
      backgroundImage: { src: await imageSource(input, context) },
      filename: input === '-' ? undefined : basename(input),
      variables: parseVariables(optionValues(parsed, 'var')),
    },
    { signal: context.signal }
  );
  await writeOutput(output, result.data, {
    force: booleanOption(parsed, 'force'),
    io: context.io,
  });
  await report(
    parsed,
    context,
    renderSummary(input, output, result),
    `Rendered ${input} -> ${output} (${result.width}x${result.height}, ${result.format}).`
  );
  return { exitCode: 0 };
}

async function readInputList(
  source: string,
  context: CliCommandContext
): Promise<string[]> {
  return (await readUtf8Input(source, context.io))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

async function batchCommand(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): Promise<CliCommandResult> {
  assertKnownOptions(parsed, [
    'recipe',
    'input',
    'input-list',
    'output-dir',
    'var',
    'format',
    'quality',
    'max-size',
    'concurrency',
    'retries',
    'retry-delay',
    'force',
  ]);
  const listSource = optionValue(parsed, 'input-list');
  const positionalOffset = optionValue(parsed, 'recipe') ? 0 : 1;
  const inputs = [
    ...optionValues(parsed, 'input'),
    ...parsed.positionals.slice(positionalOffset),
    ...(listSource ? await readInputList(listSource, context) : []),
  ];
  if (inputs.length === 0) {
    throw new CliUsageError(
      'Batch requires input paths through --input, --input-list, or positional arguments.'
    );
  }
  const stdinUses =
    (recipeSource(parsed) === '-' ? 1 : 0) +
    (listSource === '-' ? 1 : 0) +
    inputs.filter((input) => input === '-').length;
  if (stdinUses > 1) {
    throw new CliUsageError(
      'Recipe, input list, and image inputs may use standard input only once.'
    );
  }
  const recipe = withOutputOverrides(await loadRecipe(parsed, context), parsed);
  const outputDirectory = resolve(requiredOption(parsed, 'output-dir'));
  const variables = parseVariables(optionValues(parsed, 'var'));
  const outputNames = inputs.map((input, index) =>
    replaceExtension(input === '-' ? `stdin-${index + 1}` : basename(input), '')
  );
  const duplicate = outputNames.find(
    (name, index) => outputNames.indexOf(name) !== index
  );
  if (duplicate) {
    throw new CliUsageError(
      `Multiple inputs would use the output basename "${duplicate}"; rename colliding files.`
    );
  }
  const sources = await Promise.all(
    inputs.map((input) => imageSource(input, context))
  );
  const results = await marker(context).renderMany(
    recipe,
    sources.map((source, index) => ({
      backgroundImage: { src: source },
      filename:
        inputs[index] === '-' ? `stdin-${index + 1}` : basename(inputs[index]!),
      variables,
    })),
    {
      signal: context.signal,
      concurrency: integerOption(parsed, 'concurrency', 4, 1),
      retries: integerOption(parsed, 'retries', 0, 0),
      retryDelayMs: integerOption(parsed, 'retry-delay', 0, 0),
    }
  );
  const summaries: unknown[] = [];
  let failed = 0;
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index]!;
    const input = inputs[index]!;
    if (result.status !== 'fulfilled') {
      failed += 1;
      summaries.push({
        input,
        status: result.status,
        attempts: result.attempts,
        error: errorMessage(result.reason),
      });
      continue;
    }
    const filename = replaceExtension(
      input === '-' ? `stdin-${index + 1}` : basename(input),
      outputExtension(result.value.format)
    );
    const output = join(outputDirectory, filename);
    await writeOutput(output, result.value.data, {
      force: booleanOption(parsed, 'force'),
      io: context.io,
    });
    summaries.push({
      status: 'fulfilled',
      attempts: result.attempts,
      ...renderSummary(input, output, result.value),
    });
  }
  await report(
    parsed,
    context,
    { total: inputs.length, failed, results: summaries },
    `Rendered ${inputs.length - failed}/${
      inputs.length
    } batch inputs to ${outputDirectory}.`
  );
  return { exitCode: failed > 0 ? 1 : 0 };
}

async function inspectCommand(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): Promise<CliCommandResult> {
  assertKnownOptions(parsed, ['input']);
  const inputs = [...optionValues(parsed, 'input'), ...parsed.positionals];
  if (inputs.length === 0) {
    throw new CliUsageError('Inspect requires at least one image path.');
  }
  if (inputs.filter((input) => input === '-').length > 1) {
    throw new CliUsageError('Standard input may only be inspected once.');
  }
  const values = [];
  for (const input of inputs) {
    values.push({
      input,
      ...(await marker(context).inspect(await imageSource(input, context))),
    });
  }
  await context.io.writeStdout(json(values.length === 1 ? values[0] : values));
  return { exitCode: 0 };
}

async function validateCommand(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): Promise<CliCommandResult> {
  assertKnownOptions(parsed, ['recipe']);
  const source = recipeSource(parsed);
  if (!source) throw new CliUsageError('A Recipe file is required.');
  const raw = JSON.parse(await readUtf8Input(source, context.io)) as unknown;
  const recipe = validateWatermarkRecipe(raw);
  await report(
    parsed,
    context,
    {
      valid: true,
      schemaVersion: recipe.schemaVersion,
      layers: recipe.layers.length,
    },
    `Recipe is valid (schema v${recipe.schemaVersion}, ${recipe.layers.length} layers).`
  );
  return { exitCode: 0 };
}

async function migrateCommand(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): Promise<CliCommandResult> {
  assertKnownOptions(parsed, ['recipe', 'output', 'force']);
  const source = recipeSource(parsed);
  if (!source) throw new CliUsageError('A Recipe file is required.');
  const output = optionValue(parsed, 'output') ?? '-';
  const raw = JSON.parse(await readUtf8Input(source, context.io)) as unknown;
  const recipe = migrateWatermarkRecipe(raw);
  await writeOutput(output, `${serializeWatermarkRecipe(recipe)}\n`, {
    force: booleanOption(parsed, 'force'),
    io: context.io,
  });
  if (output !== '-') {
    await report(
      parsed,
      context,
      { output, schemaVersion: recipe.schemaVersion },
      `Migrated Recipe to ${output}.`
    );
  }
  return { exitCode: 0 };
}

async function initCommand(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): Promise<CliCommandResult> {
  assertKnownOptions(parsed, ['output', 'force']);
  const output =
    optionValue(parsed, 'output') ??
    parsed.positionals[0] ??
    'image-marker.recipe.json';
  await writeOutput(output, `${serializeWatermarkRecipe(STARTER_RECIPE)}\n`, {
    force: booleanOption(parsed, 'force'),
    io: context.io,
  });
  if (output !== '-') {
    await report(
      parsed,
      context,
      { output },
      `Created starter Recipe at ${output}.`
    );
  }
  return { exitCode: 0 };
}

function invisibleKey(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): string {
  const variable = optionValue(parsed, 'key-env') ?? 'IMAGE_MARKER_TRACE_KEY';
  const key = (context.environment ?? process.env)[variable];
  if (!key) {
    throw new CliUsageError(
      `Environment variable "${variable}" must contain the invisible locator key.`
    );
  }
  return key;
}

async function embedCommand(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): Promise<CliCommandResult> {
  assertKnownOptions(parsed, [
    'input',
    'output',
    'payload',
    'key-env',
    'force',
  ]);
  const input = requiredOption(parsed, 'input');
  const output = requiredOption(parsed, 'output');
  if (output === '-' && booleanOption(parsed, 'json')) {
    throw new CliUsageError(
      'Binary standard output cannot be combined with --json.'
    );
  }
  const result = await marker(context).embedInvisible({
    image: await imageSource(input, context),
    payload: requiredOption(parsed, 'payload'),
    key: invisibleKey(parsed, context),
    signal: context.signal,
  });
  await writeOutput(output, result.data, {
    force: booleanOption(parsed, 'force'),
    io: context.io,
  });
  await report(
    parsed,
    context,
    renderSummary(input, output, result),
    `Embedded an authenticated locator in ${output}.`
  );
  return { exitCode: 0 };
}

async function detectCommand(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): Promise<CliCommandResult> {
  assertKnownOptions(parsed, ['input', 'key-env']);
  const input = requiredOption(parsed, 'input');
  const result = await marker(context).detectInvisible({
    image: await imageSource(input, context),
    key: invisibleKey(parsed, context),
    signal: context.signal,
  });
  await context.io.writeStdout(json({ input, ...result }));
  return { exitCode: result.detected ? 0 : 3 };
}

export async function executeCliCommand(
  parsed: ParsedCliArguments,
  context: CliCommandContext
): Promise<CliCommandResult> {
  switch (parsed.command) {
    case 'render':
      return renderCommand(parsed, context);
    case 'batch':
      return batchCommand(parsed, context);
    case 'inspect':
      return inspectCommand(parsed, context);
    case 'validate':
      return validateCommand(parsed, context);
    case 'migrate':
      return migrateCommand(parsed, context);
    case 'init':
      return initCommand(parsed, context);
    case 'embed':
      return embedCommand(parsed, context);
    case 'detect':
      return detectCommand(parsed, context);
    default:
      throw new CliUsageError(
        `Unknown command "${parsed.command ?? ''}". Run image-marker --help.`
      );
  }
}
