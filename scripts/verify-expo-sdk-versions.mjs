import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(
  process.argv[2] || path.join(scriptsDirectory, '..', 'expo-example')
);
const projectPackagePath = path.join(projectRoot, 'package.json');

if (!fs.existsSync(projectPackagePath)) {
  throw new Error(
    `Expo project package.json was not found: ${projectPackagePath}`
  );
}

const requireFromProject = createRequire(projectPackagePath);
const projectPackage = requireFromProject('./package.json');
const dependencies = projectPackage.dependencies || {};
let semver;
let expoPackage;
let bundledNativeModules;

try {
  semver = requireFromProject('semver');
  expoPackage = requireFromProject('expo/package.json');
  bundledNativeModules = requireFromProject('expo/bundledNativeModules.json');
} catch (error) {
  throw new Error(
    `Expo local SDK metadata is unavailable. Install the Expo example dependencies before verifying versions. ${String(
      error
    )}`
  );
}

if (
  !bundledNativeModules ||
  typeof bundledNativeModules !== 'object' ||
  Array.isArray(bundledNativeModules)
) {
  throw new Error(
    'Expo local SDK metadata is invalid: bundledNativeModules.json is not an object.'
  );
}

const failures = [];
let manifestChecks = 0;
let sdkChecks = 0;

function installedVersion(name) {
  try {
    const version = requireFromProject(`${name}/package.json`).version;
    if (typeof version !== 'string') {
      failures.push(`${name}: installed package has no string version`);
      return undefined;
    }
    return version;
  } catch {
    failures.push(`${name}: package is missing from node_modules`);
    return undefined;
  }
}

function assertVersion(name, expectedRange, actualVersion, source) {
  if (!semver.satisfies(actualVersion, expectedRange)) {
    failures.push(
      `${name}: ${source} expects ${expectedRange}, installed ${actualVersion}`
    );
  }
}

for (const name of Object.keys(dependencies).sort()) {
  const version = installedVersion(name);
  if (!version) continue;

  const declaredRange = dependencies[name];
  const declaredVersionRange = semver.validRange(declaredRange);
  if (declaredVersionRange) {
    manifestChecks += 1;
    assertVersion(name, declaredRange, version, 'expo-example/package.json');
  }

  if (Object.hasOwn(bundledNativeModules, name)) {
    const sdkRange = bundledNativeModules[name];
    if (
      typeof sdkRange !== 'string' ||
      !sdkRange.trim() ||
      !semver.validRange(sdkRange)
    ) {
      failures.push(
        `${name}: Expo local SDK metadata has an invalid range ${sdkRange}`
      );
      continue;
    }
    sdkChecks += 1;
    assertVersion(name, sdkRange, version, 'installed Expo SDK metadata');
  }
}

if (!dependencies.expo) {
  failures.push('expo: dependency is missing from expo-example/package.json');
}
if (sdkChecks === 0) {
  failures.push(
    'No direct app dependencies matched installed Expo SDK metadata.'
  );
}

if (failures.length) {
  throw new Error(
    `Expo local SDK version compatibility check failed:\n${failures
      .map((failure) => `- ${failure}`)
      .join('\n')}`
  );
}

console.log(
  `Verified ${manifestChecks} manifest version${
    manifestChecks === 1 ? '' : 's'
  } and ${sdkChecks} installed-Expo SDK version${
    sdkChecks === 1 ? '' : 's'
  } against Expo ${expoPackage.version} local compatibility metadata.`
);
