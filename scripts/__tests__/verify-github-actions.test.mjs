import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  findMutableActionReferences,
  verifyGitHubActions,
} from '../verify-github-actions.mjs';

test('detects mapping and sequence action references without immutable SHAs', () => {
  const failures = findMutableActionReferences(
    `
steps:
  - uses: actions/cache@v6
  - name: Setup
    uses: actions/setup-node@v7
`,
    'ci.yml'
  );

  assert.deepEqual(failures, [
    { filePath: 'ci.yml', line: 3, value: 'actions/cache@v6' },
    { filePath: 'ci.yml', line: 5, value: 'actions/setup-node@v7' },
  ]);
});

test('accepts immutable, local, and Docker action references', () => {
  const failures = findMutableActionReferences(`
steps:
  - uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6
  - uses: ./.github/actions/setup
  - uses: docker://alpine:3.23
`);

  assert.deepEqual(failures, []);
});

test('scans both yml and yaml files recursively', () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'image-marker-actions-check-')
  );
  const nested = path.join(root, 'nested');
  fs.mkdirSync(nested);
  fs.writeFileSync(
    path.join(root, 'valid.yml'),
    'steps:\n  - uses: ./local-action\n'
  );
  fs.writeFileSync(
    path.join(nested, 'invalid.yaml'),
    'steps:\n  - uses: owner/action@main\n'
  );

  try {
    const failures = verifyGitHubActions(root);
    assert.equal(failures.length, 1);
    assert.equal(failures[0]?.value, 'owner/action@main');
    assert.match(failures[0]?.filePath ?? '', /invalid\.yaml$/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
