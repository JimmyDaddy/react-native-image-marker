import { appendFile } from 'node:fs/promises';
import { resolveReleaseTarget } from './release-target.mjs';

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const tag = readArgument('--tag');
const githubOutput = readArgument('--github-output');

try {
  const target = resolveReleaseTarget(tag);
  if (githubOutput) {
    const values = {
      tag: target.tag,
      package_name: target.packageName,
      package_path: target.packagePath,
      version: target.version,
      branch: target.branch,
      npm_tag: target.npmTag,
      additional_dist_tags: target.additionalDistTags.join(','),
      channel: target.channel,
    };
    await appendFile(
      githubOutput,
      Object.entries(values)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n',
      'utf8'
    );
  } else {
    process.stdout.write(`${JSON.stringify(target, null, 2)}\n`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
