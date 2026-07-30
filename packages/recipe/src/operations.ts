import { cloneRecipeValue } from './clone';
import { migrateWatermarkRecipe } from './migration';
import type {
  WatermarkRecipeDefinition,
  WatermarkRecipeDefinitionLayer,
  WatermarkRecipeDocument,
  WatermarkRecipeLayer,
} from './types';
import { createWatermarkRecipeDefinition } from './validation';

function layerIndex<Source>(
  recipe: WatermarkRecipeDefinition<Source>,
  id: string
): number {
  const index = recipe.layers.findIndex((layer) => layer.id === id);
  if (index < 0) throw new Error(`Unknown layer id "${id}".`);
  return index;
}

function uniqueId<Source>(
  recipe: WatermarkRecipeDefinition<Source>,
  requested: string
): string {
  const ids = new Set(recipe.layers.map((layer) => layer.id));
  if (!ids.has(requested)) return requested;
  let sequence = 2;
  while (ids.has(`${requested}-${sequence}`)) sequence += 1;
  return `${requested}-${sequence}`;
}

function commit<Source>(
  recipe: WatermarkRecipeDefinition<Source>
): WatermarkRecipeDefinition<Source> {
  return createWatermarkRecipeDefinition(recipe);
}

export function addWatermarkRecipeLayer<Source>(
  document: WatermarkRecipeDocument<Source>,
  layer: WatermarkRecipeLayer<Source>,
  index?: number
): WatermarkRecipeDefinition<Source> {
  const recipe = migrateWatermarkRecipe<Source>(document);
  const id = uniqueId(recipe, layer.id ?? `layer-${recipe.layers.length + 1}`);
  const insertion =
    index === undefined
      ? recipe.layers.length
      : Math.max(0, Math.min(Math.trunc(index), recipe.layers.length));
  recipe.layers.splice(insertion, 0, {
    ...cloneRecipeValue(layer),
    id,
  } as WatermarkRecipeDefinitionLayer<Source>);
  return commit(recipe);
}

export function updateWatermarkRecipeLayer<Source>(
  document: WatermarkRecipeDocument<Source>,
  id: string,
  patch: Partial<WatermarkRecipeLayer<Source>>
): WatermarkRecipeDefinition<Source> {
  const recipe = migrateWatermarkRecipe<Source>(document);
  const index = layerIndex(recipe, id);
  if (patch.id !== undefined && patch.id !== id) {
    throw new Error('Layer IDs cannot be changed through update operations.');
  }
  const current = recipe.layers[index];
  if (!current) throw new Error(`Unknown layer id "${id}".`);
  if (patch.type !== undefined && patch.type !== current.type) {
    throw new Error('Layer types cannot be changed through update operations.');
  }
  recipe.layers[index] = {
    ...current,
    ...cloneRecipeValue(patch),
    id,
  } as WatermarkRecipeDefinitionLayer<Source>;
  return commit(recipe);
}

export function removeWatermarkRecipeLayer<Source>(
  document: WatermarkRecipeDocument<Source>,
  id: string
): WatermarkRecipeDefinition<Source> {
  const recipe = migrateWatermarkRecipe<Source>(document);
  recipe.layers.splice(layerIndex(recipe, id), 1);
  if (recipe.layers.length === 0) {
    throw new Error('A Recipe must keep at least one layer.');
  }
  return commit(recipe);
}

export function duplicateWatermarkRecipeLayer<Source>(
  document: WatermarkRecipeDocument<Source>,
  id: string,
  requestedId = `${id}-copy`
): WatermarkRecipeDefinition<Source> {
  const recipe = migrateWatermarkRecipe<Source>(document);
  const index = layerIndex(recipe, id);
  const source = recipe.layers[index];
  if (!source) throw new Error(`Unknown layer id "${id}".`);
  recipe.layers.splice(index + 1, 0, {
    ...cloneRecipeValue(source),
    id: uniqueId(recipe, requestedId),
    name: source.name ? `${source.name} copy` : undefined,
  });
  return commit(recipe);
}

export function reorderWatermarkRecipeLayer<Source>(
  document: WatermarkRecipeDocument<Source>,
  id: string,
  targetIndex: number
): WatermarkRecipeDefinition<Source> {
  const recipe = migrateWatermarkRecipe<Source>(document);
  const index = layerIndex(recipe, id);
  const bounded = Math.max(
    0,
    Math.min(Math.trunc(targetIndex), recipe.layers.length - 1)
  );
  const [layer] = recipe.layers.splice(index, 1);
  if (layer) recipe.layers.splice(bounded, 0, layer);
  return commit(recipe);
}

export function groupWatermarkRecipeLayers<Source>(
  document: WatermarkRecipeDocument<Source>,
  ids: readonly string[],
  requestedGroupId = 'group'
): WatermarkRecipeDefinition<Source> {
  if (new Set(ids).size < 2) {
    throw new Error('Grouping requires at least two distinct layer IDs.');
  }
  const recipe = migrateWatermarkRecipe<Source>(document);
  ids.forEach((id) => layerIndex(recipe, id));
  const existing = new Set(
    recipe.layers
      .map((layer) => layer.groupId)
      .filter((value): value is string => Boolean(value))
  );
  let groupId = requestedGroupId;
  let sequence = 2;
  while (existing.has(groupId)) {
    groupId = `${requestedGroupId}-${sequence}`;
    sequence += 1;
  }
  recipe.layers = recipe.layers.map((layer) =>
    ids.includes(layer.id) ? { ...layer, groupId } : layer
  );
  return commit(recipe);
}

export function ungroupWatermarkRecipeLayers<Source>(
  document: WatermarkRecipeDocument<Source>,
  groupId: string
): WatermarkRecipeDefinition<Source> {
  const recipe = migrateWatermarkRecipe<Source>(document);
  if (!recipe.layers.some((layer) => layer.groupId === groupId)) {
    throw new Error(`Unknown group id "${groupId}".`);
  }
  recipe.layers = recipe.layers.map((layer) => {
    if (layer.groupId !== groupId) return layer;
    const ungrouped = { ...layer };
    delete ungrouped.groupId;
    return ungrouped;
  });
  return commit(recipe);
}
