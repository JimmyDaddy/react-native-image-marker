import Marker, {
  type MarkerResult,
  type WatermarkRecipeDefinition,
} from 'react-native-image-marker';
import type {
  EditorExportResult,
  EditorRenderRequest,
  ImageMarkerEditorRenderAdapter,
} from './types';

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

/**
 * Lightweight default adapter. Import this opt-in entry only when the editor
 * should invoke Core directly; applications can inject a server or custom
 * preview adapter through the main package without importing this module.
 */
export function createCoreEditorAdapter(
  previewMaxSize = 1024
): ImageMarkerEditorRenderAdapter {
  const renderVisible = (request: EditorRenderRequest, maxSize?: number) =>
    Marker.createRecipe(withMaxSize(request.recipe, maxSize)).apply(
      request.input,
      request.control
    );

  return {
    renderPreview(request) {
      return renderVisible(request, request.maxSize ?? previewMaxSize);
    },

    async exportOriginal(request): Promise<EditorExportResult> {
      const visible = await renderVisible(request);
      const invisible = request.options?.invisible;
      const credentials = request.options?.contentCredentials;

      if (credentials && !invisible) {
        throw new Error(
          'Content Credentials export requires invisible locator options so the signed claim can reference a stable locator.'
        );
      }
      if (invisible && credentials) {
        const result = await Marker.embedInvisibleWithCredentials(
          {
            watermark: {
              image: { src: visible.uri },
              ...invisible,
              saveFormat: request.recipe.output.saveFormat,
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
        const final = await Marker.embedInvisible(
          {
            image: { src: visible.uri },
            ...invisible,
            saveFormat: request.recipe.output.saveFormat,
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
