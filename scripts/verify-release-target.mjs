import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { resolveReleaseTarget } from './release-target.mjs';

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const tag = readArgument('--tag');

try {
  const target = resolveReleaseTarget(tag);
  const manifestPath = resolve(target.packagePath, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  if (manifest.name !== target.packageName) {
    throw new Error(
      `Release tag ${target.tag} targets ${target.packageName}, but ${manifestPath} contains ${String(manifest.name)}.`
    );
  }
  if (manifest.version !== target.version) {
    throw new Error(
      `Release tag ${target.tag} does not match ${target.packageName} version ${String(manifest.version)}.`
    );
  }

  const tagCommit = git('rev-list', '-n', '1', target.tag);
  const remoteBranch = `origin/${target.branch}`;
  git('rev-parse', '--verify', remoteBranch);
  try {
    git('merge-base', '--is-ancestor', tagCommit, remoteBranch);
  } catch {
    throw new Error(
      `Release tag ${target.tag} (${tagCommit}) is not contained in ${remoteBranch}.`
    );
  }

  process.stdout.write(
    `Verified ${target.tag} -> ${target.packageName}@${target.version} from ${target.branch}.\n`
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
