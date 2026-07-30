import type {
  ContentCredentialsAdapter,
  ContentCredentialsClaim,
  MarkerImageInfo,
  MarkerJobOptions,
  MarkerResult,
} from 'react-native-image-marker';
import type {
  WatermarkBlendMode,
  WatermarkRecipeDefinition,
  WatermarkRecipeDefinitionLayer,
  WatermarkRecipeDocument,
  WatermarkRecipeInput,
  WatermarkTextStyle,
} from '@image-marker/recipe';

export interface EditorPoint {
  x: number;
  y: number;
}

export interface EditorSize {
  width: number;
  height: number;
}

export interface EditorRect extends EditorPoint, EditorSize {}

export interface EditorViewportState {
  zoom: number;
  pan: EditorPoint;
  fitMode: 'contain' | 'manual';
}

export interface EditorSafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type EditorSnapGuide =
  | { axis: 'x'; position: number; kind: 'edge' | 'center' | 'safe-area' }
  | { axis: 'y'; position: number; kind: 'edge' | 'center' | 'safe-area' };

export interface EditorInvisibleExport {
  payload: string;
  key: string;
  strength?: 'subtle' | 'balanced' | 'robust';
}

export interface EditorContentCredentialsExport {
  adapter: ContentCredentialsAdapter;
  claim: ContentCredentialsClaim;
}

export interface EditorExportOptions {
  invisible?: EditorInvisibleExport;
  contentCredentials?: EditorContentCredentialsExport;
}

export interface EditorState {
  recipe: WatermarkRecipeDefinition;
  /** Ordered selection. The final item is the primary selection. */
  selectedLayerIds: readonly string[];
  /** Convenience alias for the primary selection. */
  selectedLayerId?: string;
  safeArea: EditorSafeArea;
  snapGuides: readonly EditorSnapGuide[];
  exportOptions: EditorExportOptions;
  viewport: EditorViewportState;
  canUndo: boolean;
  canRedo: boolean;
}

export type EditorSelectionMode = 'replace' | 'add' | 'toggle';
export type EditorAlignment =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom';
export type EditorDistribution = 'horizontal' | 'vertical';

export interface EditorLayerBounds extends EditorRect {
  id: string;
}

export interface EditorClipboardDocument {
  kind: 'image-marker/editor-layers';
  version: 1;
  layers: WatermarkRecipeDefinitionLayer[];
}

export type EditorTextLayerPatch = {
  text?: string;
  name?: string;
  alpha?: number;
  blendMode?: WatermarkBlendMode;
  style?: Partial<WatermarkTextStyle>;
};

export interface EditorAsset<Source = unknown> {
  id: string;
  name: string;
  source: Source;
  thumbnail?: Source;
  tags?: readonly string[];
}

export interface EditorBrandKit<Source = unknown> {
  colors?: readonly string[];
  fonts?: readonly string[];
  logos?: readonly EditorAsset<Source>[];
}

export interface EditorTemplate<Source = unknown> {
  id: string;
  name: string;
  description?: string;
  recipe: WatermarkRecipeDocument<Source>;
  brandKit?: EditorBrandKit<Source>;
}

export interface EditorPersistenceAdapter {
  load(key: string): string | null | Promise<string | null>;
  save(key: string, value: string): void | Promise<void>;
  remove?(key: string): void | Promise<void>;
}

export interface EditorAutosaveOptions {
  key: string;
  storage: EditorPersistenceAdapter;
  debounceMs?: number;
  onError?: (error: Error) => void;
}

export interface ImageMarkerEditorControllerOptions {
  document: WatermarkRecipeDocument;
  historyLimit?: number;
  autosave?: EditorAutosaveOptions;
  onChange?: (state: EditorState) => void;
}

export interface EditorSerializedState {
  version: 1;
  recipe: WatermarkRecipeDefinition;
  selectedLayerIds: string[];
  safeArea: EditorSafeArea;
  /**
   * Reserved for non-sensitive application metadata. Core signing adapters,
   * invisible-watermark keys, and export credentials are never autosaved.
   */
  exportOptions?: EditorExportOptions;
  viewport: EditorViewportState;
}

export interface EditorSnapContext {
  canvas: EditorSize;
  layer: EditorSize;
  safeArea?: EditorSafeArea;
  threshold?: number;
}

export interface EditorKeyCommand {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export interface EditorRenderRequest {
  recipe: WatermarkRecipeDefinition;
  input: WatermarkRecipeInput;
  /**
   * Pixel dimensions of the background before Core applies output.maxSize.
   * Providing this keeps numeric Recipe coordinates visually stable between
   * the interactive surface, bounded previews, and original export.
   */
  sourceSize?: EditorSize;
  control?: MarkerJobOptions;
}

export interface EditorExportResult {
  visible: MarkerResult;
  final: MarkerResult;
}

/**
 * Rendering remains injectable. The editor package owns interaction state,
 * while Core or an application adapter owns image decoding and encoding.
 */
export interface ImageMarkerEditorRenderAdapter {
  getSourceInfo?(source: unknown): Promise<MarkerImageInfo>;
  renderPreview(
    request: EditorRenderRequest & { maxSize?: number }
  ): Promise<MarkerResult>;
  exportOriginal(
    request: EditorRenderRequest & { options?: EditorExportOptions }
  ): Promise<EditorExportResult>;
}

export type {
  MarkerImageInfo,
  WatermarkBlendMode,
  WatermarkRecipeDefinition,
  WatermarkRecipeDefinitionLayer,
  WatermarkRecipeDocument,
  WatermarkRecipeInput,
  WatermarkTextStyle,
};
