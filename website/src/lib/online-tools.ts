import Marker, {
  ImageFormat,
  Position,
  migrateWatermarkRecipe,
} from '../../../src/index';
import type {
  InvisibleWatermarkDetectionResult,
  InvisibleWatermarkSearch,
  InvisibleWatermarkStrength,
  WatermarkRecipeDefinition,
  WatermarkRecipeDocument,
} from '../../../src/index';

const DEFAULT_BACKGROUND = '/media/playground-background.jpg';
const DEFAULT_LOGO = '/media/marker-compass.png';
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_PIXELS = 16_000_000;
const MAX_BATCH_FILES = 20;
const MAX_BATCH_BYTES = 80 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

type Tool =
  | 'watermark'
  | 'batch-watermark'
  | 'confidential-watermark'
  | 'invisible-watermark'
  | 'trace-checker'
  | 'recipe-builder'
  | 'recipient-trace-package'
  | 'trace-lab'
  | 'content-credentials';

type StatusState = 'idle' | 'busy' | 'success' | 'error';

interface ToolContext {
  root: HTMLElement;
  tool: Tool;
  zh: boolean;
  sourceInput: HTMLInputElement;
  preview: HTMLImageElement;
  status: HTMLElement;
  result: HTMLElement;
  json: HTMLElement;
  currentResult?: Blob;
  currentJson?: unknown;
  batchFiles?: Record<string, Uint8Array>;
  abortController?: AbortController;
  objectUrl?: string;
}

const positionByName: Record<string, Position> = {
  topLeft: Position.topLeft,
  topRight: Position.topRight,
  bottomLeft: Position.bottomLeft,
  bottomRight: Position.bottomRight,
  center: Position.center,
};

export function initializeOnlineTools(root: HTMLElement): void {
  root.dataset.initialized = 'true';
  const sourceInput = query<HTMLInputElement>(root, '[data-source-file]');
  const context: ToolContext = {
    root,
    tool: root.dataset.tool as Tool,
    zh: root.dataset.locale === 'zh-CN',
    sourceInput,
    preview: query<HTMLImageElement>(root, '[data-preview]'),
    status: query(root, '[data-status]'),
    result: query(root, '[data-result]'),
    json: query(root, '[data-json]'),
  };

  bindRangeOutputs(context);
  sourceInput.addEventListener('change', () =>
    startAsync(context, () => handleSourceChange(context))
  );
  queryAll<HTMLSelectElement | HTMLInputElement>(
    root,
    '[data-layout], [data-opacity], [data-font-size], [data-rotation], [data-stroke], [data-position], [data-format], [data-include-logo]'
  ).forEach((control) => {
    control.addEventListener('input', () => {
      bindRangeOutputs(context);
      updatePositionAvailability(context);
      if (
        context.tool === 'watermark' ||
        context.tool === 'confidential-watermark'
      ) {
        scheduleVisibleRender(context);
      }
    });
  });
  field<HTMLInputElement>(context, 'watermark-text')?.addEventListener(
    'input',
    () => scheduleVisibleRender(context)
  );
  field<HTMLSelectElement>(context, 'preset')?.addEventListener(
    'change',
    (event) => {
      const text = field<HTMLInputElement>(context, 'watermark-text');
      if (text) text.value = (event.currentTarget as HTMLSelectElement).value;
      scheduleVisibleRender(context);
    }
  );

  field<HTMLButtonElement>(context, 'run')?.addEventListener('click', () =>
    startAsync(context, () => runTool(context))
  );
  field<HTMLButtonElement>(context, 'download')?.addEventListener('click', () =>
    downloadCurrentResult(context)
  );
  field<HTMLButtonElement>(context, 'export')?.addEventListener('click', () =>
    downloadJson(context.currentJson, exportFilename(context))
  );
  field<HTMLButtonElement>(context, 'download-recipe')?.addEventListener(
    'click',
    () => downloadRecipe(context)
  );
  field<HTMLButtonElement>(context, 'copy-code')?.addEventListener(
    'click',
    () => startAsync(context, () => copyRecipeCode(context))
  );
  field<HTMLButtonElement>(context, 'cancel')?.addEventListener('click', () =>
    context.abortController?.abort()
  );
  field<HTMLButtonElement>(context, 'download-zip')?.addEventListener(
    'click',
    () => startAsync(context, () => downloadBatchZip(context))
  );

  updatePositionAvailability(context);
  if (
    context.tool === 'watermark' ||
    context.tool === 'confidential-watermark'
  ) {
    startAsync(context, () => renderVisibleWatermark(context));
  }
}

let visibleTimer: number | undefined;
function scheduleVisibleRender(context: ToolContext): void {
  window.clearTimeout(visibleTimer);
  visibleTimer = window.setTimeout(
    () => startAsync(context, () => renderVisibleWatermark(context)),
    180
  );
}

function startAsync(context: ToolContext, task: () => Promise<void>): void {
  task().catch((error) => setStatus(context, humanError(error), 'error'));
}

async function runTool(context: ToolContext): Promise<void> {
  const actions: Record<Tool, (ctx: ToolContext) => Promise<void>> = {
    'watermark': renderVisibleWatermark,
    'confidential-watermark': renderVisibleWatermark,
    'batch-watermark': runBatchWatermark,
    'invisible-watermark': embedInvisibleWatermark,
    'trace-checker': checkTraceWatermark,
    'recipe-builder': applyRecipe,
    'recipient-trace-package': createRecipientPackage,
    'trace-lab': runTraceLab,
    'content-credentials': inspectContentCredentials,
  };
  try {
    await actions[context.tool](context);
  } catch (error) {
    setStatus(context, humanError(error), 'error');
  }
}

async function handleSourceChange(context: ToolContext): Promise<void> {
  const files = Array.from(context.sourceInput.files ?? []);
  if (files.length === 0) return;
  try {
    if (context.tool === 'batch-watermark')
      validateBatchSelection(context, files);
    for (const file of files) await validateImageFile(file, context.zh);
    const label = field<HTMLElement>(context, 'file-label');
    if (label) {
      label.textContent =
        files.length === 1
          ? files[0]!.name
          : context.zh
          ? `已选择 ${files.length} 张图片`
          : `${files.length} images selected`;
    }
    if (files.length === 1)
      context.preview.src = await fileToDataUrl(files[0]!);
    setStatus(context, context.zh ? '图片已就绪' : 'Image ready', 'idle');
    if (
      context.tool === 'watermark' ||
      context.tool === 'confidential-watermark'
    ) {
      await renderVisibleWatermark(context);
    }
  } catch (error) {
    context.sourceInput.value = '';
    setStatus(context, humanError(error), 'error');
  }
}

async function renderVisibleWatermark(context: ToolContext): Promise<void> {
  setStatus(context, context.zh ? '正在生成…' : 'Rendering…', 'busy');
  const source = await currentSource(context);
  const text = requiredValue(context, 'watermark-text');
  const layout = requiredValue(context, 'layout');
  const alpha = numberValue(context, 'opacity', 72) / 100;
  const fontSize = numberValue(context, 'font-size', 52);
  const rotate = numberValue(context, 'rotation', 0);
  const strokeWidth = numberValue(context, 'stroke', 2);
  const format = requiredValue(context, 'format');
  const positionName = requiredValue(context, 'position');
  const watermarks: Parameters<typeof Marker.mark>[0]['watermarks'] = [
    {
      type: 'text',
      text,
      alpha,
      ...(layout === 'tile'
        ? {
            layout: {
              type: 'tile',
              gapX: 92,
              gapY: 72,
              stagger: true,
            } as const,
          }
        : {
            position: {
              position: positionByName[positionName] ?? Position.bottomRight,
              X: 34,
              Y: 30,
            },
          }),
      style: {
        color: '#FFFFFF',
        fontSize,
        bold: true,
        rotate,
        strokeStyle:
          strokeWidth > 0 ? { color: '#111827CC', width: strokeWidth } : null,
        shadowStyle: { color: '#00000066', dx: 2, dy: 3, radius: 4 },
      },
    },
  ];
  if (field<HTMLInputElement>(context, 'include-logo')?.checked) {
    watermarks.push({
      type: 'image',
      src: DEFAULT_LOGO,
      scale: 0.32,
      alpha: 0.95,
      position: { position: Position.topRight, X: 28, Y: 28 },
      trimTransparentPadding: true,
    });
  }
  const dataUrl = await Marker.mark({
    backgroundImage: { src: source },
    watermarks,
    saveFormat: format === 'jpg' ? ImageFormat.jpg : ImageFormat.png,
    quality: 92,
    matteColor: '#FFFFFF',
    maxSize: 2048,
  });
  context.currentResult = dataUrlToBlob(dataUrl.uri);
  context.preview.src = dataUrl.uri;
  enable(context, 'download');
  setStatus(context, context.zh ? '水印已生成' : 'Watermark ready', 'success');
}

async function runBatchWatermark(context: ToolContext): Promise<void> {
  const files = Array.from(context.sourceInput.files ?? []);
  if (files.length === 0)
    throw new Error(
      context.zh ? '请先选择至少一张图片。' : 'Choose at least one image.'
    );
  validateBatchSelection(context, files);
  context.abortController?.abort();
  context.abortController = new AbortController();
  const signal = context.abortController.signal;
  const run = field<HTMLButtonElement>(context, 'run');
  const cancel = field<HTMLButtonElement>(context, 'cancel');
  const zipButton = field<HTMLButtonElement>(context, 'download-zip');
  if (run) run.disabled = true;
  if (cancel) cancel.disabled = false;
  if (zipButton) zipButton.disabled = true;
  const progress = field<HTMLElement>(context, 'progress');
  if (progress) progress.hidden = false;
  context.batchFiles = {};
  setStatus(
    context,
    context.zh ? '正在批量处理…' : 'Processing batch…',
    'busy'
  );

  try {
    const format = requiredValue(context, 'format');
    const layout = requiredValue(context, 'layout');
    const recipe = Marker.createRecipe(
      {
        schemaVersion: 2,
        layers: [
          {
            type: 'text',
            text: requiredValue(context, 'watermark-text'),
            alpha: numberValue(context, 'opacity', 72) / 100,
            ...(layout === 'tile'
              ? {
                  layout: {
                    type: 'tile',
                    gapX: 92,
                    gapY: 70,
                    stagger: true,
                  } as const,
                }
              : { position: { position: Position.bottomRight, X: 28, Y: 26 } }),
            style: {
              color: '#FFFFFF',
              fontSize: 44,
              bold: true,
              strokeStyle: { color: '#111827CC', width: 2 },
            },
          },
        ],
        output: {
          saveFormat: format === 'jpg' ? ImageFormat.jpg : ImageFormat.png,
          quality: 92,
        },
      },
      { resultType: 'blob' }
    );
    const inputs = await Promise.all(
      files.map(async (file) => ({
        backgroundImage: { src: await fileToDataUrl(file) },
        filename: baseName(file.name),
      }))
    );
    const results = await recipe.applyMany(inputs, {
      concurrency: 3,
      signal,
      onProgress: ({ settled, total, succeeded, failed, aborted }) => {
        const percent = Math.round((settled / total) * 100);
        const bar = field<HTMLElement>(context, 'progress-bar');
        if (bar) bar.style.width = `${percent}%`;
        const label = field<HTMLElement>(context, 'progress-label');
        if (label)
          label.textContent = context.zh
            ? `${settled}/${total} · 成功 ${succeeded} · 失败 ${failed} · 停止 ${aborted}`
            : `${settled}/${total} · ${succeeded} ready · ${failed} failed · ${aborted} stopped`;
      },
    });
    for (const [index, result] of results.entries()) {
      if (result.status !== 'fulfilled') continue;
      const extension = format === 'jpg' ? 'jpg' : 'png';
      const filename = `${safeName(
        baseName(files[index]!.name)
      )}-marked.${extension}`;
      context.batchFiles[filename] = new Uint8Array(
        await result.value.arrayBuffer()
      );
    }
    const first = Object.values(context.batchFiles)[0];
    if (first)
      showBlob(
        context,
        bytesToBlob(first, format === 'jpg' ? 'image/jpeg' : 'image/png')
      );
    if (Object.keys(context.batchFiles).length > 0 && zipButton)
      zipButton.disabled = false;
    setStatus(
      context,
      signal.aborted
        ? context.zh
          ? '已停止；可下载已完成结果'
          : 'Stopped; completed results are available'
        : context.zh
        ? `已生成 ${Object.keys(context.batchFiles).length} 张图片`
        : `${Object.keys(context.batchFiles).length} images ready`,
      signal.aborted ? 'idle' : 'success'
    );
  } finally {
    if (run) run.disabled = false;
    if (cancel) cancel.disabled = true;
  }
}

async function downloadBatchZip(context: ToolContext): Promise<void> {
  if (!context.batchFiles || Object.keys(context.batchFiles).length === 0)
    return;
  setStatus(context, context.zh ? '正在打包 ZIP…' : 'Creating ZIP…', 'busy');
  const { zipSync } = await import('fflate');
  const bytes = zipSync(context.batchFiles, { level: 6 });
  downloadBlob(
    new Blob([bytes], { type: 'application/zip' }),
    'image-marker-batch.zip'
  );
  setStatus(context, context.zh ? 'ZIP 已下载' : 'ZIP downloaded', 'success');
}

async function embedInvisibleWatermark(context: ToolContext): Promise<void> {
  setStatus(context, context.zh ? '正在嵌入…' : 'Embedding…', 'busy');
  const payload = requiredValue(context, 'payload');
  const key = requiredValue(context, 'key');
  const strength = requiredValue(
    context,
    'strength'
  ) as InvisibleWatermarkStrength;
  const result = await Marker.embedInvisible({
    image: { src: await currentSource(context) },
    payload,
    key,
    strength,
    saveFormat: ImageFormat.png,
    maxSize: 2048,
  });
  context.currentResult = dataUrlToBlob(result.uri);
  context.currentJson = {
    algorithm: 'dct-qim-v1',
    payload,
    strength,
    createdAt: new Date().toISOString(),
    note: context.zh
      ? '密钥未写入记录，请在可信位置单独保存。'
      : 'The key is not included. Store it separately in a trusted system.',
  };
  context.preview.src = result.uri;
  enable(context, 'download');
  enable(context, 'export');
  showJson(context, context.currentJson);
  setStatus(
    context,
    context.zh ? '隐形 locator 已嵌入' : 'Invisible locator embedded',
    'success'
  );
}

async function checkTraceWatermark(context: ToolContext): Promise<void> {
  setStatus(context, context.zh ? '正在检测…' : 'Detecting…', 'busy');
  const detection = await Marker.detectInvisible({
    image: { src: await currentSource(context) },
    key: requiredValue(context, 'key'),
    strength: requiredValue(context, 'strength') as InvisibleWatermarkStrength,
    search: (field<HTMLSelectElement>(context, 'search')?.value ??
      'fast') as InvisibleWatermarkSearch,
    maxSize: 2048,
    worker: { scriptUrl: '/worker/invisible-watermark.js' },
  });
  context.currentJson = detection;
  showDetection(context, detection);
  showJson(context, detection);
  enable(context, 'export');
  setStatus(
    context,
    detection.detected
      ? context.zh
        ? '检测到有效的 Image Marker 追踪水印'
        : 'Authenticated Image Marker trace found'
      : context.zh
      ? '未检测到有效追踪水印'
      : 'No authenticated trace found',
    detection.detected ? 'success' : 'idle'
  );
}

async function applyRecipe(context: ToolContext): Promise<void> {
  setStatus(
    context,
    context.zh ? '正在验证并应用 Recipe…' : 'Validating and applying recipe…',
    'busy'
  );
  const definition = parseRecipe(context);
  const recipe = Marker.createRecipe(definition, { resultType: 'blob' });
  const result = await recipe.apply({
    backgroundImage: { src: await currentSource(context) },
    filename: context.sourceInput.files?.[0]
      ? baseName(context.sourceInput.files[0].name)
      : 'sample',
  });
  context.currentResult = result;
  showBlob(context, result);
  showJson(context, recipe.toJSON());
  setStatus(
    context,
    context.zh ? 'Recipe 有效，预览已更新' : 'Recipe valid; preview updated',
    'success'
  );
}

function downloadRecipe(context: ToolContext): void {
  try {
    downloadJson(parseRecipe(context), 'image-marker.recipe.json');
    setStatus(
      context,
      context.zh ? 'Recipe 已下载' : 'Recipe downloaded',
      'success'
    );
  } catch (error) {
    setStatus(context, humanError(error), 'error');
  }
}

async function copyRecipeCode(context: ToolContext): Promise<void> {
  try {
    const recipe = parseRecipe(context);
    const code = `import Marker from 'react-native-image-marker';\n\nconst recipe = Marker.createRecipe(${JSON.stringify(
      recipe,
      null,
      2
    )});\nconst output = await recipe.apply({\n  backgroundImage: { src: sourceImage },\n  filename: 'photo',\n});`;
    await navigator.clipboard.writeText(code);
    setStatus(
      context,
      context.zh ? '调用代码已复制' : 'Integration code copied',
      'success'
    );
  } catch (error) {
    setStatus(context, humanError(error), 'error');
  }
}

async function createRecipientPackage(context: ToolContext): Promise<void> {
  setStatus(
    context,
    context.zh ? '正在生成独立 locator…' : 'Creating unique locators…',
    'busy'
  );
  const recipients = parseRecipients(requiredValue(context, 'recipients'));
  if (recipients.length === 0)
    throw new Error(
      context.zh
        ? '至少输入一个收件人标识。'
        : 'Enter at least one recipient ID.'
    );
  if (recipients.length > 30)
    throw new Error(
      context.zh
        ? '浏览器工具一次最多处理 30 个收件人。'
        : 'The browser tool handles up to 30 recipients per run.'
    );
  const source = await currentSource(context);
  const key = requiredValue(context, 'key');
  const strength = requiredValue(
    context,
    'strength'
  ) as InvisibleWatermarkStrength;
  const mapping = recipients.map((recipient) => ({
    recipient,
    locator: randomLocator(),
  }));
  const results = await Marker.embedInvisibleMany(
    mapping.map(({ locator }) => ({
      image: { src: source },
      payload: locator,
      key,
      strength,
      saveFormat: ImageFormat.png,
      maxSize: 2048,
    })),
    {
      concurrency: 3,
      onProgress: ({ settled, total }) =>
        setStatus(
          context,
          context.zh
            ? `正在生成 ${settled}/${total}…`
            : `Creating ${settled}/${total}…`,
          'busy'
        ),
    }
  );
  const entries: Record<string, Uint8Array> = {};
  for (const [index, result] of results.entries()) {
    if (result.status !== 'fulfilled') throw result.reason;
    entries[
      `images/${String(index + 1).padStart(3, '0')}-${safeName(
        mapping[index]!.recipient
      )}.png`
    ] = new Uint8Array(await dataUrlToBlob(result.value.uri).arrayBuffer());
    if (index === 0) {
      context.currentResult = dataUrlToBlob(result.value.uri);
      context.preview.src = result.value.uri;
    }
  }
  const record = {
    algorithm: 'dct-qim-v1',
    strength,
    createdAt: new Date().toISOString(),
    mapping,
    keyIncluded: false,
  };
  entries['recipient-mapping.json'] = new TextEncoder().encode(
    JSON.stringify(record, null, 2)
  );
  const { zipSync } = await import('fflate');
  downloadBlob(
    new Blob([zipSync(entries, { level: 6 })], { type: 'application/zip' }),
    'image-marker-recipient-traces.zip'
  );
  context.currentJson = record;
  showJson(context, record);
  setStatus(
    context,
    context.zh
      ? `已生成并下载 ${mapping.length} 份追踪图片`
      : `${mapping.length} traced images downloaded`,
    'success'
  );
}

async function runTraceLab(context: ToolContext): Promise<void> {
  setStatus(
    context,
    context.zh ? '正在嵌入实验 locator…' : 'Embedding lab locator…',
    'busy'
  );
  const key = requiredValue(context, 'key');
  const strength = requiredValue(
    context,
    'strength'
  ) as InvisibleWatermarkStrength;
  const embedded = await Marker.embedInvisible({
    image: { src: await currentSource(context) },
    payload: requiredValue(context, 'payload'),
    key,
    strength,
    saveFormat: ImageFormat.png,
    maxSize: 960,
  });
  context.preview.src = embedded.uri;
  context.currentResult = dataUrlToBlob(embedded.uri);
  const variants = await createLabVariants(embedded.uri);
  setStatus(
    context,
    context.zh ? '正在检测变换结果…' : 'Detecting transformed images…',
    'busy'
  );
  const detections = await Marker.detectInvisibleMany(
    variants.map((variant) => ({
      image: { src: variant.src },
      key,
      strength,
      search: 'robust' as const,
      maxSize: 960,
    })),
    {
      concurrency: 2,
      onProgress: ({ settled, total }) =>
        setStatus(
          context,
          context.zh
            ? `检测 ${settled}/${total}…`
            : `Detecting ${settled}/${total}…`,
          'busy'
        ),
    }
  );
  const rows = variants.map((variant, index) => {
    const result = detections[index];
    return {
      transform: context.zh ? variant.zh : variant.en,
      ...(result?.status === 'fulfilled'
        ? result.value
        : {
            detected: false,
            confidence: 0,
            algorithm: 'dct-qim-v1',
            error:
              result?.status === 'rejected'
                ? humanError(result.reason)
                : 'aborted',
          }),
    };
  });
  showLabRows(context, rows);
  context.currentJson = { strength, results: rows };
  showJson(context, context.currentJson);
  const successes = rows.filter((row) => row.detected).length;
  setStatus(
    context,
    context.zh
      ? `${successes}/${rows.length} 个变换成功恢复`
      : `${successes}/${rows.length} transforms recovered`,
    successes === rows.length ? 'success' : 'idle'
  );
}

async function inspectContentCredentials(context: ToolContext): Promise<void> {
  const file = context.sourceInput.files?.[0];
  if (!file)
    throw new Error(
      context.zh ? '请先选择需要检查的图片。' : 'Choose an image to inspect.'
    );
  setStatus(
    context,
    context.zh
      ? '正在按需加载 C2PA 检查器…'
      : 'Loading the C2PA inspector on demand…',
    'busy'
  );
  const [{ createC2pa }, { default: wasmSrc }] = await Promise.all([
    import('@contentauth/c2pa-web'),
    import('@contentauth/c2pa-web/resources/c2pa.wasm?url'),
  ]);
  const c2pa = await createC2pa({ wasmSrc });
  let reader: Awaited<ReturnType<typeof c2pa.reader.fromBlob>> | undefined;
  try {
    reader = await c2pa.reader.fromBlob(file.type, file);
    if (!reader) {
      context.currentJson = { manifestStore: null };
      showJson(context, context.currentJson);
      setStatus(
        context,
        context.zh
          ? '文件中没有可读取的 C2PA manifest'
          : 'No readable C2PA manifest found',
        'idle'
      );
      return;
    }
    const manifestStore = await reader.manifestStore();
    context.currentJson = manifestStore ?? { manifestStore: null };
    showJson(context, context.currentJson);
    setStatus(
      context,
      manifestStore
        ? context.zh
          ? '已读取 Content Credentials manifest'
          : 'Content Credentials manifest read'
        : context.zh
        ? '文件中没有可读取的 C2PA manifest'
        : 'No readable C2PA manifest found',
      manifestStore ? 'success' : 'idle'
    );
  } finally {
    await reader?.free();
    c2pa.dispose();
  }
}

function showDetection(
  context: ToolContext,
  result: InvisibleWatermarkDetectionResult
): void {
  const entries = [
    [
      context.zh ? '检测结果' : 'Detected',
      result.detected
        ? context.zh
          ? '有效'
          : 'Yes'
        : context.zh
        ? '未检测到'
        : 'No',
    ],
    ['Payload', result.payload ?? '—'],
    [
      context.zh ? '置信度' : 'Confidence',
      `${(result.confidence * 100).toFixed(1)}%`,
    ],
    [
      context.zh ? '误码率' : 'Bit error rate',
      result.bitErrorRate === undefined
        ? '—'
        : `${(result.bitErrorRate * 100).toFixed(2)}%`,
    ],
    [
      context.zh ? '估计缩放' : 'Estimated scale',
      result.scale?.toFixed(3) ?? '1.000',
    ],
    [context.zh ? '算法' : 'Algorithm', result.algorithm],
  ];
  context.result.innerHTML = entries
    .map(
      ([label, value]) =>
        `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(
          value
        )}</strong></div>`
    )
    .join('');
  context.result.hidden = false;
}

function showLabRows(
  context: ToolContext,
  rows: Array<Record<string, unknown>>
): void {
  const table = field<HTMLTableElement>(context, 'result-table');
  const body = field<HTMLTableSectionElement>(context, 'result-rows');
  if (!table || !body) return;
  body.innerHTML = rows
    .map((row) => {
      const detected = Boolean(row.detected);
      const confidence =
        typeof row.confidence === 'number'
          ? `${(row.confidence * 100).toFixed(1)}%`
          : '—';
      const ber =
        typeof row.bitErrorRate === 'number'
          ? `${(row.bitErrorRate * 100).toFixed(2)}%`
          : '—';
      return `<tr><td>${escapeHtml(String(row.transform))}</td><td>${
        detected ? '✓' : '—'
      }</td><td>${confidence}</td><td>${ber}</td></tr>`;
    })
    .join('');
  table.hidden = false;
}

async function createLabVariants(
  source: string
): Promise<Array<{ en: string; zh: string; src: string }>> {
  return [
    { en: 'Original PNG', zh: '原始 PNG', src: source },
    {
      en: 'JPEG quality 90',
      zh: 'JPEG 质量 90',
      src: await transformImage(source, { type: 'jpeg', quality: 0.9 }),
    },
    {
      en: 'JPEG quality 75',
      zh: 'JPEG 质量 75',
      src: await transformImage(source, { type: 'jpeg', quality: 0.75 }),
    },
    {
      en: 'JPEG quality 60',
      zh: 'JPEG 质量 60',
      src: await transformImage(source, { type: 'jpeg', quality: 0.6 }),
    },
    {
      en: 'Resize to 95%',
      zh: '缩放至 95%',
      src: await transformImage(source, { type: 'scale', scale: 0.95 }),
    },
    {
      en: '2% edge crop',
      zh: '边缘裁剪 2%',
      src: await transformImage(source, { type: 'crop', crop: 0.02 }),
    },
  ];
}

type Transform =
  | { type: 'jpeg'; quality: number }
  | { type: 'scale'; scale: number }
  | { type: 'crop'; crop: number };
async function transformImage(
  source: string,
  transform: Transform
): Promise<string> {
  const image = await loadImage(source);
  const crop = transform.type === 'crop' ? transform.crop : 0;
  const sx = Math.round(image.naturalWidth * crop);
  const sy = Math.round(image.naturalHeight * crop);
  const sourceWidth = image.naturalWidth - sx * 2;
  const sourceHeight = image.naturalHeight - sy * 2;
  const scale = transform.type === 'scale' ? transform.scale : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const rendering = canvas.getContext('2d');
  if (!rendering) throw new Error('Canvas 2D is unavailable.');
  rendering.drawImage(
    image,
    sx,
    sy,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return transform.type === 'jpeg'
    ? canvas.toDataURL('image/jpeg', transform.quality)
    : canvas.toDataURL('image/png');
}

function parseRecipe(context: ToolContext): WatermarkRecipeDefinition {
  const raw = requiredValue(context, 'recipe');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(
      context.zh ? 'Recipe 不是有效的 JSON。' : 'Recipe is not valid JSON.'
    );
  }
  return migrateWatermarkRecipe(value as WatermarkRecipeDocument);
}

function parseRecipients(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/\r?\n/)
        .map((line) => line.split(',')[0]?.trim() ?? '')
        .filter(Boolean)
    ),
  ];
}

function validateBatchSelection(context: ToolContext, files: File[]): void {
  if (files.length > MAX_BATCH_FILES) {
    throw new Error(
      context.zh
        ? `浏览器工具一次最多处理 ${MAX_BATCH_FILES} 张图片。`
        : `The browser tool handles up to ${MAX_BATCH_FILES} images per run.`
    );
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_BATCH_BYTES) {
    throw new Error(
      context.zh
        ? '所选图片总大小不能超过 80 MB。'
        : 'Selected images must total no more than 80 MB.'
    );
  }
}

function randomLocator(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `R-${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')}`;
}

async function currentSource(context: ToolContext): Promise<string> {
  const file = context.sourceInput.files?.[0];
  if (!file) return new URL(DEFAULT_BACKGROUND, window.location.origin).href;
  await validateImageFile(file, context.zh);
  return fileToDataUrl(file);
}

async function validateImageFile(file: File, zh = false): Promise<void> {
  if (!SUPPORTED_TYPES.has(file.type))
    throw new Error(
      zh
        ? '请选择 PNG、JPEG 或 WebP 图片。'
        : 'Choose a PNG, JPEG, or WebP image.'
    );
  if (file.size > MAX_FILE_BYTES)
    throw new Error(
      zh ? '单张图片不能超过 12 MB。' : 'Image files must be 12 MB or smaller.'
    );
  const src = await fileToDataUrl(file);
  const image = await loadImage(src);
  if (image.naturalWidth * image.naturalHeight > MAX_PIXELS)
    throw new Error(
      zh
        ? '图片不能超过 1600 万像素。'
        : 'Images must contain no more than 16 megapixels.'
    );
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error('Unable to read the image.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to decode the image.'));
    image.src = src;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(',', 2);
  if (!header || !encoded) throw new Error('The generated image is invalid.');
  const mime = header.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type });
}

function showBlob(context: ToolContext, blob: Blob): void {
  if (context.objectUrl) URL.revokeObjectURL(context.objectUrl);
  context.objectUrl = URL.createObjectURL(blob);
  context.preview.src = context.objectUrl;
  context.currentResult = blob;
}

function downloadCurrentResult(context: ToolContext): void {
  if (!context.currentResult) return;
  const extension = context.currentResult.type === 'image/jpeg' ? 'jpg' : 'png';
  downloadBlob(context.currentResult, `image-marker-result.${extension}`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function downloadJson(value: unknown, filename: string): void {
  if (value === undefined) return;
  downloadBlob(
    new Blob([stringifyJson(value)], { type: 'application/json' }),
    filename
  );
}

function showJson(context: ToolContext, value: unknown): void {
  context.json.textContent = stringifyJson(value);
  context.json.hidden = false;
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === 'bigint' ? item.toString() : item),
    2
  );
}

function setStatus(
  context: ToolContext,
  message: string,
  state: StatusState
): void {
  context.status.textContent = message;
  context.status.dataset.state = state;
}

function bindRangeOutputs(context: ToolContext): void {
  const mappings = [
    ['opacity', 'opacity-output', (value: number) => `${value}%`],
    ['font-size', 'size-output', (value: number) => `${value} px`],
    ['rotation', 'rotation-output', (value: number) => `${value}°`],
    ['stroke', 'stroke-output', (value: number) => `${value} px`],
  ] as const;
  for (const [inputName, outputName, format] of mappings) {
    const input = field<HTMLInputElement>(context, inputName);
    const output = field<HTMLOutputElement>(context, outputName);
    if (input && output) output.value = format(Number(input.value));
  }
}

function updatePositionAvailability(context: ToolContext): void {
  const positionField = field<HTMLElement>(context, 'position-field');
  if (positionField)
    positionField.hidden =
      field<HTMLSelectElement>(context, 'layout')?.value === 'tile';
}

function enable(context: ToolContext, name: string): void {
  const element = field<HTMLButtonElement>(context, name);
  if (element) element.disabled = false;
}

function field<Element extends HTMLElement>(
  context: ToolContext,
  name: string
): Element | null {
  return context.root.querySelector<Element>(`[data-${name}]`);
}

function requiredValue(context: ToolContext, name: string): string {
  const control = field<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >(context, name);
  const value = control?.value.trim() ?? '';
  if (!value)
    throw new Error(
      context.zh ? '请填写全部必填项。' : 'Complete all required fields.'
    );
  return value;
}

function numberValue(
  context: ToolContext,
  name: string,
  fallback: number
): number {
  const value = Number(
    field<HTMLInputElement>(context, name)?.value ?? fallback
  );
  return Number.isFinite(value) ? value : fallback;
}

function query<Element extends HTMLElement>(
  root: ParentNode,
  selector: string
): Element {
  const element = root.querySelector<Element>(selector);
  if (!element) throw new Error(`Missing tool element: ${selector}`);
  return element;
}

function queryAll<Element extends HTMLElement>(
  root: ParentNode,
  selector: string
): Element[] {
  return Array.from(root.querySelectorAll<Element>(selector));
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

function safeName(value: string): string {
  return (
    value
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'image'
  );
}

function exportFilename(context: ToolContext): string {
  return context.tool === 'trace-checker'
    ? 'image-marker-trace-result.json'
    : 'image-marker-trace-record.json';
}

function escapeHtml(value: string): string {
  const element = document.createElement('span');
  element.textContent = value;
  return element.innerHTML;
}

function humanError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
