import Marker from '../../../src/web';
import { createEditorRenderAdapter } from '../../editor/src/adapter';
import type { EditorMarkerEngine } from '../../editor/src/adapter';
import type {
  ImageMarkerEditorRenderAdapter,
  MarkerImageInfo,
} from '../../editor/src/types';

export type { EditorMarkerEngine } from '../../editor/src/adapter';

/** Bind the shared editor renderer to Canvas or an isolated Web Marker instance. */
export function createWebEditorAdapter(
  previewMaxSize = 1024,
  marker: EditorMarkerEngine = Marker
): ImageMarkerEditorRenderAdapter {
  return createEditorRenderAdapter(marker, previewMaxSize);
}

/** Read local file bytes first; the default browser fallback remains available. */
export function resolveWebEditorSourceInfo(
  source: unknown
): Promise<MarkerImageInfo> {
  return Marker.getImageInfo(source);
}
