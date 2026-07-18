import type { ApartamentoStatus } from '../db';
import { normApto as _normApto } from '../utils';

export { _normApto as normApto };

export const CATEGORIA_LABELS: Record<string, string> = {
  cyble_antes: 'cyble_antes',
  cyble_depois: 'cyble_depois',
  documento: 'documento',
};

export function statusApto(s: ApartamentoStatus): string {
  if (s.cybleAntesFeito && s.cybleDepoisFeito) return 'Concluido';
  if (s.cybleAntesFeito || s.cybleDepoisFeito || s.qtdDocumentos > 0) return 'Em andamento';
  return 'Pendente';
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export async function shareFile(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: blob.type });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] });
      return true;
    } catch {
      return false;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
