import {
  createMarkerImageInfo,
  parseEncodedImageInfo,
  parseNativeImageInfo,
} from '../image-info';
import { getWebImageInfo } from '../web/browser';

function createPng(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function createOrientedJpeg(
  width: number,
  height: number,
  orientation: number
): Uint8Array {
  const bytes = new Uint8Array(2 + 36 + 19 + 2);
  let offset = 0;
  bytes.set([0xff, 0xd8], offset);
  offset += 2;

  bytes.set([0xff, 0xe1, 0x00, 0x22], offset);
  offset += 4;
  bytes.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], offset);
  offset += 6;
  bytes.set([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00], offset);
  offset += 8;
  bytes.set([0x01, 0x00], offset);
  offset += 2;
  bytes.set(
    [
      0x12,
      0x01,
      0x03,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      orientation,
      0x00,
      0x00,
      0x00,
    ],
    offset
  );
  offset += 12;
  bytes.set([0x00, 0x00, 0x00, 0x00], offset);
  offset += 4;

  bytes.set([0xff, 0xc0, 0x00, 0x11, 0x08], offset);
  const view = new DataView(bytes.buffer);
  view.setUint16(offset + 5, height);
  view.setUint16(offset + 7, width);
  bytes.set(
    [0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00],
    offset + 9
  );
  offset += 19;
  bytes.set([0xff, 0xd9], offset);
  return bytes;
}

describe('image metadata', () => {
  it('reads PNG dimensions without decoding pixels', () => {
    expect(parseEncodedImageInfo(createPng(1200, 800))).toEqual({
      width: 1200,
      height: 800,
      encodedWidth: 1200,
      encodedHeight: 800,
      format: 'png',
      mimeType: 'image/png',
      orientation: 1,
      rotationDegrees: 0,
      mirrored: false,
      requiresNormalization: false,
    });
  });

  it('reads Blob metadata through the public Web metadata path', async () => {
    await expect(
      getWebImageInfo(new Blob([createPng(900, 600)], { type: 'image/png' }))
    ).resolves.toEqual(
      expect.objectContaining({
        width: 900,
        height: 600,
        encodedWidth: 900,
        encodedHeight: 600,
        format: 'png',
      })
    );
  });

  it('keeps encoded JPEG dimensions and returns the upright display size', () => {
    expect(parseEncodedImageInfo(createOrientedJpeg(4032, 3024, 6))).toEqual({
      width: 3024,
      height: 4032,
      encodedWidth: 4032,
      encodedHeight: 3024,
      format: 'jpeg',
      mimeType: 'image/jpeg',
      orientation: 6,
      rotationDegrees: 90,
      mirrored: false,
      requiresNormalization: true,
    });
  });

  it('describes mirrored orientation transforms', () => {
    expect(
      createMarkerImageInfo({
        width: 640,
        height: 480,
        format: 'heif',
        orientation: 7,
      })
    ).toEqual(
      expect.objectContaining({
        width: 480,
        height: 640,
        rotationDegrees: 270,
        mirrored: true,
        requiresNormalization: true,
      })
    );
  });

  it('rejects malformed and inconsistent native metadata', () => {
    expect(() => parseNativeImageInfo('{')).toThrow('invalid JSON');
    expect(() =>
      parseNativeImageInfo(
        JSON.stringify({
          width: 100,
          height: 200,
          encodedWidth: 100,
          encodedHeight: 200,
          format: 'png',
          orientation: 6,
          rotationDegrees: 0,
          mirrored: false,
          requiresNormalization: false,
        })
      )
    ).toThrow('inconsistent data');
  });
});
