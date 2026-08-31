import { createWebMarker, ImageFormat, Position } from '@image-marker/web';
import workerUrl from '@image-marker/web/worker?url';

const sourceInput = document.querySelector<HTMLInputElement>('#source');
const renderButton = document.querySelector<HTMLButtonElement>('#render');
const cancelButton = document.querySelector<HTMLButtonElement>('#cancel');
const status = document.querySelector<HTMLElement>('#status');
const preview = document.querySelector<HTMLImageElement>('#preview');
const download = document.querySelector<HTMLAnchorElement>('#download');

if (
  !sourceInput ||
  !renderButton ||
  !cancelButton ||
  !status ||
  !preview ||
  !download
) {
  throw new Error('Example markup is incomplete.');
}

const marker = createWebMarker();
let source: File | undefined;
let sourceUrl: string | undefined;
let outputUrl: string | undefined;
let active: AbortController | undefined;

function revokeObjectUrl(url: string | undefined): undefined {
  if (url) URL.revokeObjectURL(url);
  return undefined;
}

sourceInput.addEventListener('change', () => {
  active?.abort();
  source = sourceInput.files?.[0];
  renderButton.disabled = !source;
  download.hidden = true;
  sourceUrl = revokeObjectUrl(sourceUrl);
  outputUrl = revokeObjectUrl(outputUrl);
  if (source) {
    sourceUrl = URL.createObjectURL(source);
    preview.src = sourceUrl;
    status.textContent = `${source.name} ready.`;
  }
});

cancelButton.addEventListener('click', () => {
  active?.abort();
  marker.cancel().catch(() => undefined);
  status.textContent = 'Cancellation requested.';
});

renderButton.addEventListener('click', async () => {
  if (!source || active) return;
  const controller = new AbortController();
  active = controller;
  renderButton.disabled = true;
  cancelButton.disabled = false;
  status.textContent = 'Rendering locally…';
  try {
    const result = await marker.markText(
      {
        backgroundImage: { src: source },
        watermarkTexts: [
          {
            text: 'IMAGE MARKER',
            position: { position: Position.bottomRight, X: 24, Y: 24 },
            style: { color: '#FFFFFF', fontSize: 32, bold: true },
          },
        ],
        saveFormat: ImageFormat.png,
        filename: 'marked-image',
      },
      { signal: controller.signal }
    );
    preview.src = result.uri;

    // A Recipe with resultType:'blob' is useful when a caller wants bytes.
    const recipe = marker.createRecipe(
      {
        schemaVersion: 2,
        layers: [
          {
            id: 'label',
            type: 'text',
            text: 'IMAGE MARKER',
            position: { position: Position.bottomRight, X: 24, Y: 24 },
            style: { color: '#FFFFFF', fontSize: 32, bold: true },
          },
        ],
        output: { saveFormat: ImageFormat.png },
      },
      { resultType: 'blob' }
    );
    const blob = await recipe.apply(
      { backgroundImage: { src: source }, filename: 'marked-image' },
      { signal: controller.signal }
    );

    sourceUrl = revokeObjectUrl(sourceUrl);
    outputUrl = revokeObjectUrl(outputUrl);
    outputUrl = URL.createObjectURL(blob);
    preview.src = outputUrl;
    download.href = outputUrl;
    download.hidden = false;
    status.textContent = `Rendered ${blob.type || 'image'} (${
      blob.size
    } bytes). Worker: ${workerUrl}`;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    if (active === controller) active = undefined;
    renderButton.disabled = !source;
    cancelButton.disabled = true;
  }
});

window.addEventListener('pagehide', () => {
  active?.abort();
  sourceUrl = revokeObjectUrl(sourceUrl);
  outputUrl = revokeObjectUrl(outputUrl);
  marker.dispose().catch(() => undefined);
});
