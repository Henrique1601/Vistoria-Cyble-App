/**
 * imageWorker.js — Web Worker para processamento e compressão de imagens em background
 * Executa autocorreção de orientação EXIF, redimensionamento, conversão para JPEG e detecção de nitidez/brilho.
 */

self.onmessage = async function (e) {
  const { id, type, file, quality = 0.75, maxWidth = 2560 } = e.data;

  try {
    if (type === 'compress') {
      const blob = await compressImage(file, quality, maxWidth);
      self.postMessage({ id, success: true, blob });
    } else if (type === 'detectBlur') {
      const blurResult = await analyzeBlur(file);
      self.postMessage({ id, success: true, blurResult });
    } else if (type === 'processAll') {
      // Executa compressão e análise de blur em paralelo no worker
      const [blob, blurResult] = await Promise.all([
        compressImage(file, quality, maxWidth),
        analyzeBlur(file),
      ]);
      self.postMessage({ id, success: true, blob, blurResult });
    } else {
      throw new Error(`Tipo de ação desconhecido: ${type}`);
    }
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

async function compressImage(file, quality, maxWidth) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(file);
  }

  const srcW = bitmap.width;
  const srcH = bitmap.height;

  let w = srcW;
  let h = srcH;
  if (quality < 1.0) {
    const scale = Math.min(1, maxWidth / Math.max(srcW, srcH));
    w = Math.round(srcW * scale);
    h = Math.round(srcH * scale);
  }

  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('OffscreenCanvas não suportado neste Web Worker');
  }

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível obter contexto 2D do OffscreenCanvas');

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return await canvas.convertToBlob({
    type: 'image/jpeg',
    quality: quality,
  });
}

async function analyzeBlur(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(file);
  }

  const thumbW = 200;
  const thumbH = Math.max(1, Math.round((bitmap.height / bitmap.width) * thumbW));

  if (typeof OffscreenCanvas === 'undefined') {
    bitmap.close();
    throw new Error('OffscreenCanvas não suportado no worker');
  }

  const canvas = new OffscreenCanvas(thumbW, thumbH);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas 2D context null');
  }

  ctx.drawImage(bitmap, 0, 0, thumbW, thumbH);
  bitmap.close();

  const imgData = ctx.getImageData(0, 0, thumbW, thumbH);
  const data = imgData.data;
  const pixelCount = thumbW * thumbH;

  let totalBrightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const brightness = totalBrightness / pixelCount;

  const gray = new Float32Array(pixelCount);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  let laplacianSum = 0;
  for (let y = 1; y < thumbH - 1; y++) {
    for (let x = 1; x < thumbW - 1; x++) {
      const idx = y * thumbW + x;
      const center = gray[idx] * -4;
      const top = gray[idx - thumbW];
      const bottom = gray[idx + thumbW];
      const left = gray[idx - 1];
      const right = gray[idx + 1];
      laplacianSum += Math.abs(center + top + bottom + left + right);
    }
  }
  const sharpness = laplacianSum / pixelCount;

  const isDark = brightness < 40;
  const isBlurry = sharpness < 5;

  let message;
  if (isDark && isBlurry) message = 'Foto escura e borrada';
  else if (isDark) message = 'Foto muito escura';
  else if (isBlurry) message = 'Foto borrada (foco)';

  return {
    isBlurry,
    isDark,
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness * 10) / 10,
    message,
  };
}
