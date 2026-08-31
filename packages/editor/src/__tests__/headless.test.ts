jest.mock('react-native-image-marker', () => ({
  __esModule: true,
  ImageFormat: {
    jpg: 'jpg',
    png: 'png',
    webp: 'webp',
    base64: 'base64',
  },
  migrateWatermarkRecipe: jest.fn((value) => value),
}));

import * as headless from '../headless';

describe('headless entry source', () => {
  it('exposes the controller and geometry without editor UI exports', () => {
    expect(headless.ImageMarkerEditorController).toBeDefined();
    expect(headless.projectEditorRecipe).toBeDefined();
    expect('ImageMarkerEditor' in headless).toBe(false);
    expect('useImageMarkerEditorState' in headless).toBe(false);
  });
});
