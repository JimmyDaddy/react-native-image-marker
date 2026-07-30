import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const DEFAULT_CONFIG = path.join(SCRIPT_DIRECTORY, 'size-budgets.json');

function listFiles(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`Required size-budget directory is missing: ${directory}`);
  }

  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function totalBytes(files) {
  return files.reduce((total, file) => total + fs.statSync(file).size, 0);
}

function largestFile(files) {
  return files
    .map((file) => ({ file, bytes: fs.statSync(file).size }))
    .sort((left, right) => right.bytes - left.bytes)[0];
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function assertAtMost(label, actual, maximum, details = '') {
  if (actual > maximum) {
    throw new Error(
      `${label} is ${formatBytes(actual)}, above the ${formatBytes(
        maximum
      )} budget${details ? ` (${details})` : ''}.`
    );
  }
}

export function verifyWebsiteBudget(repositoryRoot, budget) {
  const sourceDirectory = path.join(
    repositoryRoot,
    budget.sourceDirectory
  );
  const distDirectory = path.join(repositoryRoot, budget.distDirectory);
  const sourceFiles = listFiles(sourceDirectory);
  const distFiles = listFiles(distDirectory);
  const JavaScriptFiles = distFiles.filter((file) => file.endsWith('.js'));
  const wasmFiles = distFiles.filter((file) => file.endsWith('.wasm'));
  const largestSource = largestFile(sourceFiles);
  const largestJavaScript = largestFile(JavaScriptFiles);
  const largestWasm = largestFile(wasmFiles);

  assertAtMost(
    'Website public resources',
    totalBytes(sourceFiles),
    budget.maxSourceBytes
  );
  if (largestSource) {
    assertAtMost(
      'Largest website public resource',
      largestSource.bytes,
      budget.maxSourceFileBytes,
      path.relative(repositoryRoot, largestSource.file)
    );
  }
  assertAtMost(
    'Built website',
    totalBytes(distFiles),
    budget.maxDistBytes
  );
  if (largestJavaScript) {
    assertAtMost(
      'Largest website JavaScript file',
      largestJavaScript.bytes,
      budget.maxJavaScriptFileBytes,
      path.relative(repositoryRoot, largestJavaScript.file)
    );
  }
  if (largestWasm) {
    assertAtMost(
      'Largest website WASM file',
      largestWasm.bytes,
      budget.maxWasmFileBytes,
      path.relative(repositoryRoot, largestWasm.file)
    );
  }

  return {
    sourceBytes: totalBytes(sourceFiles),
    distBytes: totalBytes(distFiles),
    largestJavaScriptBytes: largestJavaScript?.bytes ?? 0,
    largestWasmBytes: largestWasm?.bytes ?? 0,
  };
}

export function verifyPackageMetrics(metrics, budget) {
  if (metrics.name !== budget.name) {
    throw new Error(
      `Expected package ${budget.name}, received ${metrics.name}.`
    );
  }
  assertAtMost(
    `${metrics.name} packed tarball`,
    metrics.size,
    budget.maxPackedBytes
  );
  assertAtMost(
    `${metrics.name} unpacked package`,
    metrics.unpackedSize,
    budget.maxUnpackedBytes
  );
}

function readPackageMetrics(repositoryRoot, budget) {
  const directory = path.join(repositoryRoot, budget.directory);
  const output = execFileSync(
    'npm',
    ['pack', '--ignore-scripts', '--dry-run', '--json'],
    {
      cwd: directory,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }
  );
  const [metrics] = JSON.parse(output);
  if (!metrics) {
    throw new Error(`npm pack did not report metrics for ${budget.name}.`);
  }
  verifyPackageMetrics(metrics, budget);
  return metrics;
}

function loadConfig(configPath = DEFAULT_CONFIG) {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function main() {
  const target = process.argv[2] ?? 'all';
  const config = loadConfig();
  let matched = false;

  if (target === 'all' || target === 'website') {
    const metrics = verifyWebsiteBudget(REPOSITORY_ROOT, config.website);
    console.log(
      `Website size budgets passed (${formatBytes(
        metrics.sourceBytes
      )} public, ${formatBytes(metrics.distBytes)} built).`
    );
    matched = true;
  }

  for (const [key, budget] of Object.entries(config.packages)) {
    if (target !== 'all' && target !== 'packages' && target !== key) continue;
    const metrics = readPackageMetrics(REPOSITORY_ROOT, budget);
    console.log(
      `${metrics.name} size budget passed (${formatBytes(
        metrics.size
      )} packed, ${formatBytes(metrics.unpackedSize)} unpacked).`
    );
    matched = true;
  }

  if (!matched) {
    throw new Error(
      `Unknown size-budget target "${target}". Use website, packages, ${Object.keys(
        config.packages
      ).join(', ')}, or all.`
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
