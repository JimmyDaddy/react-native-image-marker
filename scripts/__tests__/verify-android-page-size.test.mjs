import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  MIN_ANDROID_PAGE_SIZE,
  readLoadAlignments,
  verifyAndroidPageSize,
} from '../verify-android-page-size.mjs';

function createElf({ elfClass = 2, alignments }) {
  const is64Bit = elfClass === 2;
  const headerSize = is64Bit ? 64 : 52;
  const programHeaderSize = is64Bit ? 56 : 32;
  const buffer = Buffer.alloc(
    headerSize + programHeaderSize * alignments.length
  );
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]).copy(buffer);
  buffer[4] = elfClass;
  buffer[5] = 1;

  if (is64Bit) {
    buffer.writeBigUInt64LE(BigInt(headerSize), 32);
    buffer.writeUInt16LE(programHeaderSize, 54);
    buffer.writeUInt16LE(alignments.length, 56);
  } else {
    buffer.writeUInt32LE(headerSize, 28);
    buffer.writeUInt16LE(programHeaderSize, 42);
    buffer.writeUInt16LE(alignments.length, 44);
  }

  alignments.forEach((alignment, index) => {
    const entryOffset = headerSize + index * programHeaderSize;
    buffer.writeUInt32LE(1, entryOffset);
    if (is64Bit) {
      buffer.writeBigUInt64LE(BigInt(alignment), entryOffset + 48);
    } else {
      buffer.writeUInt32LE(Number(alignment), entryOffset + 28);
    }
  });
  return buffer;
}

test('reads LOAD alignment from 32-bit and 64-bit Android ELF files', () => {
  assert.deepEqual(
    readLoadAlignments(createElf({ elfClass: 1, alignments: [16_384] })),
    [MIN_ANDROID_PAGE_SIZE]
  );
  assert.deepEqual(
    readLoadAlignments(
      createElf({ elfClass: 2, alignments: [16_384, 65_536] })
    ),
    [MIN_ANDROID_PAGE_SIZE, 65_536n]
  );
});

test('rejects a native library with 4 KB LOAD alignment', () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'image-marker-page-size-')
  );
  const libraryPath = path.join(root, 'libimage-marker-core.so');
  fs.writeFileSync(libraryPath, createElf({ alignments: [4_096] }));

  try {
    assert.throws(
      () => verifyAndroidPageSize([root]),
      /LOAD alignment 0x1000; expected at least 0x4000/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('accepts every matching native library when all LOAD segments align', () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'image-marker-page-size-')
  );
  for (const abi of ['arm64-v8a', 'x86_64']) {
    const directory = path.join(root, abi);
    fs.mkdirSync(directory);
    fs.writeFileSync(
      path.join(directory, 'libimage-marker-core.so'),
      createElf({ alignments: [16_384, 16_384] })
    );
  }

  try {
    const results = verifyAndroidPageSize([root]);
    assert.equal(results.length, 2);
    assert.ok(
      results.every(({ alignments }) =>
        alignments.every((alignment) => alignment >= MIN_ANDROID_PAGE_SIZE)
      )
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
