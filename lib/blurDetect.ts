export interface BlurResult {
  isBlurry: boolean;
  isDark: boolean;
  brightness: number;
  sharpness: number;
  message?: string;
}

const IMAGE_LOAD_TIMEOUT_MS = 5000;

export async function detectBlur(file: File): Promise<BlurResult> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const w = 200;
  const h = Math.round((img.height / img.width) * w);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  let totalBrightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const pixelCount = data.length / 4;
  const brightness = totalBrightness / pixelCount;

  const gray = new Float32Array(pixelCount);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  let laplacianSum = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const center = gray[idx] * -4;
      const top = gray[idx - w];
      const bottom = gray[idx + w];
      const left = gray[idx - 1];
      const right = gray[idx + 1];
      laplacianSum += Math.abs(center + top + bottom + left + right);
    }
  }
  const sharpness = laplacianSum / pixelCount;

  const isDark = brightness < 40;
  const isBlurry = sharpness < 5;

  let message: string | undefined;
  if (isDark && isBlurry) message = 'Foto escura e borrada';
  else if (isDark) message = 'Foto muito escura';
  else if (isBlurry) message = 'Foto borrada (foco)';

  return { isBlurry, isDark, brightness: Math.round(brightness), sharpness: Math.round(sharpness * 10) / 10, message };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const cleanup = () => { URL.revokeObjectURL(img.src); };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Image load timeout'));
      }
    }, IMAGE_LOAD_TIMEOUT_MS);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(img);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error('Failed to load image'));
      }
    };
    img.src = URL.createObjectURL(file);
  });
}
