/**
 * imageWorker.js — Web Worker para processamento e compressão de imagens em background
 * Executa autocorreção de orientação EXIF, redimensionamento, aplicação de marca d'água (Single-Pass),
 * conversão para JPEG e detecção de nitidez/brilho em thread secundária isolada.
 */

self.onmessage = async function (e) {
  const { id, type, file, quality = 0.75, maxWidth = 2560, watermark } = e.data;

  try {
    if (type === 'compress') {
      const blob = await compressImage(file, quality, maxWidth, watermark);
      self.postMessage({ id, success: true, blob });
    } else if (type === 'detectBlur') {
      const blurResult = await analyzeBlur(file);
      self.postMessage({ id, success: true, blurResult });
    } else if (type === 'processAll') {
      // Single-pass: decodifica o bitmap uma única vez, gera thumbnail, aplica marca d'água e converte
      const { blob, blurResult } = await processAll(file, quality, maxWidth, watermark);
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

function drawWatermarkOnCanvas(ctx, w, h, watermark) {
  if (!watermark) return;
  const { texto, bloco, apartamento } = watermark;
  const fontSize = Math.max(16, Math.round(h * 0.025));
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textBaseline = 'bottom';

  const lines = [];
  if (bloco && apartamento) {
    lines.push(`${bloco} - Apto ${apartamento}`);
  }
  if (texto) {
    lines.push(texto);
  }
  if (lines.length === 0) return;

  const padding = Math.round(w * 0.015);
  const lineHeight = fontSize + 6;
  const blockH = lines.length * lineHeight + padding * 2;
  const blockW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2;

  const x = w - blockW - padding;
  const y = h - blockH - padding;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, blockW, blockH, 6);
  } else {
    ctx.rect(x, y, blockW, blockH);
  }
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  lines.forEach((line, i) => {
    ctx.fillText(line, x + padding, y + padding + lineHeight * (i + 1) - 4);
  });
}

function calculateBlurFromContext(ctx, thumbW, thumbH) {
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

async function processAll(file, quality, maxWidth, watermark) {
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
    bitmap.close();
    throw new Error('OffscreenCanvas não suportado neste Web Worker');
  }

  // 1. Canvas principal redimensionado
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Não foi possível obter contexto 2D do OffscreenCanvas');
  }
  ctx.drawImage(bitmap, 0, 0, w, h);

  // 2. Canvas thumbnail para nitidez
  const thumbW = 200;
  const thumbH = Math.max(1, Math.round((srcH / srcW) * thumbW));
  const thumbCanvas = new OffscreenCanvas(thumbW, thumbH);
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    thumbCtx.drawImage(bitmap, 0, 0, thumbW, thumbH);
  }

  // 3. Libera o ImageBitmap decodificado IMEDIATAMENTE da memória RAM nativa!
  bitmap.close();

  // 4. Aplica marca d'água no canvas principal (Single-Pass!)
  if (watermark) {
    drawWatermarkOnCanvas(ctx, w, h, watermark);
  }

  // 5. Analisa nitidez/brilho no thumbnail
  let blurResult = {
    isBlurry: false,
    isDark: false,
    brightness: 100,
    sharpness: 10,
  };
  if (thumbCtx) {
    blurResult = calculateBlurFromContext(thumbCtx, thumbW, thumbH);
  }

  // 6. Converte para JPEG
  const blob = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality: quality,
  });

  return { blob, blurResult };
}

async function compressImage(file, quality, maxWidth, watermark) {
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
    bitmap.close();
    throw new Error('OffscreenCanvas não suportado neste Web Worker');
  }

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Não foi possível obter contexto 2D do OffscreenCanvas');
  }

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  if (watermark) {
    drawWatermarkOnCanvas(ctx, w, h, watermark);
  }

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

  return calculateBlurFromContext(ctx, thumbW, thumbH);
}
