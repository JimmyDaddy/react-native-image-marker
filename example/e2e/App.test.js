import { device, element, by, waitFor } from 'detox';
import assert from 'power-assert';

describe('e2e/App.test.js', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display correctly', async () => {
    await expect(element(by.id('backgroundImageFormatLabel'))).toBeVisible();
    await expect(element(by.id('backgroundImageFormatLabel'))).toHaveText(
      'background image format:'
    );

    await expect(element(by.id('backgroundImageFormatBtn'))).toBeVisible();
    await expect(element(by.id('backgroundImageFormatBtn'))).toHaveLabel(
      'image'
    );

    await expect(element(by.id('watermarkTypeLabel'))).toBeVisible();
    await expect(element(by.id('watermarkTypeLabel'))).toHaveText(
      'watermark type:'
    );

    await expect(element(by.id('watermarkTypeBtn'))).toBeVisible();
    await expect(element(by.id('watermarkTypeBtn'))).toHaveLabel('text');

    await expect(element(by.id('exportResultFormatLabel'))).toBeVisible();
    await expect(element(by.id('exportResultFormatLabel'))).toHaveText(
      'export result format:'
    );

    await expect(element(by.id('exportResultFormatBtn'))).toBeVisible();
    await expect(element(by.id('exportResultFormatBtn'))).toHaveLabel('png');

    await expect(element(by.id('selectBgBtn'))).toBeVisible();
    await expect(element(by.id('selectBgBtn'))).toHaveLabel('select bg');

    // await expect(element(by.id('selectWatermarkBtn'))).toBeVisible();
    // await expect(element(by.id('selectWatermarkBtn'))).toHaveLabel(
    //   'select watermark'
    // );

    await expect(element(by.id('resultFileSizeLabel'))).toBeVisible();
    await expect(element(by.id('resultFilePathLabel'))).toBeVisible();
    if (device.getPlatform() === 'ios') {
      const resultFileSizeLabel = await element(
        by.id('resultFileSizeLabel')
      ).getAttributes('text');

      assert.ok(
        /^result file size:\d+(.\d+)?\s(KB|MB)$/.test(resultFileSizeLabel.text)
      );
      const resultFilePathLabel = await element(
        by.id('resultFilePathLabel')
      ).getAttributes('text');
      assert.ok(/^file path:.*\.png$/.test(resultFilePathLabel.text));
    } else {
      await expect(element(by.id('resultFileSizeLabel'))).toHaveLabel(
        /^result file size:\d+(\.\d+)?\s(KB|MB)$/
      );
      await expect(element(by.id('resultFilePathLabel'))).toBeVisible();
      await expect(element(by.id('resultFilePathLabel'))).toHaveText(
        /^file path:.*\.png$/
      );
    }

    await expect(element(by.id('resultImage'))).toBeVisible();
  });

  describe('when click backgroundImageFormatBtn', () => {
    it('should display correctly', async () => {
      await expect(element(by.id('backgroundImageFormatBtn'))).toHaveLabel(
        'image'
      );
      await element(by.id('backgroundImageFormatBtn')).tap();
      await waitFor(element(by.type('RCTModalHostView')))
        .toBeVisible()
        .withTimeout(2000);
      await element(by.label('base64')).tap();
      await expect(element(by.id('backgroundImageFormatBtn'))).toHaveLabel(
        'base64'
      );
    });
  });
});
