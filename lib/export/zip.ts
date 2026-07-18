import type { ApartamentoStatus } from '../db';
import { fotosDoApartamento } from '../db';
import { normApto, shareFile } from './utils';

export async function exportarZIP(
  status: ApartamentoStatus[],
  titulo: string,
  opts?: { onProgress?: (msg: string) => void }
) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  let fotosOnline: { bloco: string; apartamento: string; foto_url: string; foto_index: number; data_leitura: string }[] = [];
  try {
    const resp = await fetch('/api/fotos');
    const data = await resp.json();
    fotosOnline = data.fotos || [];
  } catch { /* offline */ }

  const aptosComFoto = status.filter((s) => s.qtdFotos > 0 || fotosOnline.some((f) => f.bloco === s.bloco && normApto(f.apartamento) === s.apartamento));
  const total = aptosComFoto.length;
  let done = 0;

  for (const s of aptosComFoto) {
    done++;
    opts?.onProgress?.(`${done}/${total} \u2014 ${s.bloco} ${s.apartamento}`);

    const folderName = `${s.bloco}/${s.apartamento}`;

    const onlineFotos = fotosOnline.filter(
      (f) => f.bloco === s.bloco && normApto(f.apartamento) === s.apartamento
    );
    for (const f of onlineFotos) {
      try {
        const resp = await fetch(f.foto_url);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        const ext = f.foto_url.includes('.png') ? 'png' : 'jpg';
        const catLabel = f.foto_index === 0 ? 'cyble_antes' : f.foto_index === 1 ? 'cyble_depois' : 'documento';
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
