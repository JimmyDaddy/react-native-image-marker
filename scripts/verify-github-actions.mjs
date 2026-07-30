import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ACTION_REFERENCE =
  /^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/gm;
const IMMUTABLE_REMOTE_REFERENCE = /^[^@]+@[0-9a-f]{40}$/;

function walkYamlFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkYamlFiles(fullPath));
    } else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

export function findMutableActionReferences(content, filePath = '<workflow>') {
  const failures = [];
  for (const match of content.matchAll(ACTION_REFERENCE)) {
    const value = match[1];
    if (
      value.startsWith('./') ||
      value.startsWith('docker://') ||
      IMMUTABLE_REMOTE_REFERENCE.test(value)
    ) {
      continue;
    }

    const line = content.slice(0, match.index).split('\n').length;
    failures.push({ filePath, line, value });
  }
  return failures;
}

export function verifyGitHubActions(root = '.github') {
  return walkYamlFiles(root).flatMap((filePath) =>
    findMutableActionReferences(
      fs.readFileSync(filePath, 'utf8'),
      path.relative(process.cwd(), filePath)
    )
  );
}

function main() {
  const root = process.argv[2] ?? '.github';
  const failures = verifyGitHubActions(root);
  if (failures.length > 0) {
    const details = failures
      .map(({ filePath, line, value }) => `${filePath}:${line}: ${value}`)
      .join('\n');
    throw new Error(
      `Remote GitHub Actions must use a full commit SHA:\n${details}`
    );
  }
  console.log('Verified immutable GitHub Actions references.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
