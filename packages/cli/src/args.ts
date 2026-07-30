export class CliUsageError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

const SHORT_OPTIONS: Record<string, string> = {
  c: 'concurrency',
  f: 'force',
  h: 'help',
  i: 'input',
  o: 'output',
  q: 'quiet',
  r: 'recipe',
  v: 'version',
};

const BOOLEAN_OPTIONS = new Set(['force', 'help', 'json', 'quiet', 'version']);

export interface ParsedCliArguments {
  command?: string;
  options: ReadonlyMap<string, readonly string[]>;
  positionals: readonly string[];
}

function normalizeOptionName(source: string): string {
  return source.replace(/^--?/, '').replace(/_/g, '-');
}

export function parseCliArguments(argv: readonly string[]): ParsedCliArguments {
  const values = new Map<string, string[]>();
  const positionals: string[] = [];
  let command: string | undefined;
  let optionsEnded = false;

  const add = (name: string, value: string) => {
    const current = values.get(name) ?? [];
    current.push(value);
    values.set(name, current);
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (!optionsEnded && argument === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && argument.startsWith('-') && argument !== '-') {
      const equal = argument.indexOf('=');
      const rawName = equal >= 0 ? argument.slice(0, equal) : argument;
      let name = normalizeOptionName(rawName);
      if (rawName.startsWith('-') && !rawName.startsWith('--')) {
        if (name.length !== 1 || !SHORT_OPTIONS[name]) {
          throw new CliUsageError(`Unknown short option "${rawName}".`);
        }
        name = SHORT_OPTIONS[name]!;
      }
      if (!name) throw new CliUsageError('Option name must not be empty.');
      if (equal >= 0) {
        add(name, argument.slice(equal + 1));
        continue;
      }
      if (BOOLEAN_OPTIONS.has(name)) {
        add(name, 'true');
        continue;
      }
      const next = argv[index + 1];
      if (next === undefined || (next.startsWith('-') && next !== '-')) {
        throw new CliUsageError(`Option "--${name}" requires a value.`);
      }
      add(name, next);
      index += 1;
      continue;
    }
    if (!command) command = argument;
    else positionals.push(argument);
  }

  return { command, options: values, positionals };
}

export function optionValues(
  parsed: ParsedCliArguments,
  name: string
): readonly string[] {
  return parsed.options.get(name) ?? [];
}

export function optionValue(
  parsed: ParsedCliArguments,
  name: string
): string | undefined {
  const values = optionValues(parsed, name);
  if (values.length > 1) {
    throw new CliUsageError(`Option "--${name}" may only be specified once.`);
  }
  return values[0];
}

export function requiredOption(
  parsed: ParsedCliArguments,
  name: string
): string {
  const value = optionValue(parsed, name);
  if (value === undefined || !value.trim()) {
    throw new CliUsageError(`Option "--${name}" is required.`);
  }
  return value;
}

export function booleanOption(
  parsed: ParsedCliArguments,
  name: string
): boolean {
  return optionValues(parsed, name).length > 0;
}

export function integerOption(
  parsed: ParsedCliArguments,
  name: string,
  fallback: number,
  minimum: number
): number {
  const source = optionValue(parsed, name);
  if (source === undefined) return fallback;
  const value = Number(source);
  if (!Number.isInteger(value) || value < minimum) {
    throw new CliUsageError(
      `Option "--${name}" must be an integer greater than or equal to ${minimum}.`
    );
  }
  return value;
}

export function assertKnownOptions(
  parsed: ParsedCliArguments,
  allowed: readonly string[]
): void {
  const names = new Set([...allowed, 'help', 'json', 'quiet']);
  for (const name of parsed.options.keys()) {
    if (!names.has(name)) {
      throw new CliUsageError(
        `Unknown option "--${name}" for "${parsed.command ?? 'image-marker'}".`
      );
    }
  }
}
