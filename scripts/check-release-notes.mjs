import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(
  readFileSync(join(repositoryRoot, 'package.json'), 'utf8')
);
assert.equal(
  packageJson['release-it']?.git?.changelog,
  undefined,
  'release-it git.changelog overrides the conventional-changelog plugin.'
);

const fixtureDirectory = mkdtempSync(
  join(repositoryRoot, '.release-notes-check-')
);
const git = (...args) =>
  execFileSync('git', args, {
    cwd: fixtureDirectory,
    stdio: 'ignore',
  });

try {
  writeFileSync(
    join(fixtureDirectory, 'package.json'),
    `${JSON.stringify(
      { name: 'release-notes-check', version: '1.0.0' },
      null,
      2
    )}\n`
  );
  writeFileSync(join(fixtureDirectory, 'fixture.txt'), 'initial\n');
  writeFileSync(
    join(fixtureDirectory, 'release-it.json'),
    `${JSON.stringify(
      {
        git: {
          commit: false,
          tag: false,
          push: false,
          requireUpstream: false,
        },
        npm: { publish: false },
        github: { release: false },
        plugins: {
          '@release-it/conventional-changelog': {
            preset: 'conventionalcommits',
          },
        },
      },
      null,
      2
    )}\n`
  );
  git('init', '--quiet');
  git('config', 'user.name', 'Release Notes Check');
  git('config', 'user.email', 'release-notes-check@example.invalid');
  git('add', '.');
  git('commit', '--quiet', '-m', 'chore: initial release');
  git('tag', 'v1.0.0');
  writeFileSync(join(fixtureDirectory, 'fixture.txt'), 'fixed\n');
  git('add', 'fixture.txt');
  git('commit', '--quiet', '-m', 'fix: keep release notes visible');

  const result = spawnSync(
    process.execPath,
    [
      join(repositoryRoot, 'node_modules/release-it/bin/release-it.js'),
      '--config',
      'release-it.json',
      'patch',
      '--dry-run',
      '--ci',
      '--changelog',
    ],
    {
      cwd: fixtureDirectory,
      encoding: 'utf8',
    }
  );
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /### Bug Fixes/);
  assert.match(output, /keep release notes visible/);
  console.log('Verified conventional release notes generation.');
} finally {
  rmSync(fixtureDirectory, { recursive: true, force: true });
}
