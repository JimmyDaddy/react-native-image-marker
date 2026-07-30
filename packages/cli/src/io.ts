import { constants } from 'node:fs';
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import type { WatermarkRecipeVariable } from '@image-marker/recipe';
import { CliUsageError } from './args';

export interface CliIo {
  readStdin(): Promise<Buffer>;
  writeStdout(value: string | Buffer): Promise<void>;
  writeStderr(value: string): Promise<void>;
}

export function createProcessCliIo(): CliIo {
  return {
    async readStdin() {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    },
    async writeStdout(value) {
      if (!process.stdout.write(value)) {
        await new Promise<void>((resolveDrain) =>
          process.stdout.once('drain', resolveDrain)
        );
      }
    },
    async writeStderr(value) {
      if (!process.stderr.write(value)) {
        await new Promise<void>((resolveDrain) =>
          process.stderr.once('drain', resolveDrain)
        );
      }
    },
  };
}

export async function readInput(source: string, io: CliIo): Promise<Buffer> {
  return source === '-' ? io.readStdin() : readFile(resolve(source));
}

export async function readUtf8Input(
  source: string,
  io: CliIo
): Promise<string> {
  return (await readInput(source, io)).toString('utf8');
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function writeOutput(
  target: string,
  data: string | Buffer,
  options: { force: boolean; io: CliIo }
): Promise<void> {
  if (target === '-') {
    await options.io.writeStdout(data);
    return;
  }
  const outputPath = resolve(target);
  if (!options.force && (await pathExists(outputPath))) {
    throw new CliUsageError(
      `Output "${target}" already exists; pass --force to replace it.`
    );
  }
  await mkdir(dirname(outputPath), { recursive: true });
  const temporary = join(
    dirname(outputPath),
    `.${basename(outputPath)}.${process.pid}.${Date.now()}.tmp`
  );
  try {
    await writeFile(temporary, data);
    if (options.force) await rm(outputPath, { force: true });
    await rename(temporary, outputPath);
  } finally {
    await rm(temporary, { force: true });
  }
}

function parseVariableValue(source: string): WatermarkRecipeVariable {
  if (source === 'true') return true;
  if (source === 'false') return false;
  if (source.trim() && Number.isFinite(Number(source))) return Number(source);
  return source;
}

export function parseVariables(
  values: readonly string[]
): Readonly<Record<string, WatermarkRecipeVariable>> {
  const variables: Record<string, WatermarkRecipeVariable> = {};
  for (const value of values) {
    const equal = value.indexOf('=');
    if (equal <= 0) {
      throw new CliUsageError(
        `Variable "${value}" must use the form --var name=value.`
      );
    }
    const name = value.slice(0, equal).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(name)) {
      throw new CliUsageError(`Variable name "${name}" is invalid.`);
    }
    variables[name] = parseVariableValue(value.slice(equal + 1));
  }
  return variables;
}

export function outputExtension(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? '.jpg' : `.${format}`;
}

export function replaceExtension(path: string, extension: string): string {
  const current = extname(path);
  return `${current ? path.slice(0, -current.length) : path}${extension}`;
}
