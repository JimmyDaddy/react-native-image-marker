import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNodeImageMarker } from '@image-marker/node';
import sharp from 'sharp';
import { parseCliArguments } from '../args';
import { runImageMarkerCli } from '../cli';
import type { CliIo } from '../io';

class MemoryIo implements CliIo {
  stdout: Buffer[] = [];
  stderr = '';

  constructor(private readonly stdin = Buffer.alloc(0)) {}

  async readStdin(): Promise<Buffer> {
    return this.stdin;
  }

  async writeStdout(value: string | Buffer): Promise<void> {
    this.stdout.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
  }

  async writeStderr(value: string): Promise<void> {
    this.stderr += value;
  }

  stdoutText(): string {
    return Buffer.concat(this.stdout).toString('utf8');
  }
}

describe('@image-marker/cli', () => {
  let directory: string;
  const marker = createNodeImageMarker({ sharp });

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'image-marker-cli-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('parses repeatable long and short options', () => {
    const parsed = parseCliArguments([
      'render',
      '-r',
      'recipe.json',
      '--var',
      'name=Alice',
      '--var=count=2',
      '-f',
    ]);
    expect(parsed.command).toBe('render');
    expect(parsed.options.get('recipe')).toEqual(['recipe.json']);
    expect(parsed.options.get('var')).toEqual(['name=Alice', 'count=2']);
    expect(parsed.options.get('force')).toEqual(['true']);
  });

  it('initializes, validates, and migrates Recipe documents', async () => {
    const starter = join(directory, 'starter.json');
    const initIo = new MemoryIo();
    expect(
      await runImageMarkerCli(['init', '--output', starter], { io: initIo })
    ).toBe(0);
    expect(JSON.parse(await readFile(starter, 'utf8')).schemaVersion).toBe(2);

    const validateIo = new MemoryIo();
    expect(
      await runImageMarkerCli(['validate', '--recipe', starter, '--json'], {
        io: validateIo,
      })
    ).toBe(0);
    expect(JSON.parse(validateIo.stdoutText())).toMatchObject({
      valid: true,
      schemaVersion: 2,
      layers: 1,
    });

    const legacy = join(directory, 'legacy.json');
    const migrated = join(directory, 'migrated.json');
    await writeFile(
      legacy,
      JSON.stringify({
        schemaVersion: 1,
        watermarks: [{ type: 'text', text: 'Legacy' }],
        saveFormat: 'png',
      })
    );
    expect(
      await runImageMarkerCli(
        ['migrate', '--recipe', legacy, '--output', migrated],
        { io: new MemoryIo() }
      )
    ).toBe(0);
    expect(JSON.parse(await readFile(migrated, 'utf8'))).toMatchObject({
      schemaVersion: 2,
      layers: [{ id: 'layer-1', type: 'text', text: 'Legacy' }],
    });
  });

  it('renders, inspects, and batch-renders real images', async () => {
    const first = join(directory, 'first.jpg');
    const second = join(directory, 'second.jpg');
    const recipe = join(directory, 'recipe.json');
    const output = join(directory, 'marked.png');
    const batchDirectory = join(directory, 'batch');
    const source = await sharp({
      create: {
        width: 160,
        height: 100,
        channels: 3,
        background: '#225588',
      },
    })
      .jpeg()
      .toBuffer();
    await Promise.all([
      writeFile(first, source),
      writeFile(second, source),
      writeFile(
        recipe,
        JSON.stringify({
          schemaVersion: 2,
          layers: [
            {
              id: 'title',
              type: 'text',
              text: 'Hello {{name}}',
              position: { position: 'center' },
              style: { fontSize: 20, color: '#FFFFFF' },
            },
          ],
          output: { saveFormat: 'png' },
        })
      ),
    ]);

    const renderIo = new MemoryIo();
    const renderExitCode = await runImageMarkerCli(
      [
        'render',
        '--recipe',
        recipe,
        '--input',
        first,
        '--output',
        output,
        '--var',
        'name=CLI',
        '--json',
        '--quiet',
      ],
      { io: renderIo, marker }
    );
    expect({ renderExitCode, stderr: renderIo.stderr }).toEqual({
      renderExitCode: 0,
      stderr: '',
    });
    expect(JSON.parse(renderIo.stdoutText())).toMatchObject({
      input: first,
      output,
      format: 'png',
      width: 160,
      height: 100,
    });
    expect((await sharp(output).metadata()).format).toBe('png');

    const inspectIo = new MemoryIo();
    expect(
      await runImageMarkerCli(['inspect', output], { io: inspectIo, marker })
    ).toBe(0);
    expect(JSON.parse(inspectIo.stdoutText())).toMatchObject({
      input: output,
      width: 160,
      height: 100,
      format: 'png',
    });

    const batchIo = new MemoryIo();
    const batchExitCode = await runImageMarkerCli(
      [
        'batch',
        '--recipe',
        recipe,
        '--output-dir',
        batchDirectory,
        '--concurrency',
        '2',
        '--var',
        'name=Batch',
        '--json',
        first,
        second,
      ],
      { io: batchIo, marker }
    );
    if (batchExitCode !== 0) {
      throw new Error(batchIo.stdoutText() || batchIo.stderr);
    }
    expect({
      batchExitCode,
      stderr: batchIo.stderr,
      stdout: batchIo.stdoutText(),
    }).toEqual({
      batchExitCode: 0,
      stderr: '',
      stdout: expect.any(String),
    });
    expect(JSON.parse(batchIo.stdoutText())).toMatchObject({
      total: 2,
      failed: 0,
    });
    expect(
      (await sharp(join(batchDirectory, 'first.png')).metadata()).width
    ).toBe(160);
    expect(
      (await sharp(join(batchDirectory, 'second.png')).metadata()).height
    ).toBe(100);
  });

  it('embeds and detects an authenticated invisible locator', async () => {
    const source = join(directory, 'source.png');
    const embedded = join(directory, 'embedded.png');
    await sharp({
      create: {
        width: 80,
        height: 40,
        channels: 4,
        background: '#445566',
      },
    })
      .png()
      .toFile(source);
    const environment = {
      IMAGE_MARKER_TRACE_KEY: '0123456789abcdef0123456789abcdef',
    };
    const embedIo = new MemoryIo();
    const embedExitCode = await runImageMarkerCli(
      [
        'embed',
        '--input',
        source,
        '--output',
        embedded,
        '--payload',
        'asset-42',
        '--json',
      ],
      { io: embedIo, environment, marker }
    );
    expect({ embedExitCode, stderr: embedIo.stderr }).toEqual({
      embedExitCode: 0,
      stderr: '',
    });
    const detectIo = new MemoryIo();
    expect(
      await runImageMarkerCli(['detect', '--input', embedded], {
        io: detectIo,
        environment,
        marker,
      })
    ).toBe(0);
    expect(JSON.parse(detectIo.stdoutText())).toMatchObject({
      detected: true,
      payload: 'asset-42',
      algorithm: 'lsb-hmac-v1',
    });

    const missingIo = new MemoryIo();
    expect(
      await runImageMarkerCli(['detect', '--input', source], {
        io: missingIo,
        environment,
        marker,
      })
    ).toBe(3);
    expect(JSON.parse(missingIo.stdoutText())).toMatchObject({
      detected: false,
      confidence: 0,
    });
  });

  it('protects existing outputs and reports stable usage exits', async () => {
    const output = join(directory, 'recipe.json');
    await writeFile(output, '{}');
    const io = new MemoryIo();
    expect(await runImageMarkerCli(['init', '--output', output], { io })).toBe(
      2
    );
    expect(io.stderr).toContain('already exists');

    const unknownIo = new MemoryIo();
    expect(await runImageMarkerCli(['unknown'], { io: unknownIo })).toBe(2);
    expect(unknownIo.stderr).toContain('Unknown command');
  });

  it('prints help and version without loading the renderer', async () => {
    const helpIo = new MemoryIo();
    expect(await runImageMarkerCli(['--help'], { io: helpIo })).toBe(0);
    expect(helpIo.stdoutText()).toContain('image-marker render');

    const versionIo = new MemoryIo();
    expect(await runImageMarkerCli(['--version'], { io: versionIo })).toBe(0);
    expect(versionIo.stdoutText()).toBe('0.1.0\n');
  });
});
