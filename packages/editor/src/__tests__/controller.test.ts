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
    controller.importRecipe({
      schemaVersion: 1,
      watermarks: [{ type: 'text', text: 'Legacy' }],
      saveFormat: 'jpg',
    });
    const id = controller.addLayer({ type: 'image', src: '/new.png' });
    const exported = controller.exportRecipe();

    expect(exported.schemaVersion).toBe(2);
    expect(exported.output.saveFormat).toBe('jpg');
    expect(id).toMatch(/^layer-editor-/);
    exported.layers[0]!.visible = false;
    expect(controller.getState().recipe.layers[0]?.visible).toBeUndefined();
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
});
