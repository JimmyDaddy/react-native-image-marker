import Marker, { type MarkerImageInfo } from './core-contract';
import { createEditorRenderAdapter } from './adapter';
import type { ImageMarkerEditorRenderAdapter } from './types';

/** Resolve dimensions through the original Core binding selected by Metro. */
export function resolveCoreEditorSourceInfo(
  source: unknown
): Promise<MarkerImageInfo> {
  return Marker.getImageInfo(source as never);
}

/**
 * Lightweight default adapter. Import this opt-in entry only when the editor
 * should invoke Core directly; applications can inject a server or custom
 * preview adapter through the main package without importing this module.
 */
export function createCoreEditorAdapter(
  previewMaxSize = 1024
): ImageMarkerEditorRenderAdapter {
  return createEditorRenderAdapter(Marker, previewMaxSize);
}
