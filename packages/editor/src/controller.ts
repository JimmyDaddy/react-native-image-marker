import {
  migrateWatermarkRecipe,
  type WatermarkRecipeDefinition,
  type WatermarkRecipeDefinitionLayer,
  type WatermarkRecipeDocument,
  type WatermarkRecipeLayer,
} from 'react-native-image-marker';
import { normalizeSafeArea, snapLayerPosition } from './geometry';
import type {
  EditorExportOptions,
  EditorKeyCommand,
  EditorPoint,
  EditorSafeArea,
  EditorSnapContext,
  EditorSnapGuide,
  EditorState,
} from './types';

interface EditorSnapshot {
  recipe: WatermarkRecipeDefinition;
  selectedLayerId?: string;
  safeArea: EditorSafeArea;
  exportOptions: EditorExportOptions;
}

type Listener = (state: EditorState) => void;

function cloneSource<Value>(value: Value): Value {
  if (Array.isArray(value)) {
    return value.map(cloneSource) as Value;
  }
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, cloneSource(item)])
      ) as Value;
    }
  }
  return value;
}

function cloneLayer(
  layer: WatermarkRecipeDefinitionLayer
): WatermarkRecipeDefinitionLayer {
  if (layer.type === 'text') {
    return {
      ...layer,
      position: layer.position ? { ...layer.position } : undefined,
      layout: layer.layout ? { ...layer.layout } : undefined,
      visibleWhen: layer.visibleWhen ? { ...layer.visibleWhen } : undefined,
      style: layer.style
        ? {
            ...layer.style,
            fontFallbacks: layer.style.fontFallbacks
              ? [...layer.style.fontFallbacks]
              : undefined,
            shadowStyle: layer.style.shadowStyle
              ? { ...layer.style.shadowStyle }
              : layer.style.shadowStyle,
            strokeStyle: layer.style.strokeStyle
              ? { ...layer.style.strokeStyle }
              : layer.style.strokeStyle,
            textBackgroundStyle: layer.style.textBackgroundStyle
              ? {
                  ...layer.style.textBackgroundStyle,
                  cornerRadius: layer.style.textBackgroundStyle.cornerRadius
                    ? cloneSource(layer.style.textBackgroundStyle.cornerRadius)
                    : undefined,
                }
              : layer.style.textBackgroundStyle,
          }
        : undefined,
    };
  }
  return {
    ...layer,
    src: cloneSource(layer.src),
    position: layer.position ? { ...layer.position } : undefined,
    layout: layer.layout ? { ...layer.layout } : undefined,
    visibleWhen: layer.visibleWhen ? { ...layer.visibleWhen } : undefined,
  };
}

function cloneRecipe(
  recipe: WatermarkRecipeDefinition
): WatermarkRecipeDefinition {
  return {
    schemaVersion: 2,
    layers: recipe.layers.map(cloneLayer),
    output: {
      ...recipe.output,
    },
  };
}

function cloneExportOptions(options: EditorExportOptions): EditorExportOptions {
  return {
    invisible: options.invisible ? { ...options.invisible } : undefined,
    contentCredentials: options.contentCredentials
      ? { ...options.contentCredentials }
      : undefined,
  };
}

function coordinate(value: number | string | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && !value.trim().endsWith('%')) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function clampScale(value: number): number {
  return Math.max(0.01, Math.min(value, 100));
}

function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

/**
 * Headless state engine shared by native and Web editor surfaces.
 *
 * All rendering-relevant state is stored as Recipe v2. UI-only history,
 * selection, guides, and safe-area settings stay outside the serialized recipe.
 */
export class ImageMarkerEditorController {
  private recipe: WatermarkRecipeDefinition;
  private selectedLayerId?: string;
  private safeArea: EditorSafeArea;
  private exportOptions: EditorExportOptions = {};
  private snapGuides: EditorSnapGuide[] = [];
  private readonly past: EditorSnapshot[] = [];
  private readonly future: EditorSnapshot[] = [];
  private readonly listeners = new Set<Listener>();
  private idSequence = 0;
  private historyGroupActive = false;
  private historyGroupCaptured = false;

  constructor(
    document: WatermarkRecipeDocument,
    private readonly historyLimit = 100
  ) {
    this.recipe = migrateWatermarkRecipe(document);
    this.safeArea = normalizeSafeArea();
    this.idSequence = this.recipe.layers.length;
  }

  getState(): EditorState {
    return {
      recipe: cloneRecipe(this.recipe),
      selectedLayerId: this.selectedLayerId,
      safeArea: { ...this.safeArea },
      snapGuides: this.snapGuides.map((guide) => ({ ...guide })),
      exportOptions: cloneExportOptions(this.exportOptions),
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  beginHistoryGroup(): void {
    this.historyGroupActive = true;
    this.historyGroupCaptured = false;
  }

  endHistoryGroup(): void {
    this.historyGroupActive = false;
    this.historyGroupCaptured = false;
    this.snapGuides = [];
    this.emit();
  }

  selectLayer(id: string | undefined): void {
    this.selectedLayerId =
      id && this.recipe.layers.some((layer) => layer.id === id)
        ? id
        : undefined;
    this.emit();
  }

  importRecipe(document: WatermarkRecipeDocument): void {
    this.commit(() => {
      this.recipe = migrateWatermarkRecipe(document);
      this.selectedLayerId = undefined;
      this.idSequence = this.recipe.layers.length;
    });
  }

  exportRecipe(): WatermarkRecipeDefinition {
    return cloneRecipe(this.recipe);
  }

  addLayer(
    layer: WatermarkRecipeLayer,
    index = this.recipe.layers.length
  ): string {
    const id = layer.id ?? this.nextLayerId();
    if (this.recipe.layers.some((item) => item.id === id)) {
      throw new Error(`Layer id "${id}" already exists.`);
    }
    const definition = migrateWatermarkRecipe({
      schemaVersion: 2,
      layers: [{ ...layer, id }],
      output: {},
    }).layers[0];
    if (!definition) {
      throw new Error('Unable to create the editor layer.');
    }
    this.commit(() => {
      const insertion = Math.max(0, Math.min(index, this.recipe.layers.length));
      this.recipe.layers.splice(insertion, 0, definition);
      this.selectedLayerId = id;
    });
    return id;
  }

  removeLayer(id = this.selectedLayerId): boolean {
    if (!id) return false;
    const index = this.layerIndex(id);
    if (index < 0) return false;
    this.requireEditableLayer(id);
    this.commit(() => {
      this.recipe.layers.splice(index, 1);
      if (this.selectedLayerId === id) this.selectedLayerId = undefined;
    });
    return true;
  }

  setLayerVisible(id: string, visible: boolean): void {
    this.updateLayer(id, (layer) => ({ ...layer, visible }));
  }

  setLayerLocked(id: string, locked: boolean): void {
    const index = this.layerIndex(id);
    if (index < 0) throw new Error(`Unknown layer id "${id}".`);
    this.commit(() => {
      const layer = this.recipe.layers[index];
      if (layer) this.recipe.layers[index] = { ...layer, locked };
    });
  }

  renameLayer(id: string, name: string | undefined): void {
    const normalized = name?.trim();
    this.updateLayer(id, (layer) => ({
      ...layer,
      name: normalized || undefined,
    }));
  }

  moveLayer(
    id: string,
    point: EditorPoint,
    snapContext?: EditorSnapContext
  ): EditorPoint {
    const layer = this.requireEditableLayer(id);
    const snapped = snapContext
      ? snapLayerPosition(point, {
          ...snapContext,
          safeArea: snapContext.safeArea ?? this.safeArea,
        })
      : { point, guides: [] };
    this.commit(() => {
      layer.position = {
        ...layer.position,
        X: snapped.point.x,
        Y: snapped.point.y,
      };
      this.snapGuides = snapped.guides;
    });
    return snapped.point;
  }

  nudgeLayer(id: string, delta: EditorPoint): void {
    const layer = this.requireEditableLayer(id);
    this.moveLayer(id, {
      x: coordinate(layer.position?.X) + delta.x,
      y: coordinate(layer.position?.Y) + delta.y,
    });
  }

  scaleLayer(id: string, scale: number): void {
    if (!Number.isFinite(scale)) throw new Error('scale must be finite.');
    const layer = this.requireEditableLayer(id);
    this.updateLayer(id, (current) => {
      if (current.type === 'image') {
        return { ...current, scale: clampScale(scale) };
      }
      return {
        ...current,
        style: {
          ...current.style,
          fontSize: clampScale(14 * scale),
          fontSizeRatio: undefined,
        },
      };
    });
    this.selectedLayerId = layer.id;
  }

  rotateLayer(id: string, degrees: number): void {
    if (!Number.isFinite(degrees)) {
      throw new Error('rotation must be finite.');
    }
    this.requireEditableLayer(id);
    this.updateLayer(id, (layer) =>
      layer.type === 'image'
        ? { ...layer, rotate: normalizeDegrees(degrees) }
        : {
            ...layer,
            style: {
              ...layer.style,
              rotate: normalizeDegrees(degrees),
            },
          }
    );
  }

  reorderLayer(id: string, targetIndex: number): void {
    const currentIndex = this.layerIndex(id);
    if (currentIndex < 0) throw new Error(`Unknown layer id "${id}".`);
    this.requireEditableLayer(id);
    const bounded = Math.max(
      0,
      Math.min(Math.trunc(targetIndex), this.recipe.layers.length - 1)
    );
    if (bounded === currentIndex) return;
    this.commit(() => {
      const [layer] = this.recipe.layers.splice(currentIndex, 1);
      if (layer) this.recipe.layers.splice(bounded, 0, layer);
    });
  }

  setSafeArea(safeArea: Partial<EditorSafeArea>): void {
    this.commit(() => {
      this.safeArea = normalizeSafeArea(safeArea);
    });
  }

  setExportOptions(options: EditorExportOptions): void {
    this.commit(() => {
      this.exportOptions = cloneExportOptions(options);
    });
  }

  handleKeyCommand(command: EditorKeyCommand): boolean {
    const modifier = command.metaKey || command.ctrlKey;
    const key = command.key.toLowerCase();
    if (modifier && key === 'z') {
      if (command.shiftKey) this.redo();
      else this.undo();
      return true;
    }
    if (modifier && key === 'y') {
      this.redo();
      return true;
    }
    const id = this.selectedLayerId;
    if (!id) return false;
    if (key === 'delete' || key === 'backspace') {
      return this.removeLayer(id);
    }
    const amount = command.shiftKey ? 10 : 1;
    if (key === 'arrowleft') this.nudgeLayer(id, { x: -amount, y: 0 });
    else if (key === 'arrowright') this.nudgeLayer(id, { x: amount, y: 0 });
    else if (key === 'arrowup') this.nudgeLayer(id, { x: 0, y: -amount });
    else if (key === 'arrowdown') this.nudgeLayer(id, { x: 0, y: amount });
    else if (key === '[') this.reorderLayer(id, this.layerIndex(id) - 1);
    else if (key === ']') this.reorderLayer(id, this.layerIndex(id) + 1);
    else return false;
    return true;
  }

  undo(): boolean {
    const previous = this.past.pop();
    if (!previous) return false;
    this.future.push(this.snapshot());
    this.restore(previous);
    this.emit();
    return true;
  }

  redo(): boolean {
    const next = this.future.pop();
    if (!next) return false;
    this.past.push(this.snapshot());
    this.restore(next);
    this.emit();
    return true;
  }

  private updateLayer(
    id: string,
    updater: (
      layer: WatermarkRecipeDefinitionLayer
    ) => WatermarkRecipeDefinitionLayer
  ): void {
    const index = this.layerIndex(id);
    const layer = this.requireEditableLayer(id);
    this.commit(() => {
      const updated = updater(cloneLayer(layer));
      if (updated.id !== id) {
        throw new Error(
          'Layer IDs cannot be changed through update operations.'
        );
      }
      this.recipe.layers[index] = updated;
    });
  }

  private requireEditableLayer(id: string): WatermarkRecipeDefinitionLayer {
    const layer = this.recipe.layers[this.layerIndex(id)];
    if (!layer) throw new Error(`Unknown layer id "${id}".`);
    if (layer.locked) throw new Error(`Layer "${id}" is locked.`);
    return layer;
  }

  private layerIndex(id: string): number {
    return this.recipe.layers.findIndex((layer) => layer.id === id);
  }

  private nextLayerId(): string {
    let id: string;
    do {
      this.idSequence += 1;
      id = `layer-editor-${this.idSequence}`;
    } while (this.recipe.layers.some((layer) => layer.id === id));
    return id;
  }

  private commit(mutator: () => void): void {
    const shouldCapture =
      !this.historyGroupActive || !this.historyGroupCaptured;
    if (shouldCapture) {
      this.past.push(this.snapshot());
      if (this.past.length > this.historyLimit) this.past.shift();
      this.future.length = 0;
      if (this.historyGroupActive) this.historyGroupCaptured = true;
    }
    mutator();
    this.emit();
  }

  private snapshot(): EditorSnapshot {
    return {
      recipe: cloneRecipe(this.recipe),
      selectedLayerId: this.selectedLayerId,
      safeArea: { ...this.safeArea },
      exportOptions: cloneExportOptions(this.exportOptions),
    };
  }

  private restore(snapshot: EditorSnapshot): void {
    this.recipe = cloneRecipe(snapshot.recipe);
    this.selectedLayerId = snapshot.selectedLayerId;
    this.safeArea = { ...snapshot.safeArea };
    this.exportOptions = cloneExportOptions(snapshot.exportOptions);
    this.snapGuides = [];
  }

  private emit(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}
