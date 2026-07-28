const CORE_V1_TAG = /^v(1\.\d+\.\d+)$/;
const CORE_V2_TAG =
  /^v(2\.\d+\.\d+(?:-(alpha|beta|rc)\.\d+)?)$/;
const EDITOR_TAG =
  /^editor-v(0\.\d+\.\d+(?:-next\.\d+)?)$/;

/**
 * Resolve a release tag into the only package, branch, and npm dist-tag that
 * it is allowed to publish.
 */
export function resolveReleaseTarget(tag) {
  if (typeof tag !== 'string' || !tag.trim()) {
    throw new Error('A release tag is required.');
  }

  const normalizedTag = tag.trim();
  const v1 = normalizedTag.match(CORE_V1_TAG);
  if (v1) {
    return {
      tag: normalizedTag,
      packageName: 'react-native-image-marker',
      packagePath: '.',
      version: v1[1],
      branch: 'release/1.x',
      npmTag: 'v1',
      additionalDistTags: ['lts'],
      channel: 'core-v1',
    };
  }

  const v2 = normalizedTag.match(CORE_V2_TAG);
  if (v2) {
    return {
      tag: normalizedTag,
      packageName: 'react-native-image-marker',
      packagePath: '.',
      version: v2[1],
      branch: 'release/2.0',
      npmTag: v2[2] ? 'next' : 'latest',
      additionalDistTags: [],
      channel: v2[2] ? 'core-v2-prerelease' : 'core-v2',
    };
  }

  const editor = normalizedTag.match(EDITOR_TAG);
  if (editor) {
    return {
      tag: normalizedTag,
      packageName: 'react-native-image-marker-editor',
      packagePath: 'packages/editor',
      version: editor[1],
      branch: 'release/2.0',
      npmTag: editor[1].includes('-next.') ? 'next' : 'latest',
      additionalDistTags: [],
      channel: editor[1].includes('-next.')
        ? 'editor-prerelease'
        : 'editor',
    };
  }

  throw new Error(
    `Unsupported release tag "${normalizedTag}". Expected v1.x.y, v2.x.y[-alpha|beta|rc.n], or editor-v0.x.y[-next.n].`
  );
}
