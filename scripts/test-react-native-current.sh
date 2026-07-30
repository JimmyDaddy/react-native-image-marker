#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
fixture_root="$(mktemp -d "${TMPDIR:-/tmp}/image-marker-rn-current.XXXXXX")"

cleanup() {
  if [[ "${KEEP_COMPAT_FIXTURE:-0}" == "1" ]]; then
    echo "Kept compatibility fixture at $fixture_root"
  else
    rm -rf "$fixture_root"
  fi
}
trap cleanup EXIT

package_version="$(node -p "require('$repo_root/package.json').version")"
package_tarball="$fixture_root/react-native-image-marker-$package_version.tgz"
recipe_version="$(node -p "require('$repo_root/packages/recipe/package.json').version")"
recipe_tarball="$fixture_root/image-marker-recipe-$recipe_version.tgz"

cd "$repo_root"
npm run build:recipe
npm pack --ignore-scripts --pack-destination "$fixture_root" ./packages/recipe >/dev/null
npm pack --ignore-scripts --pack-destination "$fixture_root" >/dev/null

cd "$fixture_root"
npx --yes @react-native-community/cli@20.2.0 init ImageMarkerCurrent \
  --version 0.86.0 \
  --pm npm \
  --install-pods false \
  --skip-git-init

cd "$fixture_root/ImageMarkerCurrent"
npm install --no-audit --no-fund "$recipe_tarball" "$package_tarball"
node - <<'NODE'
const packageJson = require('react-native-image-marker/package.json');
const reactNative = require('react-native/package.json');
if (reactNative.version !== '0.86.0') {
  throw new Error(`Expected React Native 0.86.0, received ${reactNative.version}`);
}
if (!packageJson.codegenConfig) {
  throw new Error('Package codegenConfig is missing from the installed tarball.');
}
console.log(
  `Installed react-native-image-marker ${packageJson.version} with React Native ${reactNative.version}.`
);
NODE

cd android
./gradlew :app:assembleDebug \
  -PreactNativeArchitectures=arm64-v8a \
  --stacktrace \
  --no-daemon
