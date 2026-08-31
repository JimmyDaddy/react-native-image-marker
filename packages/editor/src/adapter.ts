import {
  ImageFormat,
  type EmbedInvisibleWatermarkOptions,
  type EmbedInvisibleWithCredentialsOptions,
  type EmbedInvisibleWithCredentialsResult,
  type MarkerImageInfo,
  type MarkerJobOptions,
  type MarkerResult,
} from './core-contract';
import type {
  WatermarkRecipeDefinition,
  WatermarkRecipeInput,
} from '@image-marker/recipe';
import { fitEditorSizeWithinMax, projectEditorRecipe } from './projection';
import type {
  EditorExportResult,
  EditorRenderRequest,
  ImageMarkerEditorRenderAdapter,
} from './types';

/**
 * The smallest Core surface needed by the reusable editor renderer.
 *
 * It deliberately receives the engine instead of importing a platform Marker
 * implementation. Legacy `core-adapter` passes the native-aware Core binding;
 * the standalone Web package passes the Canvas Web binding.
 */
export interface EditorMarkerEngine {
  getImageInfo(source: unknown): Promise<MarkerImageInfo>;
  createRecipe(recipe: WatermarkRecipeDefinition): {
    apply(
      input: WatermarkRecipeInput,
      control?: MarkerJobOptions
    ): Promise<MarkerResult>;
  };
  embedInvisible(
    options: EmbedInvisibleWatermarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult>;
  embedInvisibleWithCredentials(
    options: EmbedInvisibleWithCredentialsOptions,
    control?: MarkerJobOptions
  ): Promise<EmbedInvisibleWithCredentialsResult>;
}

function withMaxSize(
  recipe: WatermarkRecipeDefinition,
  maxSize: number | undefined
): WatermarkRecipeDefinition {
  return {
    schemaVersion: 2,
    layers: recipe.layers,
    output: {
      ...recipe.output,
      maxSize: maxSize ?? recipe.output.maxSize,
    },
  };
}

function signedResult(
  watermarked: MarkerResult,
  signedImage: string
): MarkerResult {
  return {
    ...watermarked,
    uri: signedImage,
    output: signedImage.startsWith('data:') ? 'data-url' : 'file',
  };
}

function toCoreSaveFormat(
  value: WatermarkRecipeDefinition['output']['saveFormat']
): ImageFormat | undefined {
  switch (value) {
    case 'jpg':
      return ImageFormat.jpg;
    case 'png':
      return ImageFormat.png;
    case 'webp':
      return ImageFormat.webp;
    case 'base64':
      return ImageFormat.base64;
    default:
      return undefined;
  }
}

/**
 * Bind editor rendering to a supplied Core-compatible Marker engine.
 *
 * No static Marker implementation is imported here, so the same adapter logic
 * can be used by React Native Core and a browser-only Web Core binding.
 */
export function createEditorRenderAdapter(
  engine: EditorMarkerEngine,
  previewMaxSize = 1024
): ImageMarkerEditorRenderAdapter {
  const getSourceInfo = (source: unknown): Promise<MarkerImageInfo> =>
    engine.getImageInfo(source);

  const renderVisible = async (
    request: EditorRenderRequest,
    maxSize?: number
  ): Promise<MarkerResult> => {
    const sourceSize =
      request.sourceSize ??
      (await getSourceInfo(request.input.backgroundImage.src));
    const targetSize = maxSize
      ? fitEditorSizeWithinMax(sourceSize, maxSize)
      : undefined;
    const recipe =
      targetSize &&
      (targetSize.width !== sourceSize.width ||
        targetSize.height !== sourceSize.height)
        ? projectEditorRecipe(request.recipe, sourceSize, targetSize)
        : request.recipe;
    return engine
      .createRecipe(withMaxSize(recipe, maxSize))
      .apply(request.input, request.control);
  };

  return {
    getSourceInfo,

    renderPreview(request) {
      return renderVisible(request, request.maxSize ?? previewMaxSize);
    },

    async exportOriginal(request): Promise<EditorExportResult> {
      const visible = await renderVisible(
        request,
        request.recipe.output.maxSize
      );
      const invisible = request.options?.invisible;
      const credentials = request.options?.contentCredentials;

      if (credentials && !invisible) {
        throw new Error(
          'Content Credentials export requires invisible locator options so the signed claim can reference a stable locator.'
        );
      }
      if (invisible && credentials) {
        const result = await engine.embedInvisibleWithCredentials(
          {
            watermark: {
              image: { src: visible.uri },
              ...invisible,
              saveFormat: toCoreSaveFormat(request.recipe.output.saveFormat),
              quality: request.recipe.output.quality,
              maxSize: request.recipe.output.maxSize,
            },
            adapter: credentials.adapter,
            claim: credentials.claim,
          },
          request.control
        );
        return {
          visible,
          final: signedResult(result.watermarkedImage, result.signedImage),
        };
      }
      if (invisible) {
        const final = await engine.embedInvisible(
          {
            image: { src: visible.uri },
            ...invisible,
            saveFormat: toCoreSaveFormat(request.recipe.output.saveFormat),
            quality: request.recipe.output.quality,
            maxSize: request.recipe.output.maxSize,
          },
          request.control
        );
        return { visible, final };
      }
      return { visible, final: visible };
    },
  };
}

export type {
  EditorExportResult,
  EditorRenderRequest,
  ImageMarkerEditorRenderAdapter,
} from './types';
