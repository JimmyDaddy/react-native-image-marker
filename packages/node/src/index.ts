import { createNodeImageMarker } from './renderer';

export * from '@image-marker/recipe';
export { createNodeImageMarker } from './renderer';
export type {
  NodeBatchAbortedResult,
  NodeBatchFulfilledResult,
  NodeBatchItemResult,
  NodeBatchProgress,
  NodeBatchRejectedResult,
  NodeBatchRenderOptions,
  NodeFileRenderResult,
  NodeImageFormat,
  NodeImageInfo,
  NodeImageMarker,
  NodeImageMarkerOptions,
  NodeImageSource,
  NodeInvisibleDetectOptions,
  NodeInvisibleDetectionResult,
  NodeInvisibleEmbedOptions,
  NodeRecipeDefinition,
  NodeRecipeDocument,
  NodeRenderInput,
  NodeRenderOptions,
  NodeRenderPhase,
  NodeRenderProgress,
  NodeRenderResult,
} from './types';

/** Lazy default renderer. Sharp is imported only when an image method runs. */
export const nodeImageMarker = createNodeImageMarker();

export const inspectNodeImage = nodeImageMarker.inspect;
export const renderNodeImage = nodeImageMarker.render;
export const renderNodeImageToFile = nodeImageMarker.renderToFile;
export const renderNodeImageToStream = nodeImageMarker.renderToStream;
export const renderNodeImages = nodeImageMarker.renderMany;
export const embedNodeInvisibleLocator = nodeImageMarker.embedInvisible;
export const detectNodeInvisibleLocator = nodeImageMarker.detectInvisible;

export default nodeImageMarker;
