import { cloneRecipeValue } from './clone';
import { migrateWatermarkRecipe } from './migration';
import type {
  WatermarkRecipeDefinition,
  WatermarkRecipeDocument,
  WatermarkRecipeVariable,
  WatermarkRecipeVariableContext,
} from './types';
import {
  assertWatermarkRecipeVariable,
  recipeValidationPatterns,
} from './validation';

const RESERVED_VARIABLES = new Set(['filename', 'index']);
const ESCAPED_TEMPLATE_OPEN = '\u0000recipe-template-open\u0000';

function createVariableContext(
  context: WatermarkRecipeVariableContext
): Readonly<Record<string, WatermarkRecipeVariable>> {
  const result: Record<string, WatermarkRecipeVariable> = {
    index: context.index ?? 0,
  };
  if (context.filename !== undefined) result.filename = context.filename;
  const variables = context.variables;
  if (
    variables !== undefined &&
    (!variables || typeof variables !== 'object' || Array.isArray(variables))
  ) {
    throw new Error('variables must be an object.');
  }
  for (const [name, value] of Object.entries(variables ?? {})) {
    if (!recipeValidationPatterns.variableName.test(name)) {
      throw new Error(`Invalid recipe variable name "${name}".`);
    }
    if (RESERVED_VARIABLES.has(name)) {
      throw new Error(`Recipe variable "${name}" is reserved.`);
    }
    assertWatermarkRecipeVariable(value, `variables.${name}`);
    result[name] = value;
  }
  return result;
}

function readVariable(
  variables: Readonly<Record<string, WatermarkRecipeVariable>>,
  name: string
): WatermarkRecipeVariable {
  if (!Object.prototype.hasOwnProperty.call(variables, name)) {
    throw new Error(`Missing recipe variable "${name}".`);
  }
  const value = variables[name];
  if (value === undefined) {
    throw new Error(`Missing recipe variable "${name}".`);
  }
  return value;
}

export function resolveWatermarkTemplate(
  template: string,
  variables: Readonly<Record<string, WatermarkRecipeVariable>>
): string {
  const protectedTemplate = template.replace(/\\\{\{/g, ESCAPED_TEMPLATE_OPEN);
  return protectedTemplate
    .replace(
      new RegExp(recipeValidationPatterns.template.source, 'g'),
      (_match, name: string) => String(readVariable(variables, name))
    )
    .split(ESCAPED_TEMPLATE_OPEN)
    .join('{{');
}

export function materializeWatermarkRecipe<Source = unknown>(
  document: WatermarkRecipeDocument<Source>,
  context: WatermarkRecipeVariableContext = {}
): WatermarkRecipeDefinition<Source> {
  const recipe = migrateWatermarkRecipe<Source>(document);
  const variables = createVariableContext(context);
  return {
    schemaVersion: recipe.schemaVersion,
    output: cloneRecipeValue(recipe.output),
    layers: recipe.layers
      .filter((layer) => {
        if (layer.visible === false) return false;
        if (!layer.visibleWhen) return true;
        return (
          readVariable(variables, layer.visibleWhen.variable) ===
          layer.visibleWhen.equals
        );
      })
      .map((layer) => {
        const materialized = cloneRecipeValue(layer);
        delete materialized.visibleWhen;
        if (materialized.type === 'text') {
          materialized.text = resolveWatermarkTemplate(
            materialized.text,
            variables
          );
        }
        return materialized;
      }),
  };
}
