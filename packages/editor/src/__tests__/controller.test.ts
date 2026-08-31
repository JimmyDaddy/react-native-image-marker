import { ImageMarkerEditorController } from '../controller';

function createController() {
  return new ImageMarkerEditorController({
    schemaVersion: 2,
    layers: [
      {
        id: 'title',
        name: 'Title',
        type: 'text',
        text: 'Hello',
        position: { X: 10, Y: 12 },
      },
      {
        id: 'logo',
        type: 'image',
        src: '/logo.png',
        position: { X: 180, Y: 120 },
      },
    ],
    output: { saveFormat: 'png' },
  });
}

describe('ImageMarkerEditorController', () => {
  it('edits transforms, ordering, visibility, and safe areas as Recipe v2', () => {
    const controller = createController();
    controller.selectLayer('logo');
    controller.moveLayer(
      'logo',
      { x: 149, y: 99 },
      {
        canvas: { width: 400, height: 300 },
        layer: { width: 100, height: 100 },
        threshold: 3,
      }
    );
    controller.scaleLayer('logo', 1.5);
    controller.rotateLayer('logo', 405);
    controller.setLayerVisible('logo', false);
    controller.reorderLayer('logo', 0);
    controller.setSafeArea({ top: 20, left: 16, right: 16, bottom: 24 });

    const state = controller.getState();
    expect(state.recipe.layers[0]).toEqual(
      expect.objectContaining({
        id: 'logo',
        visible: false,
        scale: 1.5,
        rotate: 45,
        position: expect.objectContaining({ X: 150, Y: 100 }),
      })
    );
    expect(state.safeArea).toEqual({
      top: 20,
      right: 16,
      bottom: 24,
      left: 16,
    });
  });

  it('supports grouped undo/redo without recording every drag frame', () => {
    const controller = createController();
    controller.beginHistoryGroup();
    controller.moveLayer('title', { x: 20, y: 20 });
    controller.moveLayer('title', { x: 30, y: 30 });
    controller.moveLayer('title', { x: 40, y: 40 });
    controller.endHistoryGroup();

    expect(controller.undo()).toBe(true);
    expect(controller.getState().recipe.layers[0]?.position).toEqual({
      X: 10,
      Y: 12,
    });
    expect(controller.redo()).toBe(true);
    expect(controller.getState().recipe.layers[0]?.position).toEqual({
      X: 40,
      Y: 40,
    });
  });

  it('imports Recipe v1, exports detached Recipe v2, and allocates stable IDs', () => {
    const controller = createController();
    const legacyRecipe = {
      schemaVersion: 1,
      watermarks: [{ type: 'text', text: 'Legacy' }],
      saveFormat: 'jpg',
    };
    controller.importRecipe(legacyRecipe as never);
    legacyRecipe.watermarks[0].text = 'Mutated after import';
    const id = controller.addLayer({ type: 'image', src: '/new.png' });
    const exported = controller.exportRecipe();

    expect(exported.schemaVersion).toBe(2);
    expect(exported.output.saveFormat).toBe('jpg');
    expect(exported.layers[0]).toEqual(
      expect.objectContaining({ id: 'layer-1', text: 'Legacy' })
    );
    expect(id).toMatch(/^layer-editor-/);
    exported.layers[0]!.visible = false;
    expect(controller.getState().recipe.layers[0]?.visible).toBeUndefined();
  });

  it('preserves Core Recipe migration validation errors', () => {
    expect(
      () =>
        new ImageMarkerEditorController({
          schemaVersion: 2,
          layers: [
            {
              id: 'title',
              type: 'text',
              text: 'Legacy field',
              positionOptions: {},
            },
          ],
          output: {},
        } as never)
    ).toThrow(
      'watermarks[0].positionOptions was removed in v2; use position instead.'
    );
  });

  it('honors locking and keyboard/a11y-friendly commands', () => {
    const controller = createController();
    controller.selectLayer('title');
    expect(
      controller.handleKeyCommand({ key: 'ArrowRight', shiftKey: true })
    ).toBe(true);
    expect(controller.getState().recipe.layers[0]?.position?.X).toBe(20);

    controller.setLayerLocked('title', true);
    expect(() => controller.moveLayer('title', { x: 40, y: 40 })).toThrow(
      'is locked'
    );
    expect(() => controller.reorderLayer('title', 1)).toThrow('is locked');
    expect(() => controller.removeLayer('title')).toThrow('is locked');
    expect(() => controller.setLayerVisible('title', false)).toThrow(
      'is locked'
    );
    controller.setLayerLocked('title', false);
    expect(controller.handleKeyCommand({ key: 'Delete' })).toBe(true);
    expect(
      controller.getState().recipe.layers.some((layer) => layer.id === 'title')
    ).toBe(false);
    expect(controller.handleKeyCommand({ key: 'z', metaKey: true })).toBe(true);
    expect(
      controller.getState().recipe.layers.some((layer) => layer.id === 'title')
    ).toBe(true);
  });

  it('supports multi-selection, grouping, alignment, copy, and cross-document paste', () => {
    const controller = createController();
    controller.selectLayers(['title', 'logo']);
    expect(controller.getState().selectedLayerIds).toEqual(['title', 'logo']);

    const groupId = controller.groupLayers();
    expect(
      controller
        .getState()
        .recipe.layers.every((layer) => layer.groupId === groupId)
    ).toBe(true);

    controller.alignLayers('left', [
      { id: 'title', x: 10, y: 12, width: 100, height: 40 },
      { id: 'logo', x: 180, y: 120, width: 60, height: 60 },
    ]);
    expect(
      controller.getState().recipe.layers.map((layer) => layer.position?.X)
    ).toEqual([10, 10]);

    const clipboard = controller.copyLayers();
    const target = new ImageMarkerEditorController({
      schemaVersion: 2,
      layers: [{ id: 'base', type: 'text', text: 'Base' }],
      output: {},
    });
    const pasted = target.pasteLayers(clipboard, { x: 5, y: 8 });
    expect(pasted).toHaveLength(2);
    expect(new Set(pasted).size).toBe(2);
    expect(target.getState().selectedLayerIds).toEqual(pasted);
    expect(
      target
        .getState()
        .recipe.layers.slice(1)
        .every((layer) => layer.groupId?.includes('copy'))
    ).toBe(true);
  });

  it('distributes layers and edits rich text and image properties', () => {
    const controller = createController();
    const badge = controller.addLayer({
      id: 'badge',
      type: 'image',
      src: '/badge.png',
      position: { X: 300, Y: 120 },
    });
    controller.selectLayers(['title', 'logo', badge]);
    controller.distributeLayers('horizontal', [
      { id: 'title', x: 0, y: 0, width: 50, height: 20 },
      { id: 'logo', x: 100, y: 0, width: 50, height: 20 },
      { id: 'badge', x: 300, y: 0, width: 50, height: 20 },
    ]);
    expect(
      controller.getState().recipe.layers.map((layer) => layer.position?.X)
    ).toEqual([0, 150, 300]);

    controller.updateTextLayer('title', {
      text: 'Campaign',
      alpha: 0.7,
      blendMode: 'overlay',
      style: {
        fontName: 'Inter',
        fontSize: 42,
        color: '#FF3366',
        strokeStyle: { color: '#FFFFFF', width: 2 },
      },
    });
    controller.replaceImage('logo', '/new-logo.png');
    expect(controller.getState().recipe.layers[0]).toEqual(
      expect.objectContaining({
        text: 'Campaign',
        alpha: 0.7,
        blendMode: 'overlay',
        style: expect.objectContaining({
          fontName: 'Inter',
          fontSize: 42,
          color: '#FF3366',
        }),
      })
    );
    expect(controller.getState().recipe.layers[1]).toEqual(
      expect.objectContaining({ src: '/new-logo.png' })
    );
  });

  it('serializes, restores, autosaves, and accepts controlled state', async () => {
    const saved = new Map<string, string>();
    const storage = {
      load: jest.fn((key: string) => saved.get(key) ?? null),
      save: jest.fn((key: string, value: string) => {
        saved.set(key, value);
      }),
      remove: jest.fn((key: string) => {
        saved.delete(key);
      }),
    };
    const changes = jest.fn();
    const controller = new ImageMarkerEditorController({
      document: createController().exportRecipe(),
      autosave: { key: 'draft', storage, debounceMs: 0 },
      onChange: changes,
    });
    controller.selectLayer('title');
    controller.updateTextLayer('title', { text: 'Autosaved' });
    controller.setViewportZoom(1.5);
    controller.setExportOptions({
      invisible: {
        payload: 'asset-42',
        key: '0123456789abcdef',
      },
    });
    await controller.flushAutosave();
    expect(storage.save).toHaveBeenCalled();
    expect(JSON.parse(saved.get('draft')!).exportOptions).toEqual({});

    const restored = new ImageMarkerEditorController({
      document: createController().exportRecipe(),
      autosave: { key: 'draft', storage },
    });
    await expect(restored.restoreAutosave()).resolves.toBe(true);
    expect(restored.getState()).toEqual(
      expect.objectContaining({
        selectedLayerIds: ['title'],
        viewport: expect.objectContaining({ zoom: 1.5 }),
      })
    );
    expect(restored.getState().recipe.layers[0]).toEqual(
      expect.objectContaining({ text: 'Autosaved' })
    );

    const controlled = restored.getState();
    controlled.recipe.layers[0]!.name = 'Controlled';
    controller.replaceState(controlled);
    expect(controller.getState().recipe.layers[0]?.name).toBe('Controlled');
    expect(changes).toHaveBeenCalled();
    await restored.clearAutosave();
    expect(storage.remove).toHaveBeenCalledWith('draft');
    controller.dispose();
    restored.dispose();
  });
});
