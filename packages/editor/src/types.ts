import type {
  ContentCredentialsAdapter,
  ContentCredentialsClaim,
  MarkerJobOptions,
  MarkerResult,
  WatermarkRecipeDefinition,
  WatermarkRecipeDefinitionLayer,
  WatermarkRecipeDocument,
  WatermarkRecipeInput,
} from 'react-native-image-marker';

export interface EditorPoint {
  x: number;
  y: number;
}

export interface EditorSize {
  width: number;
  height: number;
}

export interface EditorRect extends EditorPoint, EditorSize {}

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
  selectedLayerId?: string;
  safeArea: EditorSafeArea;
  snapGuides: readonly EditorSnapGuide[];
  exportOptions: EditorExportOptions;
  canUndo: boolean;
  canRedo: boolean;
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
  renderPreview(
    request: EditorRenderRequest & { maxSize?: number }
  ): Promise<MarkerResult>;
  exportOriginal(
    request: EditorRenderRequest & { options?: EditorExportOptions }
  ): Promise<EditorExportResult>;
}

export type {
  WatermarkRecipeDefinition,
  WatermarkRecipeDefinitionLayer,
  WatermarkRecipeDocument,
  WatermarkRecipeInput,
};
