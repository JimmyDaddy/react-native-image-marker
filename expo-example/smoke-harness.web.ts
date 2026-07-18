import Marker, {
  ImageFormat,
  Position,
  RotationCanvasMode,
} from 'react-native-image-marker';

interface SmokeHarnessAssets {
  backgroundUri: string;
  logoUri: string;
}

interface ImageResult {
  dataUrl: string;
  width: number;
  height: number;
}

interface WebSmokeHarness {
  renderBlobAndFile(): Promise<ImageResult>;
  renderRecipeBlobs(): Promise<{
    pngType: string;
    pngSize: number;
    jpegType: string;
    jpegSize: number;
  }>;
  renderLargeCropped(): Promise<ImageResult>;
  renderTiledLayers(): Promise<ImageResult>;
  renderCrossOrigin(url: string): Promise<string>;
}

declare global {
  interface Window {
    __IMAGE_MARKER_SMOKE__?: WebSmokeHarness;
  }
}

async function fetchBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Unable to load smoke fixture: ${response.status}`);
  }
  return response.blob();
}

async function getDimensions(dataUrl: string): Promise<ImageResult> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return {
    dataUrl,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

async function createLargeImage(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 3072;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D is unavailable.');
  }

  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  gradient.addColorStop(0, '#0B3A69');
  gradient.addColorStop(0.5, '#E5654B');
  gradient.addColorStop(1, '#F9D58A');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error('Unable to encode the large smoke fixture.'));
      }
    }, 'image/png');
  });
  return new File([blob], 'large-background.png', { type: 'image/png' });
}

function createHarness(assets: SmokeHarnessAssets): WebSmokeHarness {
  return {
    async renderBlobAndFile() {
      const [backgroundBlob, logoBlob] = await Promise.all([
        fetchBlob(assets.backgroundUri),
        fetchBlob(assets.logoUri),
      ]);
      const backgroundFile = new File([backgroundBlob], 'background.png', {
        type: backgroundBlob.type || 'image/png',
      });
      const dataUrl = await Marker.markImage({
        backgroundImage: { src: backgroundFile },
        watermarkImage: {
          src: logoBlob,
          position: { position: Position.center },
          scale: 0.18,
          alpha: 0.55,
          rotate: 17,
        },
        saveFormat: ImageFormat.png,
      });
      return getDimensions(dataUrl);
    },

    async renderRecipeBlobs() {
      const commonOptions = {
        watermarks: [
          {
            type: 'text' as const,
            text: 'BLOB RECIPE',
            position: { position: Position.bottomRight, X: 24, Y: 24 },
            style: {
              color: '#FFFFFF',
              fontSize: 32,
              bold: true,
              strokeStyle: { color: '#111827', width: 2 },
            },
          },
        ],
      };
      const pngRecipe = Marker.createRecipe(
        { ...commonOptions, saveFormat: ImageFormat.png },
        { resultType: 'blob' }
      );
      const jpegRecipe = Marker.createRecipe(
        { ...commonOptions, saveFormat: ImageFormat.jpg, quality: 86 },
        { resultType: 'blob' }
      );
      const [png, jpeg] = await Promise.all([
        pngRecipe.apply({ backgroundImage: { src: assets.backgroundUri } }),
        jpegRecipe.apply({ backgroundImage: { src: assets.backgroundUri } }),
      ]);
      return {
        pngType: png.type,
        pngSize: png.size,
        jpegType: jpeg.type,
        jpegSize: jpeg.size,
      };
    },

    async renderLargeCropped() {
      const dataUrl = await Marker.markText({
        backgroundImage: {
          src: await createLargeImage(),
          rotate: 90,
          alpha: 0.8,
        },
        watermarkTexts: [
          {
            text: '4096 × 3072 → max 1024',
            position: { position: Position.center },
            style: {
              color: '#FFFFFF',
              fontSize: 48,
              bold: true,
              strokeStyle: {
                color: '#111827',
                width: 3,
              },
            },
          },
        ],
        maxSize: 1024,
        rotationCanvasMode: RotationCanvasMode.crop,
        saveFormat: ImageFormat.png,
      });
      return getDimensions(dataUrl);
    },

    async renderTiledLayers() {
      const dataUrl = await Marker.mark({
        backgroundImage: { src: assets.backgroundUri },
        watermarks: [
          {
            type: 'text',
            text: 'IMAGE MARKER',
            layout: {
              type: 'tile',
              gapX: '8%',
              gapY: '10%',
              offsetX: '-3%',
              stagger: true,
            },
            style: {
              color: '#FFFFFF88',
              fontSize: 28,
              bold: true,
              rotate: -24,
            },
          },
          {
            type: 'image',
            src: assets.logoUri,
            layout: {
              type: 'tile',
              gapX: '28%',
              gapY: '24%',
              offsetY: '7%',
              stagger: true,
            },
            scale: 0.08,
            rotate: 18,
            alpha: 0.75,
            trimTransparentPadding: true,
          },
        ],
        saveFormat: ImageFormat.png,
      });
      return getDimensions(dataUrl);
    },

    async renderCrossOrigin(url: string) {
      try {
        await Marker.markText({
          backgroundImage: { src: { uri: url } },
          watermarkTexts: [{ text: 'CORS' }],
          saveFormat: ImageFormat.png,
        });
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
      throw new Error('Expected the cross-origin image to be rejected.');
    },
  };
}

export function installWebSmokeHarness(assets: SmokeHarnessAssets): void {
  if (
    typeof window === 'undefined' ||
    !new URLSearchParams(window.location.search).has('smoke')
  ) {
    return;
  }
  window.__IMAGE_MARKER_SMOKE__ = createHarness(assets);
}
