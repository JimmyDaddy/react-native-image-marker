import * as React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  ImageMarkerEditorAssetPanel,
  ImageMarkerEditorInspector,
  ImageMarkerEditorLayerPanel,
} from '../EditorPanels';
import { ImageMarkerEditorController } from '../controller';

function createController() {
  const controller = new ImageMarkerEditorController({
    schemaVersion: 2,
    layers: [
      {
        id: 'title',
        name: 'Title',
        type: 'text',
        text: 'Hello',
        style: { color: '#FFFFFF', fontSize: 32 },
      },
      {
        id: 'logo',
        name: 'Logo',
        type: 'image',
        src: '/logo.png',
      },
    ],
    output: {},
  });
  controller.selectLayer('title');
  return controller;
}

describe('Editor panels', () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(() => {
    renderer?.unmount();
    renderer = undefined;
  });

  it('edits text, brand colors, and rich style properties', () => {
    const controller = createController();
    act(() => {
      renderer = create(
        <ImageMarkerEditorInspector
          brandKit={{ colors: ['#FF3366'], fonts: ['Inter'] }}
          controller={controller}
          testID="inspector"
        />
      );
    });
    act(() => {
      renderer!.root
        .findByProps({ testID: 'inspector-text' })
        .props.onChangeText('Campaign');
      renderer!.root
        .findByProps({ testID: 'inspector-font-size' })
        .props.onChangeText('48');
      renderer!.root
        .findByProps({ testID: 'inspector-brand-color-#FF3366' })
        .props.onPress();
      renderer!.root
        .findByProps({ testID: 'inspector-blend-overlay' })
        .props.onPress();
    });
    expect(controller.getState().recipe.layers[0]).toEqual(
      expect.objectContaining({
        text: 'Campaign',
        blendMode: 'overlay',
        style: expect.objectContaining({
          color: '#FF3366',
          fontSize: 48,
        }),
      })
    );
  });

  it('manages multi-selection and replaces the selected image asset', () => {
    const controller = createController();
    act(() => {
      renderer = create(
        <>
          <ImageMarkerEditorLayerPanel
            controller={controller}
            testID="layers"
          />
          <ImageMarkerEditorAssetPanel
            assets={[
              { id: 'new-logo', name: 'New logo', source: '/new-logo.png' },
            ]}
            controller={controller}
            testID="assets"
          />
        </>
      );
    });
    act(() => {
      renderer!.root
        .findByProps({ testID: 'layers-logo-select' })
        .props.onLongPress();
    });
    expect(controller.getState().selectedLayerIds).toEqual(['title', 'logo']);
    act(() => {
      renderer!.root
        .findByProps({ testID: 'layers-logo-select' })
        .props.onPress();
      renderer!.root.findByProps({ testID: 'assets-new-logo' }).props.onPress();
    });
    expect(controller.getState().recipe.layers[1]).toEqual(
      expect.objectContaining({
        name: 'New logo',
        src: '/new-logo.png',
      })
    );
  });
});
