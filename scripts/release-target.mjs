const CORE_V1_TAG = /^v(1\.\d+\.\d+)$/;
const CORE_V2_TAG = /^v(2\.\d+\.\d+(?:-(alpha|beta|rc)\.\d+)?)$/;
const EDITOR_TAG = /^editor-v(0\.\d+\.\d+(?:-next\.\d+)?)$/;
const RECIPE_TAG = /^recipe-v(0\.\d+\.\d+(?:-next\.\d+)?)$/;
const NODE_TAG = /^node-v(0\.\d+\.\d+(?:-next\.\d+)?)$/;
const CLI_TAG = /^cli-v(0\.\d+\.\d+(?:-next\.\d+)?)$/;

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
      npmTag: 'lts',
      additionalDistTags: [],
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
      channel: editor[1].includes('-next.') ? 'editor-prerelease' : 'editor',
    };
  }

  const recipe = normalizedTag.match(RECIPE_TAG);
  if (recipe) {
    return {
      tag: normalizedTag,
      packageName: '@image-marker/recipe',
      packagePath: 'packages/recipe',
      version: recipe[1],
      branch: 'release/2.0',
      npmTag: recipe[1].includes('-next.') ? 'next' : 'latest',
      additionalDistTags: [],
      channel: recipe[1].includes('-next.') ? 'recipe-prerelease' : 'recipe',
    };
  }

  const node = normalizedTag.match(NODE_TAG);
  if (node) {
    return {
      tag: normalizedTag,
      packageName: '@image-marker/node',
      packagePath: 'packages/node',
      version: node[1],
      branch: 'release/2.0',
      npmTag: node[1].includes('-next.') ? 'next' : 'latest',
      additionalDistTags: [],
      channel: node[1].includes('-next.') ? 'node-prerelease' : 'node',
    };
  }

  const cli = normalizedTag.match(CLI_TAG);
  if (cli) {
    return {
      tag: normalizedTag,
      packageName: '@image-marker/cli',
      packagePath: 'packages/cli',
      version: cli[1],
      branch: 'release/2.0',
      npmTag: cli[1].includes('-next.') ? 'next' : 'latest',
      additionalDistTags: [],
      channel: cli[1].includes('-next.') ? 'cli-prerelease' : 'cli',
    };
  }

  throw new Error(
    `Unsupported release tag "${normalizedTag}". Expected v1.x.y, v2.x.y[-alpha|beta|rc.n], editor-v0.x.y[-next.n], recipe-v0.x.y[-next.n], node-v0.x.y[-next.n], or cli-v0.x.y[-next.n].`
  );
}
