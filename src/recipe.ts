import type {
  CornerRadius,
  ImageOptions,
  MarkOptions,
  PositionOptions,
  TextBackgroundStyle,
  TextStyle,
  WatermarkLayer,
  WatermarkLayout,
} from './index';
import { validateMarkOptions } from './validate';

export type WatermarkRecipeOptions = Omit<
  MarkOptions,
  | 'backgroundImage'
  | 'filename'
  | 'watermarks'
  | 'watermarkTexts'
  | 'watermarkImage'
  | 'watermarkPositions'
  | 'watermarkImages'
> & {
  /** Ordered layers reused for every input image. */
  watermarks: readonly WatermarkLayer[];
};

export interface WatermarkRecipeInput {
  /** Source image processed by this recipe invocation. */
  backgroundImage: ImageOptions;
  /** Optional output basename for this input. */
  filename?: string;
}

export interface WatermarkRecipe<Result = string> {
  /** Apply the saved layers and output settings to one source image. */
  apply(input: WatermarkRecipeInput): Promise<Result>;
}

type RecipeRenderer<Result> = (options: MarkOptions) => Promise<Result>;

function clonePosition(
  position: PositionOptions | undefined
): PositionOptions | undefined {
  return position ? { ...position } : position;
}

function cloneLayout(
  layout: WatermarkLayout | undefined
): WatermarkLayout | undefined {
  return layout ? { ...layout } : layout;
}

function cloneCornerRadius(
  cornerRadius: CornerRadius | undefined
): CornerRadius | undefined {
  if (!cornerRadius) {
    return cornerRadius;
  }
  return {
    topLeft: cornerRadius.topLeft ? { ...cornerRadius.topLeft } : undefined,
    topRight: cornerRadius.topRight ? { ...cornerRadius.topRight } : undefined,
    bottomLeft: cornerRadius.bottomLeft
      ? { ...cornerRadius.bottomLeft }
      : undefined,
    bottomRight: cornerRadius.bottomRight
      ? { ...cornerRadius.bottomRight }
      : undefined,
    all: cornerRadius.all ? { ...cornerRadius.all } : undefined,
  };
}

function cloneTextBackgroundStyle(
  style: TextBackgroundStyle | null | undefined
): TextBackgroundStyle | null | undefined {
  if (!style) {
    return style;
  }
  return {
    ...style,
    cornerRadius: cloneCornerRadius(style.cornerRadius),
  };
}

function cloneTextStyle(style: TextStyle | undefined): TextStyle | undefined {
  if (!style) {
    return style;
  }
  return {
    ...style,
    shadowStyle: style.shadowStyle
      ? { ...style.shadowStyle }
      : style.shadowStyle,
    strokeStyle: style.strokeStyle
      ? { ...style.strokeStyle }
      : style.strokeStyle,
    textBackgroundStyle: cloneTextBackgroundStyle(style.textBackgroundStyle),
  };
}

function cloneLayers(layers: readonly WatermarkLayer[]): WatermarkLayer[] {
  return layers.map((layer) => {
    if (layer.type === 'text') {
      return {
        ...layer,
        position: clonePosition(layer.position),
        positionOptions: clonePosition(layer.positionOptions),
        layout: cloneLayout(layer.layout),
        style: cloneTextStyle(layer.style),
      };
    }
    return {
      ...layer,
      position: clonePosition(layer.position),
      layout: cloneLayout(layer.layout),
    };
  });
}

function snapshotRecipeOptions(options: WatermarkRecipeOptions): MarkOptions {
  if (!options || !Array.isArray(options.watermarks)) {
    throw new Error('createRecipe requires an ordered watermarks array.');
  }
  const runtimeOptions = options as WatermarkRecipeOptions &
    Record<string, unknown>;
  const unsupportedKey = [
    'backgroundImage',
    'filename',
    'watermarkTexts',
    'watermarkImage',
    'watermarkPositions',
    'watermarkImages',
  ].find((key) => Object.prototype.hasOwnProperty.call(runtimeOptions, key));
  if (unsupportedKey) {
    throw new Error(
      `createRecipe does not accept "${unsupportedKey}"; use ordered watermarks and pass per-image fields to apply().`
    );
  }
  if (options.watermarks.length === 0) {
    throw new Error('createRecipe requires at least one watermark layer.');
  }
  for (const layer of options.watermarks) {
    if (
      !layer ||
      typeof layer !== 'object' ||
      (layer.type !== 'text' && layer.type !== 'image')
    ) {
      throw new Error('watermark type must be either "text" or "image".');
    }
    if (layer.type === 'text' && typeof layer.text !== 'string') {
      throw new Error('text is required.');
    }
    if (layer.type === 'image' && !layer.src) {
      throw new Error('please set mark image!');
    }
  }

  const snapshot: MarkOptions = {
    backgroundImage: { src: 'recipe-validation-placeholder' },
    watermarks: cloneLayers(options.watermarks),
  };
  if (options.quality !== undefined) snapshot.quality = options.quality;
  if (options.saveFormat !== undefined)
    snapshot.saveFormat = options.saveFormat;
  if (options.matteColor !== undefined)
    snapshot.matteColor = options.matteColor;
  if (options.rotationCanvasMode !== undefined) {
    snapshot.rotationCanvasMode = options.rotationCanvasMode;
  }
  if (options.maxSize !== undefined) snapshot.maxSize = options.maxSize;

  validateMarkOptions(snapshot);
  return snapshot;
}

function snapshotInput(input: WatermarkRecipeInput): WatermarkRecipeInput {
  return {
    backgroundImage: input?.backgroundImage
      ? { ...input.backgroundImage }
      : input?.backgroundImage,
    filename: input?.filename,
  };
}

function createMarkOptions(
  recipe: MarkOptions,
  input: WatermarkRecipeInput
): MarkOptions {
  return {
    ...recipe,
    backgroundImage: { ...input.backgroundImage },
    watermarks: cloneLayers(recipe.watermarks ?? []),
    filename: input.filename,
  };
}

export function createWatermarkRecipe<Result>(
  options: WatermarkRecipeOptions,
  renderer: RecipeRenderer<Result>
): WatermarkRecipe<Result> {
  const recipe = snapshotRecipeOptions(options);

  const applySnapshot = (input: WatermarkRecipeInput): Promise<Result> => {
    if (!input?.backgroundImage?.src) {
      return Promise.reject(new Error('please set image!'));
    }
    return renderer(createMarkOptions(recipe, input));
  };

  return {
    apply(input) {
      return applySnapshot(snapshotInput(input));
    },
  };
}
