import type { ApartamentoStatus } from '../db';
import { fotosDoApartamento } from '../db';
import { normApto, shareFile } from './utils';
import { normalizeBloco, hoje, formatarDataParaInput } from '../utils';
import { authFetch } from '../api';

export async function exportarZIP(
  status: ApartamentoStatus[],
  titulo: string,
  opts?: { onProgress?: (msg: string) => void }
) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  let fotosOnline: { bloco: string; apartamento: string; foto_url: string; foto_index: number; data_leitura: string }[] = [];
  try {
    const resp = await authFetch('/api/fotos');
    const data = await resp.json();
    fotosOnline = data.fotos || [];
  } catch { /* offline */ }

  const aptosComFoto = status.filter((s) => s.qtdFotos > 0 || fotosOnline.some((f) => normalizeBloco(f.bloco) === normalizeBloco(s.bloco) && normApto(f.apartamento) === s.apartamento));
  const total = aptosComFoto.length;
  let done = 0;

  for (const s of aptosComFoto) {
    done++;
    opts?.onProgress?.(`${done}/${total} \u2014 ${s.bloco} ${s.apartamento}`);

    const folderName = `${s.bloco}/${s.apartamento}`;

    const onlineFotos = fotosOnline.filter(
      (f) => normalizeBloco(f.bloco) === normalizeBloco(s.bloco) && normApto(f.apartamento) === s.apartamento
    );
    for (const f of onlineFotos) {
      if (!f.foto_url || !f.foto_url.startsWith('http')) continue;
      try {
        const resp = await fetch(f.foto_url);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        const ext = f.foto_url.includes('.png') ? 'png' : 'jpg';
        const catLabel = f.foto_url.includes('antes')
          ? 'cyble_antes'
          : f.foto_url.includes('depois')
          ? 'cyble_depois'
          : f.foto_url.includes('doc')
          ? 'documento'
          : f.foto_index === 0
          ? 'cyble_antes'
          : f.foto_index === 1
          ? 'cyble_depois'
          : 'documento';
        zip.file(`${folderName}/${catLabel}_${f.foto_index + 1}.${ext}`, blob);
      } catch { /* skip */ }
    }

    try {
      const fotosLocais = await fotosDoApartamento(s.bloco, s.apartamento);
      for (const f of fotosLocais) {
        if (f.synced && f.uploadUrl) {
          const jaOnline = onlineFotos.some(
            (of) => normApto(of.apartamento) === normApto(f.apartamento) &&
              ((of.foto_index === 0 && f.categoria === 'cyble_antes') ||
               (of.foto_index === 1 && f.categoria === 'cyble_depois') ||
               (of.foto_index >= 2 && f.categoria === 'documento'))
          );
          if (jaOnline) continue;
          try {
            const resp = await fetch(f.uploadUrl);
            if (!resp.ok) continue;
            const blob = await resp.blob();
            const catLabel = f.categoria === 'cyble_antes' ? 'cyble_antes' : f.categoria === 'cyble_depois' ? 'cyble_depois' : 'documento';
            zip.file(`${folderName}/${catLabel}_local_${f.timestamp}.jpg`, blob);
          } catch { /* skip */ }
        } else if (f.blob && f.blob.size > 0) {
          const catLabel = f.categoria === 'cyble_antes' ? 'cyble_antes' : f.categoria === 'cyble_depois' ? 'cyble_depois' : 'documento';
          zip.file(`${folderName}/${catLabel}_local_${f.timestamp}.jpg`, f.blob);
        }
      }
    } catch { /* skip */ }
  }

  if (Object.keys(zip.files).length === 0) {
    opts?.onProgress?.('Nenhuma foto encontrada');
    return;
  }

  const content = await zip.generateAsync({ type: 'blob' }, (meta) => {
    opts?.onProgress?.(`Compactando ${Math.round(meta.percent)}%`);
  });

  const filename = `vistoria-fotos-${new Date().toISOString().slice(0, 10)}.zip`;
  await shareFile(content, filename, `Fotos Vistoria Cyble - ${titulo}`);
}


/**
 * Exporta em um único arquivo ZIP todas as fotos capturadas na data informada (padrão: hoje),
 * organizando por pastas de Torre e Apartamento (ex: Torre A/101/cyble_antes_xxx.jpg).
 * Ideal para encerramento rápido do expediente sem necessidade de filtrar torre por torre.
 */
export async function exportarFotosDoDiaZIP(
  dataFiltro?: string,
  opts?: { onProgress?: (msg: string) => void }
): Promise<{ count: number; filename: string }> {
  const targetData = dataFiltro || hoje();
  opts?.onProgress?.(`Buscando fotos do dia (${targetData})...`);

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // 1. Fotos online sincronizadas na data informada
  let fotosOnline: { bloco: string; apartamento: string; foto_url: string; foto_index: number; data_leitura: string }[] = [];
  try {
    const resp = await authFetch('/api/fotos');
    if (resp.ok) {
      const data = await resp.json();
      fotosOnline = (data.fotos || []).filter((f: any) => {
        const d = (f.data_leitura || '').slice(0, 10);
        return d === targetData;
      });
    }
  } catch {
    /* offline: prossegue com fotos locais */
  }

  // 2. Fotos locais do IndexedDB capturadas na data informada
  const { obterTodasFotos } = await import('../db');
  let todasFotosLocais: any[] = [];
  try {
    todasFotosLocais = await obterTodasFotos();
  } catch (err) {
    console.warn('Erro ao obter fotos locais para o zip do dia:', err);
  }

  const fotosLocaisDia = todasFotosLocais.filter((f) => {
    if (!f.timestamp) return false;
    const d = formatarDataParaInput(new Date(f.timestamp));
    return d === targetData;
  });

  const addedKeys = new Set<string>();
  let totalAdicionadas = 0;

  // 3. Adiciona fotos locais (instantâneo e sem consumo de rede)
  for (const f of fotosLocaisDia) {
    const blocoNorm = normalizeBloco(f.bloco || 'Torre');
    const aptoNorm = normApto(f.apartamento || '0');
    const catLabel = f.categoria === 'cyble_antes'
      ? 'cyble_antes'
      : f.categoria === 'cyble_depois'
      ? 'cyble_depois'
      : 'documento';
    const folderName = `${blocoNorm}/${aptoNorm}`;
    const dedupeKey = `${blocoNorm}_${aptoNorm}_${catLabel}`;

    if (f.blob && f.blob.size > 0) {
      zip.file(`${folderName}/${catLabel}_${f.timestamp || Date.now()}.jpg`, f.blob);
      addedKeys.add(dedupeKey);
      totalAdicionadas++;
    } else if (f.synced && f.uploadUrl) {
      try {
        const resp = await fetch(f.uploadUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          zip.file(`${folderName}/${catLabel}_${f.timestamp || Date.now()}.jpg`, blob);
          addedKeys.add(dedupeKey);
          totalAdicionadas++;
        }
      } catch {
        /* skip network error */
      }
    }
  }

  // 4. Adiciona fotos online da data que não estavam locais
  for (const of of fotosOnline) {
    const blocoNorm = normalizeBloco(of.bloco || 'Torre');
    const aptoNorm = normApto(of.apartamento || '0');
    const catLabel = of.foto_url.includes('antes')
      ? 'cyble_antes'
      : of.foto_url.includes('depois')
      ? 'cyble_depois'
      : of.foto_url.includes('doc')
      ? 'documento'
      : of.foto_index === 0
      ? 'cyble_antes'
      : of.foto_index === 1
      ? 'cyble_depois'
      : 'documento';
    const dedupeKey = `${blocoNorm}_${aptoNorm}_${catLabel}`;

    if (addedKeys.has(dedupeKey)) {
      continue;
    }
    if (!of.foto_url || !of.foto_url.startsWith('http')) continue;

    try {
      const resp = await fetch(of.foto_url);
      if (!resp.ok) continue;
      const blob = await resp.blob();
      const ext = of.foto_url.includes('.png') ? 'png' : 'jpg';
      const folderName = `${blocoNorm}/${aptoNorm}`;
      zip.file(`${folderName}/${catLabel}_${of.foto_index + 1}.${ext}`, blob);
      addedKeys.add(dedupeKey);
      totalAdicionadas++;
    } catch {
      /* skip */
    }
  }

  if (totalAdicionadas === 0) {
    opts?.onProgress?.('Nenhuma foto encontrada nesta data');
    return { count: 0, filename: '' };
  }

  opts?.onProgress?.(`Compactando ${totalAdicionadas} fotos...`);
  const content = await zip.generateAsync({ type: 'blob' }, (meta) => {
    opts?.onProgress?.(`Compactando ${Math.round(meta.percent)}%`);
  });

  const filename = `vistoria-fotos-dia-${targetData}.zip`;
  await shareFile(content, filename, `Fotos do Dia (${targetData}) - Vistoria Cyble`);
  return { count: totalAdicionadas, filename };
}
