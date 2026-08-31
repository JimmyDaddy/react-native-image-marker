/**
 * Legacy Core binding for editor source modules.
 *
 * The published editor package keeps its React Native Core contract here. The
 * standalone Web package compiles the same headless source graph with this
 * module replaced by its Web Core binding, which must preserve the Core Recipe
 * wrapper's migration and validation behavior.
 */
import Marker, {
  ImageFormat,
  migrateWatermarkRecipe,
  type ContentCredentialsAdapter,
  type ContentCredentialsClaim,
  type EmbedInvisibleWithCredentialsOptions,
  type EmbedInvisibleWithCredentialsResult,
  type EmbedInvisibleWatermarkOptions,
  type MarkerImageInfo,
  type MarkerJobOptions,
  type MarkerResult,
  type WatermarkRecipeDefinition,
  type WatermarkRecipeDefinitionLayer,
  type WatermarkRecipeDocument,
  type WatermarkRecipeLayer,
} from 'react-native-image-marker';

export default Marker;

export { ImageFormat, migrateWatermarkRecipe };

export type {
  ContentCredentialsAdapter,
  ContentCredentialsClaim,
  EmbedInvisibleWithCredentialsOptions,
  EmbedInvisibleWithCredentialsResult,
  EmbedInvisibleWatermarkOptions,
  MarkerImageInfo,
  MarkerJobOptions,
  MarkerResult,
  WatermarkRecipeDefinition,
  WatermarkRecipeDefinitionLayer,
  WatermarkRecipeDocument,
  WatermarkRecipeLayer,
};
