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
  verifyInvisibleWatermark(): Promise<{
    payload: string;
    pngDetected: boolean;
    jpeg90Detected: boolean;
    jpeg75Detected: boolean;
    jpeg60Detected: boolean;
    adjustedDetected: boolean;
    wrongKeyDetected: boolean;
  }>;
  verifyInvisibleCorpus(sources: string[]): Promise<{
    fixtureCount: number;
    detectedCount: number;
    unmarkedFalsePositives: number;
    minimumPsnr: number;
    minimumSsim: number;
  }>;
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

async function transformDataUrl(
  dataUrl: string,
  type: 'image/jpeg' | 'image/png',
  quality?: number,
  adjustPixels = false
): Promise<string> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable.');
  context.drawImage(image, 0, 0);
  if (adjustPixels) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      for (let channel = 0; channel < 3; channel += 1) {
        pixels.data[index + channel] =
          (pixels.data[index + channel]! - 128) * 1.05 + 133;
      }
    }
    context.putImageData(pixels, 0, 0);
  }
  return canvas.toDataURL(type, quality);
}

async function decodeImage(source: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

async function compareImageQuality(
  referenceSource: string,
  candidateSource: string
): Promise<{ psnr: number; ssim: number }> {
  const [reference, candidate] = await Promise.all([
    decodeImage(referenceSource),
    decodeImage(candidateSource),
  ]);
  const width = candidate.naturalWidth;
  const height = candidate.naturalHeight;
  const referenceCanvas = document.createElement('canvas');
  const candidateCanvas = document.createElement('canvas');
  referenceCanvas.width = candidateCanvas.width = width;
  referenceCanvas.height = candidateCanvas.height = height;
  const referenceContext = referenceCanvas.getContext('2d');
  const candidateContext = candidateCanvas.getContext('2d');
  if (!referenceContext || !candidateContext) {
    throw new Error('Canvas 2D is unavailable.');
  }
  referenceContext.drawImage(reference, 0, 0, width, height);
  candidateContext.drawImage(candidate, 0, 0, width, height);
  const referencePixels = referenceContext.getImageData(
    0,
    0,
    width,
    height
  ).data;
  const candidatePixels = candidateContext.getImageData(
    0,
    0,
    width,
    height
  ).data;

  let squaredError = 0;
  let referenceLumaSum = 0;
  let candidateLumaSum = 0;
  let referenceLumaSquaredSum = 0;
  let candidateLumaSquaredSum = 0;
  let lumaProductSum = 0;
  const pixelCount = width * height;
  for (let index = 0; index < referencePixels.length; index += 4) {
    const referenceRed = referencePixels[index]!;
    const referenceGreen = referencePixels[index + 1]!;
    const referenceBlue = referencePixels[index + 2]!;
    const candidateRed = candidatePixels[index]!;
    const candidateGreen = candidatePixels[index + 1]!;
    const candidateBlue = candidatePixels[index + 2]!;
    squaredError +=
      (referenceRed - candidateRed) ** 2 +
      (referenceGreen - candidateGreen) ** 2 +
      (referenceBlue - candidateBlue) ** 2;

    const referenceLuma =
      referenceRed * 0.2126 + referenceGreen * 0.7152 + referenceBlue * 0.0722;
    const candidateLuma =
      candidateRed * 0.2126 + candidateGreen * 0.7152 + candidateBlue * 0.0722;
    referenceLumaSum += referenceLuma;
    candidateLumaSum += candidateLuma;
    referenceLumaSquaredSum += referenceLuma ** 2;
    candidateLumaSquaredSum += candidateLuma ** 2;
    lumaProductSum += referenceLuma * candidateLuma;
  }

  const meanSquaredError = squaredError / (pixelCount * 3);
  const psnr =
    meanSquaredError === 0
      ? Number.POSITIVE_INFINITY
      : 10 * Math.log10(255 ** 2 / meanSquaredError);
  const referenceMean = referenceLumaSum / pixelCount;
  const candidateMean = candidateLumaSum / pixelCount;
  const referenceVariance =
    referenceLumaSquaredSum / pixelCount - referenceMean ** 2;
  const candidateVariance =
    candidateLumaSquaredSum / pixelCount - candidateMean ** 2;
  const covariance =
    lumaProductSum / pixelCount - referenceMean * candidateMean;
  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;
  const ssim =
    ((2 * referenceMean * candidateMean + c1) * (2 * covariance + c2)) /
    ((referenceMean ** 2 + candidateMean ** 2 + c1) *
      (referenceVariance + candidateVariance + c2));
  return { psnr, ssim };
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

    async verifyInvisibleWatermark() {
      const key = 'smoke-test-key-2026';
      const payload = 'asset-42';
      const marked = await Marker.embedInvisible({
        image: { src: assets.backgroundUri },
        payload,
        key,
        strength: 'robust',
        saveFormat: ImageFormat.png,
      });
      const [jpeg90, jpeg75, jpeg60, adjusted] = await Promise.all([
        transformDataUrl(marked, 'image/jpeg', 0.9),
        transformDataUrl(marked, 'image/jpeg', 0.75),
        transformDataUrl(marked, 'image/jpeg', 0.6),
        transformDataUrl(marked, 'image/png', undefined, true),
      ]);
      const detect = (image: string, detectKey = key) =>
        Marker.detectInvisible({
          image: { src: image },
          key: detectKey,
          strength: 'robust',
          search: 'fast',
        });
      const [png, q90, q75, q60, adjustedResult, wrongKey] = await Promise.all([
        detect(marked),
        detect(jpeg90),
        detect(jpeg75),
        detect(jpeg60),
        detect(adjusted),
        detect(marked, 'different-smoke-key'),
      ]);
      return {
        payload: png.payload ?? '',
        pngDetected: png.detected,
        jpeg90Detected: q90.detected,
        jpeg75Detected: q75.detected,
        jpeg60Detected: q60.detected,
        adjustedDetected: adjustedResult.detected,
        wrongKeyDetected: wrongKey.detected,
      };
    },

    async verifyInvisibleCorpus(sources: string[]) {
      const key = 'corpus-test-key-2026';
      let detectedCount = 0;
      let unmarkedFalsePositives = 0;
      let minimumPsnr = Number.POSITIVE_INFINITY;
      let minimumSsim = Number.POSITIVE_INFINITY;
      for (let index = 0; index < sources.length; index += 1) {
        const source = sources[index]!;
        const unmarked = await Marker.detectInvisible({
          image: { src: source },
          key,
          strength: 'balanced',
          search: 'fast',
          maxSize: 512,
        });
        if (unmarked.detected) unmarkedFalsePositives += 1;

        const payload = `fixture-${index}`;
        const marked = await Marker.embedInvisible({
          image: { src: source },
          payload,
          key,
          strength: 'balanced',
          saveFormat: ImageFormat.png,
          maxSize: 512,
        });
        const detected = await Marker.detectInvisible({
          image: { src: marked },
          key,
          strength: 'balanced',
          search: 'fast',
          maxSize: 512,
        });
        if (detected.detected && detected.payload === payload) {
          detectedCount += 1;
        }
        const quality = await compareImageQuality(source, marked);
        minimumPsnr = Math.min(minimumPsnr, quality.psnr);
        minimumSsim = Math.min(minimumSsim, quality.ssim);
      }
      return {
        fixtureCount: sources.length,
        detectedCount,
        unmarkedFalsePositives,
        minimumPsnr,
        minimumSsim,
      };
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
