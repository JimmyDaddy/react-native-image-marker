import {
  IMAGE_MARKER_CLI_VERSION,
  executeCliCommand,
  type CliCommandContext,
} from './commands';
import { booleanOption, CliUsageError, parseCliArguments } from './args';
import { createProcessCliIo, type CliIo } from './io';

export const IMAGE_MARKER_CLI_HELP = `Image Marker CLI ${IMAGE_MARKER_CLI_VERSION}

Usage:
  image-marker <command> [options]

Commands:
  init       Create a starter Recipe v2 JSON document
  validate   Validate a Recipe v2 document without migrating it
  migrate    Migrate a Recipe v1 document to Recipe v2
  render     Render one image with a Recipe
  batch      Render ordered image inputs with concurrency and retry
  inspect    Print image dimensions, format, and orientation as JSON
  embed      Embed an authenticated locator in a lossless PNG
  detect     Detect and authenticate an invisible locator

Common options:
  -r, --recipe <path>      Recipe JSON path; use - for stdin
  -i, --input <path>       Image input; repeat where supported; use - for stdin
  -o, --output <path>      Output path; use - for stdout
      --var name=value     Template variable; repeatable
      --json               Write machine-readable result metadata
      --quiet              Suppress human progress messages
  -f, --force              Replace an existing output
  -h, --help               Show help
  -v, --version            Show the CLI version

Examples:
  image-marker init
  image-marker validate --recipe image-marker.recipe.json
  image-marker render -r recipe.json -i photo.jpg -o marked.png
  image-marker batch -r recipe.json --output-dir dist photo-1.jpg photo-2.jpg
  image-marker inspect photo.jpg
  IMAGE_MARKER_TRACE_KEY=... image-marker embed -i source.png -o traced.png --payload asset-42

Exit codes:
  0 success, 1 operation failure, 2 usage error, 3 locator not detected,
  130 interrupted.
`;

export interface RunImageMarkerCliOptions
  extends Omit<CliCommandContext, 'io'> {
  io?: CliIo;
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export async function runImageMarkerCli(
  argv: readonly string[],
  options: RunImageMarkerCliOptions = {}
): Promise<number> {
  const io = options.io ?? createProcessCliIo();
  try {
    const parsed = parseCliArguments(argv);
    if (booleanOption(parsed, 'version')) {
      await io.writeStdout(`${IMAGE_MARKER_CLI_VERSION}\n`);
      return 0;
    }
    if (
      booleanOption(parsed, 'help') ||
      parsed.command === 'help' ||
      !parsed.command
    ) {
      await io.writeStdout(IMAGE_MARKER_CLI_HELP);
      return 0;
    }
    const result = await executeCliCommand(parsed, { ...options, io });
    return result.exitCode;
  } catch (reason) {
    const interrupted =
      options.signal?.aborted ||
      (reason instanceof Error && reason.name === 'AbortError');
    if (interrupted) {
      await io.writeStderr('Image Marker operation interrupted.\n');
      return 130;
    }
    const usage = reason instanceof CliUsageError;
    await io.writeStderr(
      `${usage ? 'Usage error' : 'Image Marker error'}: ${errorMessage(
        reason
      )}\n${usage ? 'Run image-marker --help for usage.\n' : ''}`
    );
    return usage ? 2 : 1;
  }
}
