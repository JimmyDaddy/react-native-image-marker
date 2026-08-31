import {
  migrateWatermarkRecipe,
  type WatermarkRecipeDefinition,
  type WatermarkRecipeDefinitionLayer,
  type WatermarkRecipeDocument,
  type WatermarkRecipeLayer,
} from './core-contract';
import { normalizeSafeArea, snapLayerPosition } from './geometry';
import type {
  EditorAlignment,
  EditorAutosaveOptions,
  EditorClipboardDocument,
  EditorDistribution,
  EditorExportOptions,
  EditorKeyCommand,
  EditorLayerBounds,
  EditorPoint,
  EditorSafeArea,
  EditorSelectionMode,
  EditorSerializedState,
  EditorSnapContext,
  EditorSnapGuide,
  EditorState,
  EditorTemplate,
  EditorTextLayerPatch,
  EditorViewportState,
  ImageMarkerEditorControllerOptions,
} from './types';

interface EditorSnapshot {
  recipe: WatermarkRecipeDefinition;
  selectedLayerIds: string[];
  safeArea: EditorSafeArea;
  exportOptions: EditorExportOptions;
  viewport: EditorViewportState;
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
  return cloneSource(layer);
}

function cloneRecipe(
  recipe: WatermarkRecipeDefinition
): WatermarkRecipeDefinition {
  return cloneSource(recipe);
}

function cloneExportOptions(options: EditorExportOptions): EditorExportOptions {
  return {
    invisible: options.invisible ? { ...options.invisible } : undefined,
    contentCredentials: options.contentCredentials
      ? { ...options.contentCredentials }
      : undefined,
  };
}

function cloneViewport(viewport: EditorViewportState): EditorViewportState {
  return { ...viewport, pan: { ...viewport.pan } };
}

function coordinate(value: number | string | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && !value.trim().endsWith('%')) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, maximum));
}

function clampScale(value: number): number {
  return clamp(value, 0.01, 100);
}

function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function isControllerOptions(
  value: WatermarkRecipeDocument | ImageMarkerEditorControllerOptions
): value is ImageMarkerEditorControllerOptions {
  return 'document' in value;
}

function isClipboard(value: unknown): value is EditorClipboardDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EditorClipboardDocument>;
  return (
    candidate.kind === 'image-marker/editor-layers' &&
    candidate.version === 1 &&
    Array.isArray(candidate.layers)
  );
}

/**
 * Headless state engine shared by native and Web editor surfaces.
 *
 * Recipe state, multi-selection, history, clipboard, grouping, alignment,
 * viewport state, and optional autosave live here. Rendering and application
 * design-system choices remain injectable.
 */
export class ImageMarkerEditorController {
  private recipe: WatermarkRecipeDefinition;
  private selectedLayerIds: string[] = [];
  private safeArea: EditorSafeArea;
  private exportOptions: EditorExportOptions = {};
  private viewport: EditorViewportState = {
    zoom: 1,
    pan: { x: 0, y: 0 },
    fitMode: 'contain',
  };
  private snapGuides: EditorSnapGuide[] = [];
  private readonly past: EditorSnapshot[] = [];
  private readonly future: EditorSnapshot[] = [];
  private readonly listeners = new Set<Listener>();
  private readonly historyLimit: number;
  private readonly autosave?: EditorAutosaveOptions;
  private readonly onChange?: (state: EditorState) => void;
  private autosaveTimer?: ReturnType<typeof setTimeout>;
  private clipboard?: EditorClipboardDocument;
  private idSequence = 0;
  private groupSequence = 0;
  private historyGroupActive = false;
  private historyGroupCaptured = false;

  constructor(document: WatermarkRecipeDocument, historyLimit?: number);
  constructor(options: ImageMarkerEditorControllerOptions);
  constructor(
    documentOrOptions:
      | WatermarkRecipeDocument
      | ImageMarkerEditorControllerOptions,
    legacyHistoryLimit = 100
  ) {
    const options: ImageMarkerEditorControllerOptions = isControllerOptions(
      documentOrOptions
    )
      ? documentOrOptions
      : {
          document: documentOrOptions,
          historyLimit: legacyHistoryLimit,
        };
    this.recipe = migrateWatermarkRecipe(options.document);
    this.safeArea = normalizeSafeArea();
    this.historyLimit = Math.max(1, options.historyLimit ?? 100);
    this.autosave = options.autosave;
    this.onChange = options.onChange;
    this.idSequence = this.recipe.layers.length;
  }

  getState(): EditorState {
    const selectedLayerId = this.selectedLayerIds.at(-1);
    return {
      recipe: cloneRecipe(this.recipe),
      selectedLayerIds: [...this.selectedLayerIds],
      selectedLayerId,
      safeArea: { ...this.safeArea },
      snapGuides: this.snapGuides.map((guide) => ({ ...guide })),
      exportOptions: cloneExportOptions(this.exportOptions),
      viewport: cloneViewport(this.viewport),
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = undefined;
    this.listeners.clear();
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

  selectLayer(
    id: string | undefined,
    mode: EditorSelectionMode = 'replace'
  ): void {
    if (!id || !this.recipe.layers.some((layer) => layer.id === id)) {
      if (mode === 'replace') this.selectedLayerIds = [];
      this.emit(true);
      return;
    }
    if (mode === 'add') {
      this.selectedLayerIds = unique([...this.selectedLayerIds, id]);
    } else if (mode === 'toggle') {
      this.selectedLayerIds = this.selectedLayerIds.includes(id)
        ? this.selectedLayerIds.filter((value) => value !== id)
        : [...this.selectedLayerIds, id];
    } else {
      this.selectedLayerIds = [id];
    }
    this.emit(true);
  }

  selectLayers(ids: readonly string[]): void {
    const existing = new Set(this.recipe.layers.map((layer) => layer.id));
    this.selectedLayerIds = unique(ids).filter((id) => existing.has(id));
    this.emit(true);
  }

  selectAll(): void {
    this.selectedLayerIds = this.recipe.layers.map((layer) => layer.id);
    this.emit(true);
  }

  clearSelection(): void {
    this.selectLayer(undefined);
  }

  /**
   * Synchronize a controlled Editor state. History capture is opt-in so parent
   * renders do not create undo entries.
   */
  replaceState(state: EditorState, recordHistory = false): void {
    const apply = () => {
      this.recipe = cloneRecipe(state.recipe);
      this.selectedLayerIds = [...state.selectedLayerIds];
      this.safeArea = { ...state.safeArea };
      this.exportOptions = cloneExportOptions(state.exportOptions);
      this.viewport = cloneViewport(state.viewport);
      this.snapGuides = state.snapGuides.map((guide) => ({ ...guide }));
    };
    if (recordHistory) this.commit(apply);
    else {
      apply();
      this.emit(true);
    }
  }

  importRecipe(document: WatermarkRecipeDocument): void {
    this.commit(() => {
      this.recipe = migrateWatermarkRecipe(document);
      this.selectedLayerIds = [];
      this.idSequence = this.recipe.layers.length;
    });
  }

  applyTemplate(template: EditorTemplate): void {
    this.importRecipe(template.recipe);
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
      this.selectedLayerIds = [id];
    });
    return id;
  }

  duplicateLayers(ids: readonly string[] = this.selectedLayerIds): string[] {
    const selected = this.layersByIds(ids);
    if (selected.length === 0) return [];
    const created: string[] = [];
    this.commit(() => {
      for (const source of selected) {
        const index = this.layerIndex(source.id);
        const id = this.uniqueLayerId(`${source.id}-copy`);
        const copy = cloneLayer(source);
        copy.id = id;
        copy.name = source.name ? `${source.name} copy` : undefined;
        copy.locked = false;
        copy.position = {
          ...copy.position,
          X: coordinate(copy.position?.X) + 16,
          Y: coordinate(copy.position?.Y) + 16,
        };
        this.recipe.layers.splice(index + 1, 0, copy);
        created.push(id);
      }
      this.selectedLayerIds = created;
    });
    return created;
  }

  removeLayer(id = this.selectedLayerIds.at(-1)): boolean {
    if (!id) return false;
    return this.removeLayers([id]) > 0;
  }

  removeLayers(ids: readonly string[] = this.selectedLayerIds): number {
    const selected = this.editableLayers(ids);
    if (selected.length === 0) return 0;
    const selectedIds = new Set(selected.map((layer) => layer.id));
    this.commit(() => {
      this.recipe.layers = this.recipe.layers.filter(
        (layer) => !selectedIds.has(layer.id)
      );
      this.selectedLayerIds = this.selectedLayerIds.filter(
        (id) => !selectedIds.has(id)
      );
    });
    return selected.length;
  }

  setLayerVisible(id: string, visible: boolean): void {
    this.patchLayer(id, { visible });
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
    this.patchLayer(id, { name: normalized || undefined });
  }

  patchLayer(id: string, patch: Partial<WatermarkRecipeDefinitionLayer>): void {
    this.updateLayer(id, (layer) => {
      if (patch.id !== undefined && patch.id !== id) {
        throw new Error(
          'Layer IDs cannot be changed through update operations.'
        );
      }
      if (patch.type !== undefined && patch.type !== layer.type) {
        throw new Error(
          'Layer types cannot be changed through update operations.'
        );
      }
      return {
        ...layer,
        ...cloneSource(patch),
        id,
        type: layer.type,
      } as WatermarkRecipeDefinitionLayer;
    });
  }

  updateTextLayer(id: string, patch: EditorTextLayerPatch): void {
    this.updateLayer(id, (layer) => {
      if (layer.type !== 'text') {
        throw new Error(`Layer "${id}" is not a text layer.`);
      }
      return {
        ...layer,
        ...patch,
        style: patch.style
          ? { ...layer.style, ...cloneSource(patch.style) }
          : layer.style,
      };
    });
  }

  replaceImage(id: string, source: unknown): void {
    this.updateLayer(id, (layer) => {
      if (layer.type !== 'image') {
        throw new Error(`Layer "${id}" is not an image layer.`);
      }
      return { ...layer, src: source };
    });
  }

  moveLayer(
    id: string,
    point: EditorPoint,
    snapContext?: EditorSnapContext
  ): EditorPoint {
    const layer = this.requireEditableLayer(id);
    const previous = {
      x: coordinate(layer.position?.X),
      y: coordinate(layer.position?.Y),
    };
    const snapped = snapContext
      ? snapLayerPosition(point, {
          ...snapContext,
          safeArea: snapContext.safeArea ?? this.safeArea,
        })
      : { point, guides: [] };
    const transformIds = this.transformLayerIds(id);
    this.editableLayers(transformIds);
    const delta = {
      x: snapped.point.x - previous.x,
      y: snapped.point.y - previous.y,
    };
    this.commit(() => {
      this.moveLayersBy(transformIds, delta);
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

  nudgeSelection(delta: EditorPoint): void {
    const layers = this.editableLayers(this.selectedLayerIds);
    if (layers.length === 0) return;
    this.commit(() =>
      this.moveLayersBy(
        layers.map((layer) => layer.id),
        delta
      )
    );
  }

  scaleLayer(id: string, scale: number): void {
    if (!Number.isFinite(scale)) throw new Error('scale must be finite.');
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
  }

  rotateLayer(id: string, degrees: number): void {
    if (!Number.isFinite(degrees)) {
      throw new Error('rotation must be finite.');
    }
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

  groupLayers(
    ids: readonly string[] = this.selectedLayerIds,
    requestedGroupId?: string
  ): string {
    const layers = this.editableLayers(unique(ids));
    if (layers.length < 2) {
      throw new Error('Grouping requires at least two editable layers.');
    }
    const groupId = this.uniqueGroupId(requestedGroupId ?? 'group');
    const selected = new Set(layers.map((layer) => layer.id));
    this.commit(() => {
      this.recipe.layers = this.recipe.layers.map((layer) =>
        selected.has(layer.id) ? { ...layer, groupId } : layer
      );
      this.selectedLayerIds = layers.map((layer) => layer.id);
    });
    return groupId;
  }

  ungroupLayers(ids: readonly string[] = this.selectedLayerIds): string[] {
    const layers = this.editableLayers(ids);
    const groupIds = unique(
      layers
        .map((layer) => layer.groupId)
        .filter((value): value is string => Boolean(value))
    );
    if (groupIds.length === 0) return [];
    const selectedGroups = new Set(groupIds);
    this.editableLayers(
      this.recipe.layers
        .filter((layer) => layer.groupId && selectedGroups.has(layer.groupId))
        .map((layer) => layer.id)
    );
    this.commit(() => {
      this.recipe.layers = this.recipe.layers.map((layer) => {
        if (!layer.groupId || !selectedGroups.has(layer.groupId)) return layer;
        const next = { ...layer };
        delete next.groupId;
        return next;
      });
    });
    return groupIds;
  }

  alignLayers(
    alignment: EditorAlignment,
    bounds: readonly EditorLayerBounds[],
    canvas?: { width: number; height: number }
  ): void {
    const layers = this.editableLayers(this.selectedLayerIds);
    const byId = new Map(bounds.map((bound) => [bound.id, bound]));
    const selectedBounds = layers.map((layer) => {
      const bound = byId.get(layer.id);
      if (!bound) throw new Error(`Missing bounds for layer "${layer.id}".`);
      return bound;
    });
    if (selectedBounds.length === 0) return;
    const minX = canvas ? 0 : Math.min(...selectedBounds.map((item) => item.x));
    const minY = canvas ? 0 : Math.min(...selectedBounds.map((item) => item.y));
    const maxX = canvas
      ? canvas.width
      : Math.max(...selectedBounds.map((item) => item.x + item.width));
    const maxY = canvas
      ? canvas.height
      : Math.max(...selectedBounds.map((item) => item.y + item.height));
    this.commit(() => {
      for (const bound of selectedBounds) {
        const layer = this.recipe.layers[this.layerIndex(bound.id)];
        if (!layer) continue;
        let x = coordinate(layer.position?.X);
        let y = coordinate(layer.position?.Y);
        if (alignment === 'left') x = minX;
        else if (alignment === 'center') {
          x = (minX + maxX - bound.width) / 2;
        } else if (alignment === 'right') x = maxX - bound.width;
        else if (alignment === 'top') y = minY;
        else if (alignment === 'middle') {
          y = (minY + maxY - bound.height) / 2;
        } else y = maxY - bound.height;
        layer.position = { ...layer.position, X: x, Y: y };
      }
    });
  }

  distributeLayers(
    direction: EditorDistribution,
    bounds: readonly EditorLayerBounds[]
  ): void {
    const layers = this.editableLayers(this.selectedLayerIds);
    if (layers.length < 3) {
      throw new Error('Distribution requires at least three editable layers.');
    }
    const selected = new Set(layers.map((layer) => layer.id));
    const items = bounds
      .filter((bound) => selected.has(bound.id))
      .sort((left, right) =>
        direction === 'horizontal' ? left.x - right.x : left.y - right.y
      );
    if (items.length !== layers.length) {
      throw new Error('Bounds are required for every selected layer.');
    }
    const first = items[0]!;
    const last = items.at(-1)!;
    const start = direction === 'horizontal' ? first.x : first.y;
    const end =
      direction === 'horizontal' ? last.x + last.width : last.y + last.height;
    const occupied = items.reduce(
      (total, item) =>
        total + (direction === 'horizontal' ? item.width : item.height),
      0
    );
    const gap = (end - start - occupied) / (items.length - 1);
    this.commit(() => {
      let cursor = start;
      for (const item of items) {
        const layer = this.recipe.layers[this.layerIndex(item.id)];
        if (!layer) continue;
        layer.position = {
          ...layer.position,
          X:
            direction === 'horizontal' ? cursor : coordinate(layer.position?.X),
          Y: direction === 'vertical' ? cursor : coordinate(layer.position?.Y),
        };
        cursor += (direction === 'horizontal' ? item.width : item.height) + gap;
      }
    });
  }

  copyLayers(ids: readonly string[] = this.selectedLayerIds): string {
    const selected = new Set(ids);
    const clipboard: EditorClipboardDocument = {
      kind: 'image-marker/editor-layers',
      version: 1,
      layers: this.recipe.layers
        .filter((layer) => selected.has(layer.id))
        .map(cloneLayer),
    };
    if (clipboard.layers.length === 0) {
      throw new Error('Copy requires at least one existing layer.');
    }
    this.clipboard = cloneSource(clipboard);
    this.emit();
    return JSON.stringify(clipboard);
  }

  canPaste(): boolean {
    return Boolean(this.clipboard?.layers.length);
  }

  pasteLayers(
    serialized?: string | EditorClipboardDocument,
    offset: EditorPoint = { x: 20, y: 20 }
  ): string[] {
    const parsed =
      typeof serialized === 'string'
        ? (JSON.parse(serialized) as unknown)
        : serialized ?? this.clipboard;
    if (!isClipboard(parsed)) {
      throw new Error('Unsupported editor clipboard payload.');
    }
    const created: string[] = [];
    const groupIds = new Map<string, string>();
    this.commit(() => {
      for (const source of parsed.layers) {
        const copy = cloneLayer(source);
        copy.id = this.uniqueLayerId(`${source.id}-copy`);
        if (copy.groupId) {
          const mapped =
            groupIds.get(copy.groupId) ??
            this.uniqueGroupId(`${copy.groupId}-copy`);
          groupIds.set(copy.groupId, mapped);
          copy.groupId = mapped;
        }
        copy.position = {
          ...copy.position,
          X: coordinate(copy.position?.X) + offset.x,
          Y: coordinate(copy.position?.Y) + offset.y,
        };
        this.recipe.layers.push(copy);
        created.push(copy.id);
      }
      this.selectedLayerIds = created;
    });
    return created;
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

  setViewportZoom(zoom: number, anchor?: EditorPoint): void {
    if (!Number.isFinite(zoom)) throw new Error('zoom must be finite.');
    const nextZoom = clamp(zoom, 0.1, 16);
    const previousZoom = this.viewport.zoom;
    const nextPan = anchor
      ? {
          x:
            anchor.x -
            ((anchor.x - this.viewport.pan.x) * nextZoom) / previousZoom,
          y:
            anchor.y -
            ((anchor.y - this.viewport.pan.y) * nextZoom) / previousZoom,
        }
      : this.viewport.pan;
    this.viewport = {
      zoom: nextZoom,
      pan: nextPan,
      fitMode: nextZoom === 1 ? 'contain' : 'manual',
    };
    this.emit(true);
  }

  zoomViewportBy(factor: number, anchor?: EditorPoint): void {
    this.setViewportZoom(this.viewport.zoom * factor, anchor);
  }

  panViewport(delta: EditorPoint): void {
    this.viewport = {
      ...this.viewport,
      pan: {
        x: this.viewport.pan.x + delta.x,
        y: this.viewport.pan.y + delta.y,
      },
      fitMode: 'manual',
    };
    this.emit(true);
  }

  fitViewport(): void {
    this.viewport = {
      zoom: 1,
      pan: { x: 0, y: 0 },
      fitMode: 'contain',
    };
    this.emit(true);
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
    if (modifier && key === 'a') {
      this.selectAll();
      return true;
    }
    if (modifier && key === 'c') {
      this.copyLayers();
      return true;
    }
    if (modifier && key === 'x') {
      this.copyLayers();
      this.removeLayers();
      return true;
    }
    if (modifier && key === 'v') {
      this.pasteLayers();
      return true;
    }
    if (modifier && key === 'd') {
      this.duplicateLayers();
      return true;
    }
    if (modifier && key === 'g') {
      if (command.shiftKey) this.ungroupLayers();
      else this.groupLayers();
      return true;
    }
    if (modifier && key === '0') {
      this.fitViewport();
      return true;
    }
    if (modifier && (key === '+' || key === '=')) {
      this.zoomViewportBy(1.2);
      return true;
    }
    if (modifier && key === '-') {
      this.zoomViewportBy(1 / 1.2);
      return true;
    }
    const id = this.selectedLayerIds.at(-1);
    if (!id) return false;
    if (key === 'delete' || key === 'backspace') {
      return this.removeLayers() > 0;
    }
    const amount = command.shiftKey ? 10 : 1;
    if (key === 'arrowleft') {
      this.nudgeSelection({ x: -amount, y: 0 });
    } else if (key === 'arrowright') {
      this.nudgeSelection({ x: amount, y: 0 });
    } else if (key === 'arrowup') {
      this.nudgeSelection({ x: 0, y: -amount });
    } else if (key === 'arrowdown') {
      this.nudgeSelection({ x: 0, y: amount });
    } else if (key === '[') {
      this.reorderLayer(id, this.layerIndex(id) - 1);
    } else if (key === ']') {
      this.reorderLayer(id, this.layerIndex(id) + 1);
    } else {
      return false;
    }
    return true;
  }

  undo(): boolean {
    const previous = this.past.pop();
    if (!previous) return false;
    this.future.push(this.snapshot());
    this.restore(previous);
    this.emit(true);
    return true;
  }

  redo(): boolean {
    const next = this.future.pop();
    if (!next) return false;
    this.past.push(this.snapshot());
    this.restore(next);
    this.emit(true);
    return true;
  }

  serializeState(): string {
    const snapshot: EditorSerializedState = {
      version: 1,
      recipe: cloneRecipe(this.recipe),
      selectedLayerIds: [...this.selectedLayerIds],
      safeArea: { ...this.safeArea },
      // Do not persist invisible-watermark keys or signing adapters.
      exportOptions: {},
      viewport: cloneViewport(this.viewport),
    };
    return JSON.stringify(snapshot);
  }

  restoreSerializedState(serialized: string): void {
    const parsed = JSON.parse(serialized) as Partial<EditorSerializedState>;
    if (parsed.version !== 1 || !parsed.recipe) {
      throw new Error('Unsupported editor autosave document.');
    }
    const recipe = migrateWatermarkRecipe(parsed.recipe);
    const existing = new Set(recipe.layers.map((layer) => layer.id));
    this.recipe = recipe;
    this.selectedLayerIds = (parsed.selectedLayerIds ?? []).filter((id) =>
      existing.has(id)
    );
    this.safeArea = normalizeSafeArea(parsed.safeArea);
    this.exportOptions = cloneExportOptions(parsed.exportOptions ?? {});
    this.viewport = parsed.viewport
      ? cloneViewport(parsed.viewport)
      : { zoom: 1, pan: { x: 0, y: 0 }, fitMode: 'contain' };
    this.past.length = 0;
    this.future.length = 0;
    this.emit();
  }

  async restoreAutosave(): Promise<boolean> {
    if (!this.autosave) return false;
    const serialized = await this.autosave.storage.load(this.autosave.key);
    if (!serialized) return false;
    this.restoreSerializedState(serialized);
    return true;
  }

  async flushAutosave(): Promise<boolean> {
    if (!this.autosave) return false;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = undefined;
    await this.autosave.storage.save(this.autosave.key, this.serializeState());
    return true;
  }

  async clearAutosave(): Promise<boolean> {
    if (!this.autosave?.storage.remove) return false;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = undefined;
    await this.autosave.storage.remove(this.autosave.key);
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

  private editableLayers(
    ids: readonly string[]
  ): WatermarkRecipeDefinitionLayer[] {
    return unique(ids).map((id) => this.requireEditableLayer(id));
  }

  private layersByIds(
    ids: readonly string[]
  ): WatermarkRecipeDefinitionLayer[] {
    return unique(ids).map((id) => {
      const layer = this.recipe.layers[this.layerIndex(id)];
      if (!layer) throw new Error(`Unknown layer id "${id}".`);
      return layer;
    });
  }

  private transformLayerIds(id: string): string[] {
    if (
      this.selectedLayerIds.length > 1 &&
      this.selectedLayerIds.includes(id)
    ) {
      return [...this.selectedLayerIds];
    }
    const layer = this.recipe.layers[this.layerIndex(id)];
    if (layer?.groupId) {
      return this.recipe.layers
        .filter((item) => item.groupId === layer.groupId)
        .map((item) => item.id);
    }
    return [id];
  }

  private moveLayersBy(ids: readonly string[], delta: EditorPoint): void {
    const selected = new Set(ids);
    for (const layer of this.recipe.layers) {
      if (!selected.has(layer.id)) continue;
      layer.position = {
        ...layer.position,
        X: coordinate(layer.position?.X) + delta.x,
        Y: coordinate(layer.position?.Y) + delta.y,
      };
    }
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

  private uniqueLayerId(requested: string): string {
    let id = requested;
    let sequence = 2;
    while (this.recipe.layers.some((layer) => layer.id === id)) {
      id = `${requested}-${sequence}`;
      sequence += 1;
    }
    return id;
  }

  private uniqueGroupId(requested: string): string {
    const existing = new Set(
      this.recipe.layers
        .map((layer) => layer.groupId)
        .filter((value): value is string => Boolean(value))
    );
    let id = requested;
    while (existing.has(id)) {
      this.groupSequence += 1;
      id = `${requested}-${this.groupSequence + 1}`;
    }
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
    this.emit(true);
  }

  private snapshot(): EditorSnapshot {
    return {
      recipe: cloneRecipe(this.recipe),
      selectedLayerIds: [...this.selectedLayerIds],
      safeArea: { ...this.safeArea },
      exportOptions: cloneExportOptions(this.exportOptions),
      viewport: cloneViewport(this.viewport),
    };
  }

  private restore(snapshot: EditorSnapshot): void {
    this.recipe = cloneRecipe(snapshot.recipe);
    this.selectedLayerIds = [...snapshot.selectedLayerIds];
    this.safeArea = { ...snapshot.safeArea };
    this.exportOptions = cloneExportOptions(snapshot.exportOptions);
    this.viewport = cloneViewport(snapshot.viewport);
    this.snapGuides = [];
  }

  private scheduleAutosave(): void {
    if (!this.autosave) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = undefined;
      try {
        Promise.resolve(
          this.autosave?.storage.save(this.autosave.key, this.serializeState())
        ).catch((reason: unknown) => this.reportAutosaveError(reason));
      } catch (reason) {
        this.reportAutosaveError(reason);
      }
    }, Math.max(0, this.autosave.debounceMs ?? 350));
  }

  private reportAutosaveError(reason: unknown): void {
    this.autosave?.onError?.(
      reason instanceof Error ? reason : new Error(String(reason))
    );
  }

  private emit(persist = false): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
    this.onChange?.(state);
    if (persist) this.scheduleAutosave();
  }
}
