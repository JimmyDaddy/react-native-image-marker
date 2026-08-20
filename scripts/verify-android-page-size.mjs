import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
const ELF_CLASS_32 = 1;
const ELF_CLASS_64 = 2;
const ELF_DATA_LITTLE_ENDIAN = 1;
const PT_LOAD = 1;
export const MIN_ANDROID_PAGE_SIZE = 16_384n;

function assertRange(buffer, offset, length, label) {
  if (offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error(`${label} is outside the ELF file.`);
  }
}

function toSafeNumber(value, label) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} exceeds the supported file size.`);
  }
  return Number(value);
}

export function readLoadAlignments(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Expected an ELF file buffer.');
  }
  assertRange(buffer, 0, 16, 'ELF identification');
  if (!buffer.subarray(0, ELF_MAGIC.length).equals(ELF_MAGIC)) {
    throw new Error('File is not an ELF binary.');
  }
  if (buffer[5] !== ELF_DATA_LITTLE_ENDIAN) {
    throw new Error('Only little-endian Android ELF binaries are supported.');
  }

  const elfClass = buffer[4];
  let programHeaderOffset;
  let programHeaderEntrySize;
  let programHeaderCount;
  let alignmentOffset;
  let alignmentSize;

  if (elfClass === ELF_CLASS_32) {
    assertRange(buffer, 0, 52, 'ELF32 header');
    programHeaderOffset = buffer.readUInt32LE(28);
    programHeaderEntrySize = buffer.readUInt16LE(42);
    programHeaderCount = buffer.readUInt16LE(44);
    alignmentOffset = 28;
    alignmentSize = 4;
  } else if (elfClass === ELF_CLASS_64) {
    assertRange(buffer, 0, 64, 'ELF64 header');
    programHeaderOffset = toSafeNumber(
      buffer.readBigUInt64LE(32),
      'Program header offset'
    );
    programHeaderEntrySize = buffer.readUInt16LE(54);
    programHeaderCount = buffer.readUInt16LE(56);
    alignmentOffset = 48;
    alignmentSize = 8;
  } else {
    throw new Error(`Unsupported ELF class ${String(elfClass)}.`);
  }

  if (programHeaderEntrySize < alignmentOffset + alignmentSize) {
    throw new Error('ELF program header entry is too small.');
  }

  const alignments = [];
  for (let index = 0; index < programHeaderCount; index += 1) {
    const entryOffset = programHeaderOffset + index * programHeaderEntrySize;
    assertRange(
      buffer,
      entryOffset,
      programHeaderEntrySize,
      `Program header ${index}`
    );
    if (buffer.readUInt32LE(entryOffset) !== PT_LOAD) {
      continue;
    }
    const offset = entryOffset + alignmentOffset;
    alignments.push(
      alignmentSize === 8
        ? buffer.readBigUInt64LE(offset)
        : BigInt(buffer.readUInt32LE(offset))
    );
  }

  if (alignments.length === 0) {
    throw new Error('ELF binary has no loadable segments.');
  }
  return alignments;
}

function collectLibraries(inputPath) {
  const resolvedPath = path.resolve(inputPath);
  const stat = fs.statSync(resolvedPath);
  if (stat.isFile()) {
    return path.basename(resolvedPath) === 'libimage-marker-core.so'
      ? [resolvedPath]
      : [];
  }
  if (!stat.isDirectory()) {
    return [];
  }

  const libraries = [];
  for (const entry of fs.readdirSync(resolvedPath, { withFileTypes: true })) {
    const entryPath = path.join(resolvedPath, entry.name);
    if (entry.isDirectory()) {
      libraries.push(...collectLibraries(entryPath));
    } else if (entry.isFile() && entry.name === 'libimage-marker-core.so') {
      libraries.push(entryPath);
    }
  }
  return libraries;
}

export function verifyAndroidPageSize(inputPaths) {
  if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
    throw new Error('Provide at least one Android native library path.');
  }

  const libraries = [
    ...new Set(inputPaths.flatMap((inputPath) => collectLibraries(inputPath))),
  ].sort();
  if (libraries.length === 0) {
    throw new Error('No libimage-marker-core.so files were found.');
  }

  return libraries.map((libraryPath) => {
    const alignments = readLoadAlignments(fs.readFileSync(libraryPath));
    const invalid = alignments.filter(
      (alignment) => alignment < MIN_ANDROID_PAGE_SIZE
    );
    if (invalid.length > 0) {
      throw new Error(
        `${libraryPath} has LOAD alignment ${invalid
          .map((alignment) => `0x${alignment.toString(16)}`)
          .join(', ')}; expected at least 0x${MIN_ANDROID_PAGE_SIZE.toString(
          16
        )}.`
      );
    }
    return { libraryPath, alignments };
  });
}

function isMainModule() {
  return (
    typeof process.argv[1] === 'string' &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  );
}

if (isMainModule()) {
  try {
    const results = verifyAndroidPageSize(process.argv.slice(2));
    for (const { libraryPath, alignments } of results) {
      process.stdout.write(
        `Verified ${libraryPath}: ${alignments
          .map((alignment) => `0x${alignment.toString(16)}`)
          .join(', ')} LOAD alignment.\n`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
