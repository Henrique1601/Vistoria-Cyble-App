import { BlurResult, detectBlur as detectBlurFallback } from './blurDetect';
import { getQualidadeFoto } from './settings';

const QUALIDADE_MAP: Record<string, number> = { '50': 0.50, '75': 0.75, '90': 0.90, '100': 1.0 };
const MAX_IMAGE_WIDTH_DEFAULT = 2560;
const WORKER_TIMEOUT_MS = 15000;

let workerInstance: Worker | null = null;
let reqIdCounter = 0;
const pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker('/workers/imageWorker.js');
      workerInstance.onmessage = (e) => {
        const { id, success, blob, blurResult, error } = e.data;
        const req = pendingRequests.get(id);
        if (req) {
          clearTimeout(req.timer);
          pendingRequests.delete(id);
          if (success) {
            req.resolve({ blob, blurResult });
          } else {
            req.reject(new Error(error || 'Worker execution failed'));
          }
        }
      };
      workerInstance.onerror = () => {
        // Se houver erro global no worker, rejeita os pendentes e limpa a instância para recriar
        pendingRequests.forEach((req) => {
          clearTimeout(req.timer);
          req.reject(new Error('Worker encountered an error'));
        });
        pendingRequests.clear();
        workerInstance?.terminate();
        workerInstance = null;
      };
    } catch {
      workerInstance = null;
    }
  }
  return workerInstance;
}

function callWorker<T>(type: 'compress' | 'detectBlur' | 'processAll', file: File, qualityNum: number, maxWidth = MAX_IMAGE_WIDTH_DEFAULT): Promise<T> {
  const worker = getWorker();
  if (!worker) {
    return Promise.reject(new Error('Web Worker não disponível'));
  }

  const id = ++reqIdCounter;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error('Worker timeout'));
    }, WORKER_TIMEOUT_MS);

    pendingRequests.set(id, { resolve, reject, timer });
    worker.postMessage({ id, type, file, quality: qualityNum, maxWidth });
  });
}

/**
 * Comprime a imagem utilizando Web Worker em background com autocorreção EXIF.
 * Se o Worker falhar ou não estiver disponível, faz fallback automático para canvas local.
 */
export async function comprimirImagemComWorker(file: File, fallbackFn: (file: File) => Promise<Blob>): Promise<Blob> {
  const qualidadeStr = getQualidadeFoto();
  const qualityNum = QUALIDADE_MAP[qualidadeStr] ?? 0.75;

  try {
    const result = await callWorker<{ blob: Blob }>('compress', file, qualityNum);
    if (result.blob && result.blob.size > 0) {
      return result.blob;
    }
    throw new Error('Blob retornado pelo worker está vazio');
  } catch (err) {
    // Fallback gracioso para a thread principal
    console.warn('Worker compress fallback:', err);
    return fallbackFn(file);
  }
}

/**
 * Executa a análise de blur utilizando Web Worker em background.
 * Se o Worker falhar ou não estiver disponível, faz fallback automático.
 */
export async function detectBlurComWorker(file: File): Promise<BlurResult> {
  try {
    const result = await callWorker<{ blurResult: BlurResult }>('detectBlur', file, 0.75);
    if (result.blurResult) {
      return result.blurResult;
    }
    throw new Error('BlurResult nulo');
  } catch (err) {
    console.warn('Worker detectBlur fallback:', err);
    return detectBlurFallback(file);
  }
}

/**
 * Executa simultaneamente compressão e detecção de blur em uma única passada no Web Worker.
 */
export async function processarFotoCompleta(file: File, fallbackCompress: (file: File) => Promise<Blob>): Promise<{ blob: Blob; blur: BlurResult }> {
  const qualidadeStr = getQualidadeFoto();
  const qualityNum = QUALIDADE_MAP[qualidadeStr] ?? 0.75;

  try {
    const result = await callWorker<{ blob: Blob; blurResult: BlurResult }>('processAll', file, qualityNum);
    if (result.blob && result.blurResult) {
      return { blob: result.blob, blur: result.blurResult };
    }
    throw new Error('Resultado incompleto do worker');
  } catch (err) {
    console.warn('Worker processAll fallback:', err);
    const [blob, blur] = await Promise.all([
      fallbackCompress(file),
      detectBlurFallback(file),
    ]);
    return { blob, blur };
  }
}

/**
 * Redimensiona a foto para uma grade 16x16 em tons de cinza para amostragem rápida.
 */
async function obterAmostraGrayscale(blob: Blob, width = 16, height = 16): Promise<Uint8Array | null> {
  try {
    let imgSource: CanvasImageSource | null = null;
    let cleanupUrl: string | null = null;

    if (typeof createImageBitmap !== 'undefined') {
      try {
        imgSource = await createImageBitmap(blob);
      } catch {
        imgSource = null;
      }
    }

    if (!imgSource && typeof Image !== 'undefined') {
      imgSource = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        cleanupUrl = url;
        const timer = setTimeout(() => resolve(null), 800);
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = url;
      });
    }

    if (!imgSource) {
      if (cleanupUrl) URL.revokeObjectURL(cleanupUrl);
      return null;
    }

    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : (typeof document !== 'undefined' ? document.createElement('canvas') : null);
    if (!canvas) {
      if (cleanupUrl) URL.revokeObjectURL(cleanupUrl);
      return null;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) {
      if (cleanupUrl) URL.revokeObjectURL(cleanupUrl);
      return null;
    }
    ctx.drawImage(imgSource, 0, 0, width, height);
    if ('close' in imgSource && typeof (imgSource as ImageBitmap).close === 'function') {
      (imgSource as ImageBitmap).close();
    }
    if (cleanupUrl) {
      URL.revokeObjectURL(cleanupUrl);
    }
    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      gray[i] = Math.round(pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114);
    }
    return gray;
  } catch {
    return null;
  }
}

/**
 * Compara dois blobs de imagem e retorna a similaridade percentual (0 a 100%).
 * Usado para detectar se o operador tirou a mesma foto no Antes e no Depois.
 */
export async function compararFotosSimilares(blobA: Blob, blobB: Blob): Promise<number> {
  try {
    const ratio = blobA.size / Math.max(1, blobB.size);
    if (ratio > 2.5 || ratio < 0.4) return 0;

    const [dataA, dataB] = await Promise.all([
      obterAmostraGrayscale(blobA, 16, 16),
      obterAmostraGrayscale(blobB, 16, 16),
    ]);

    if (!dataA || !dataB || dataA.length !== dataB.length) return 0;

    let totalDiff = 0;
    for (let i = 0; i < dataA.length; i++) {
      totalDiff += Math.abs(dataA[i] - dataB[i]);
    }
    const maxPossibleDiff = dataA.length * 255;
    const similarity = Math.max(0, 1 - totalDiff / maxPossibleDiff) * 100;
    return Math.round(similarity * 10) / 10;
  } catch {
    return 0;
  }
}
