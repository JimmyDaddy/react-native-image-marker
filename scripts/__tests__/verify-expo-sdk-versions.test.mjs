import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, test } from 'node:test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '..', '..');
const verifier = path.join(root, 'scripts/verify-expo-sdk-versions.mjs');
const requireFromTest = createRequire(import.meta.url);
const semverSource = path.dirname(
  requireFromTest.resolve('semver/package.json')
);
const fixtures = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true });
  }
});

function writeJson(filename, value) {
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function writePackage(project, name, version) {
  writeJson(path.join(project, 'node_modules', name, 'package.json'), {
    name,
    version,
  });
}

function createFixture({ dependencies, packages, bundledNativeModules }) {
  const project = mkdtempSync(path.join(tmpdir(), 'image-marker-expo-sdk-'));
  fixtures.push(project);
  writeJson(path.join(project, 'package.json'), {
    name: 'expo-sdk-version-fixture',
    private: true,
    dependencies,
  });
  cpSync(semverSource, path.join(project, 'node_modules', 'semver'), {
    recursive: true,
  });
  for (const [name, version] of Object.entries(packages)) {
    writePackage(project, name, version);
  }
  if (bundledNativeModules !== undefined) {
    writeJson(
      path.join(project, 'node_modules', 'expo', 'bundledNativeModules.json'),
      bundledNativeModules
    );
  }
  return project;
}

function run(project) {
  return spawnSync(process.execPath, [verifier, project], {
    encoding: 'utf8',
  });
}

function passingFixture(overrides = {}) {
  return createFixture({
    dependencies: {
      'expo': '~57.0.0',
      'react-native': '0.86.2',
      'react-native-web': '^0.21.0',
      'react-native-image-marker': 'file:..',
      ...overrides.dependencies,
    },
    packages: {
      'expo': '57.0.1',
      'react-native': '0.86.2',
      'react-native-web': '0.21.2',
      'react-native-image-marker': '2.1.1',
      ...overrides.packages,
    },
    bundledNativeModules: {
      'react-native': '0.86.2',
      'react-native-web': '~0.21.0',
      ...overrides.bundledNativeModules,
    },
  });
}

test('accepts versions compatible with the app manifest and installed Expo SDK metadata', () => {
  const result = run(passingFixture());

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /Verified 3 manifest versions and 2 installed-Expo SDK versions/
  );
});

test('rejects a direct dependency missing from node_modules', () => {
  const project = passingFixture({
    packages: { 'react-native-web': undefined },
  });
  rmSync(path.join(project, 'node_modules', 'react-native-web'), {
    recursive: true,
    force: true,
  });

  const result = run(project);

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /react-native-web: package is missing from node_modules/
  );
});

test('rejects missing installed Expo SDK metadata', () => {
  const project = passingFixture();
  rmSync(
    path.join(project, 'node_modules', 'expo', 'bundledNativeModules.json')
  );

  const result = run(project);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expo local SDK metadata is unavailable/);
});

test('rejects a version that is incompatible with the installed Expo SDK metadata', () => {
  const result = run(
    passingFixture({ packages: { 'react-native': '0.86.1' } })
  );

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /react-native: installed Expo SDK metadata expects 0\.86\.2, installed 0\.86\.1/
  );
});

test('rejects a version that does not satisfy the app manifest', () => {
  const result = run(
    passingFixture({ dependencies: { 'react-native': '0.86.3' } })
  );

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /react-native: expo-example\/package\.json expects 0\.86\.3, installed 0\.86\.2/
  );
});

test('rejects an undeclared prerelease even when its stable range would match', () => {
  const result = run(
    passingFixture({ packages: { 'react-native-web': '0.21.2-beta.1' } })
  );

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /react-native-web: expo-example\/package\.json expects \^0\.21\.0, installed 0\.21\.2-beta\.1/
  );
});

test('rejects an empty range in installed Expo SDK metadata', () => {
  const result = run(
    passingFixture({ bundledNativeModules: { 'react-native-web': '' } })
  );

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /react-native-web: Expo local SDK metadata has an invalid range/
  );
});
