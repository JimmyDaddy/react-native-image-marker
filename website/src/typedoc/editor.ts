/**
 * Documentation-only barrel that mirrors both public Editor package
 * entrypoints without changing the runtime package boundary.
 */
export * from '../../../packages/editor/src/index';
export { createCoreEditorAdapter } from '../../../packages/editor/src/core-adapter';
