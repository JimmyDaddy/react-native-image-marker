import * as React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  ImageMarkerEditor,
  ImageMarkerEditorToolbar,
  type EditorLayerRenderContext,
} from '../EditorSurface';
import { ImageMarkerEditorController } from '../controller';
import type { ImageMarkerEditorRenderAdapter } from '../types';

function createController() {
  return new ImageMarkerEditorController({
    schemaVersion: 2,
    layers: [
      {
        id: 'title',
        name: 'Title',
        type: 'text',
        text: 'Hello',
        position: { X: 100, Y: 60 },
        style: { fontSize: 40 },
      },
    ],
    output: { saveFormat: 'png' },
  });
}

describe('ImageMarkerEditor components', () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(() => {
    renderer?.unmount();
    renderer = undefined;
  });

  it('publishes stable native test identifiers and projection context', () => {
    const controller = createController();
    const renderLayer = jest.fn(
      (
        _layer: unknown,
        _selected: boolean,
        context: EditorLayerRenderContext
      ) => <>{`${context.sourceSize.width}:${context.viewportSize.width}`}</>
    );

    act(() => {
      renderer = create(
        <ImageMarkerEditor
          controller={controller}
          getLayerSize={() => ({ width: 200, height: 80 })}
          height={300}
          renderLayer={renderLayer}
          sourceSize={{ width: 1000, height: 500 }}
          testID="campaign-editor"
          width={400}
        />
      );
    });

    expect(
      renderer!.root.findByProps({ testID: 'campaign-editor-canvas' }).props
        .accessible
    ).toBe(false);
    expect(
      renderer!.root.findByProps({
        testID: 'campaign-editor-layer-title',
      })
    ).toBeTruthy();
    expect(renderLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'title' }),
      false,
      expect.objectContaining({
        sourceSize: { width: 1000, height: 500 },
        scale: 0.4,
      })
    );
  });

  it('connects accessible layer and toolbar actions to controller history', () => {
    const controller = createController();
    controller.selectLayer('title');

    act(() => {
      renderer = create(
        <>
          <ImageMarkerEditor
            controller={controller}
            height={250}
            testID="editor"
            width={500}
          />
          <ImageMarkerEditorToolbar controller={controller} testID="toolbar" />
        </>
      );
    });

    const layer = renderer!.root.findByProps({
      testID: 'editor-layer-title',
    });
    act(() => {
      layer.props.onAccessibilityAction({
        nativeEvent: { actionName: 'increment' },
      });
    });
    const fontSize = controller.getState().recipe.layers[0]?.style?.fontSize;
    expect(fontSize).toBeCloseTo(40.7);

    act(() => {
      renderer!.root
        .findByProps({ testID: 'toolbar-visibility' })
        .props.onPress();
    });
    expect(controller.getState().recipe.layers[0]?.visible).toBe(false);

    act(() => {
      renderer!.root.findByProps({ testID: 'toolbar-undo' }).props.onPress();
    });
    expect(controller.getState().recipe.layers[0]?.visible).toBeUndefined();

    act(() => {
      renderer!.root.findByProps({ testID: 'toolbar-lock' }).props.onPress();
    });
    expect(controller.getState().recipe.layers[0]?.locked).toBe(true);
    expect(
      renderer!.root.findByProps({ testID: 'toolbar-delete' }).props.disabled
    ).toBe(true);
  });

  it('renders transform handles and zoom controls for the selected layer', () => {
    const controller = createController();
    controller.addLayer({
      id: 'logo',
      type: 'image',
      src: 1,
      position: { X: 220, Y: 80 },
    });
    controller.selectLayers(['title', 'logo']);
    act(() => {
      renderer = create(
        <>
          <ImageMarkerEditor
            controller={controller}
            height={250}
            testID="editor"
            width={500}
          />
          <ImageMarkerEditorToolbar controller={controller} testID="toolbar" />
        </>
      );
    });
    expect(
      renderer!.root.findByProps({
        testID: 'editor-layer-title-handle-south-east',
      })
    ).toBeTruthy();
    expect(
      renderer!.root.findByProps({
        testID: 'editor-layer-title-handle-rotate',
      })
    ).toBeTruthy();
    act(() => {
      renderer!.root
        .findByProps({ testID: 'toolbar-align-left' })
        .props.onPress();
    });
    expect(
      controller.getState().recipe.layers.map((layer) => layer.position?.X)
    ).toEqual([100, 100]);
    act(() => {
      renderer!.root.findByProps({ testID: 'toolbar-zoom-in' }).props.onPress();
    });
    expect(controller.getState().viewport.zoom).toBeCloseTo(1.2);
    act(() => {
      renderer!.root.findByProps({ testID: 'toolbar-fit' }).props.onPress();
    });
    expect(controller.getState().viewport).toEqual({
      zoom: 1,
      pan: { x: 0, y: 0 },
      fitMode: 'contain',
    });
  });

  it('automatically resolves the original source size through the adapter', async () => {
    const controller = createController();
    const renderLayer = jest.fn(() => null);
    const adapter: ImageMarkerEditorRenderAdapter = {
      getSourceInfo: jest.fn(async () => ({
        width: 2000,
        height: 1000,
        encodedWidth: 2000,
        encodedHeight: 1000,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        orientation: 1,
        rotationDegrees: 0,
        mirrored: false,
        requiresNormalization: false,
      })),
      renderPreview: jest.fn(),
      exportOriginal: jest.fn(),
    };
    await act(async () => {
      renderer = create(
        <ImageMarkerEditor
          adapter={adapter}
          controller={controller}
          height={300}
          renderLayer={renderLayer}
          source="/source.jpg"
          testID="editor"
          width={400}
        />
      );
      await Promise.resolve();
    });
    expect(adapter.getSourceInfo).toHaveBeenCalledWith('/source.jpg');
    expect(renderLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'title' }),
      false,
      expect.objectContaining({
        sourceSize: { width: 2000, height: 1000 },
        scale: 0.2,
      })
    );
  });
});
