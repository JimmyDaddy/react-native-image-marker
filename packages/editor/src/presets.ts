import {
  materializeWatermarkRecipe,
  migrateWatermarkRecipe,
  type WatermarkRecipeDefinition,
  type WatermarkRecipeLayer,
  type WatermarkRecipeVariableContext,
} from '@image-marker/recipe';
import type { EditorAsset, EditorBrandKit, EditorTemplate } from './types';

function assertIdentifier(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

export function createEditorBrandKit<Source = unknown>(
  brandKit: EditorBrandKit<Source>
): EditorBrandKit<Source> {
  return {
    colors: brandKit.colors
      ? [...new Set(brandKit.colors.map((color) => color.trim()))].filter(
          Boolean
        )
      : undefined,
    fonts: brandKit.fonts
      ? [...new Set(brandKit.fonts.map((font) => font.trim()))].filter(Boolean)
      : undefined,
    logos: brandKit.logos?.map((logo) => ({ ...logo })),
  };
}

export function createEditorTemplate<Source = unknown>(
  template: EditorTemplate<Source>
): EditorTemplate<Source> {
  return {
    ...template,
    id: assertIdentifier(template.id, 'Template id'),
    name: assertIdentifier(template.name, 'Template name'),
    recipe: migrateWatermarkRecipe(template.recipe),
    brandKit: template.brandKit
      ? createEditorBrandKit(template.brandKit)
      : undefined,
  };
}

/**
 * Resolves `{{variable}}` placeholders and conditional layers with the same
 * Recipe materializer used by Core, Node, and CLI.
 */
export function materializeEditorTemplate<Source = unknown>(
  template: EditorTemplate<Source>,
  context: WatermarkRecipeVariableContext
): WatermarkRecipeDefinition<Source> {
  return materializeWatermarkRecipe(template.recipe, context);
}

export function createBrandTextLayer(
  text: string,
  brandKit: EditorBrandKit,
  overrides: Partial<Extract<WatermarkRecipeLayer, { type: 'text' }>> = {}
): Extract<WatermarkRecipeLayer, { type: 'text' }> {
  return {
    type: 'text',
    text,
    ...overrides,
    style: {
      color: brandKit.colors?.[0] ?? '#FFFFFF',
      fontName: brandKit.fonts?.[0],
      fontSize: 36,
      ...overrides.style,
    },
  };
}

export function createBrandLogoLayer<Source>(
  asset: EditorAsset<Source>,
  overrides: Partial<
    Extract<WatermarkRecipeLayer<Source>, { type: 'image' }>
  > = {}
): Extract<WatermarkRecipeLayer<Source>, { type: 'image' }> {
  return {
    type: 'image',
    src: asset.source,
    name: asset.name,
    ...overrides,
  };
}
