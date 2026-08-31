import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveReleaseTarget } from '../release-target.mjs';

test('routes a v1 maintenance release to the LTS branch', () => {
  assert.deepEqual(resolveReleaseTarget('v1.12.1'), {
    tag: 'v1.12.1',
    packageName: 'react-native-image-marker',
    packagePath: '.',
    version: '1.12.1',
    branch: 'release/1.x',
    npmTag: 'lts',
    additionalDistTags: [],
    channel: 'core-v1',
  });
});

test('routes v2 prereleases and stable releases to distinct npm tags', () => {
  assert.equal(resolveReleaseTarget('v2.0.0-alpha.1').npmTag, 'next');
  assert.equal(resolveReleaseTarget('v2.0.0-beta.2').npmTag, 'next');
  assert.equal(resolveReleaseTarget('v2.0.0-rc.3').npmTag, 'next');
  assert.equal(resolveReleaseTarget('v2.0.0').npmTag, 'latest');
});

test('routes editor releases without publishing the core package', () => {
  const prerelease = resolveReleaseTarget('editor-v0.0.1-next.1');
  const stable = resolveReleaseTarget('editor-v0.0.1');

  assert.equal(prerelease.packagePath, 'packages/editor');
  assert.equal(prerelease.npmTag, 'next');
  assert.equal(stable.packageName, 'react-native-image-marker-editor');
  assert.equal(stable.npmTag, 'latest');
});

test('routes platform-neutral Recipe releases independently', () => {
  const target = resolveReleaseTarget('recipe-v0.1.0');
  assert.deepEqual(target, {
    tag: 'recipe-v0.1.0',
    packageName: '@image-marker/recipe',
    packagePath: 'packages/recipe',
    version: '0.1.0',
    branch: 'release/2.0',
    npmTag: 'latest',
    additionalDistTags: [],
    channel: 'recipe',
  });
  assert.equal(resolveReleaseTarget('recipe-v0.2.0-next.1').npmTag, 'next');
});

test('routes the pure Node renderer independently', () => {
  const target = resolveReleaseTarget('node-v0.1.0');
  assert.deepEqual(target, {
    tag: 'node-v0.1.0',
    packageName: '@image-marker/node',
    packagePath: 'packages/node',
    version: '0.1.0',
    branch: 'release/2.0',
    npmTag: 'latest',
    additionalDistTags: [],
    channel: 'node',
  });
  assert.equal(resolveReleaseTarget('node-v0.2.0-next.1').npmTag, 'next');
});

test('routes the command-line package independently', () => {
  const target = resolveReleaseTarget('cli-v0.1.0');
  assert.deepEqual(target, {
    tag: 'cli-v0.1.0',
    packageName: '@image-marker/cli',
    packagePath: 'packages/cli',
    version: '0.1.0',
    branch: 'release/2.0',
    npmTag: 'latest',
    additionalDistTags: [],
    channel: 'cli',
  });
  assert.equal(resolveReleaseTarget('cli-v0.2.0-next.1').npmTag, 'next');
});

test('routes the independent Web SDK without changing Core or Editor channels', () => {
  assert.deepEqual(resolveReleaseTarget('web-v0.1.0'), {
    tag: 'web-v0.1.0',
    packageName: '@image-marker/web',
    packagePath: 'packages/web',
    version: '0.1.0',
    branch: 'release/2.0',
    npmTag: 'latest',
    additionalDistTags: [],
    channel: 'web',
  });
  assert.equal(resolveReleaseTarget('web-v0.2.0-next.1').npmTag, 'next');
  assert.equal(resolveReleaseTarget('web-v0.2.0-next.1').channel, 'web-prerelease');
  assert.throws(() => resolveReleaseTarget('web-v1.0.0'));
  assert.throws(() => resolveReleaseTarget('web-v0.1.0-beta.1'));
});

test('rejects ambiguous or unsupported release tags', () => {
  for (const tag of [
    '',
    '1.12.1',
    'v3.0.0',
    'v2.0.0-next.1',
    'editor-v1.0.0',
    'editor-v0.0.1-beta.1',
    'recipe-v1.0.0',
    'node-v1.0.0',
    'cli-v1.0.0',
  ]) {
    assert.throws(() => resolveReleaseTarget(tag));
  }
});
