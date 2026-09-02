import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getSql, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/sql';
import { requireAdmin } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';
import { validateBloco, validateApartamento, validateCategoria, isValidationError } from '@/lib/validation';

export const runtime = 'nodejs';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// --- Token refresh ---
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const clientId = 'f7c1e25d-b9d2-44be-8832-0760e948c399';
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;

  if (!clientId || !refreshToken) return null;

  try {
    const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'Files.ReadWrite offline_access',
      }),
    });

    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// --- Upload to OneDrive ---
async function uploadToOneDrive(
  accessToken: string,
  filePath: string,
  fileBuffer: ArrayBuffer,
  contentType: string,
): Promise<{ url: string; id: string }> {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const uploadUrl = `${GRAPH_BASE}/me/drive/root:/${encodedPath}:/content`;

  const resp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': contentType,
    },
    body: fileBuffer,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OneDrive upload failed: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  return { url: data.webUrl || '', id: data.id || '' };
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req);
  const rl = checkRateLimit(`upload:${ip}`, RATE_LIMITS.upload);
  if (!rl.allowed) {
    return NextResponse.json({ erro: 'Muitas requisicoes. Aguarde.' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ erro: 'Acesso restrito a administradores' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const blocoRaw = form.get('bloco') as string;
  const apartamentoRaw = form.get('apartamento') as string;
  const categoriaRaw = form.get('categoria') as string;
  const timestamp = form.get('timestamp') as string;
  const accessToken = (form.get('access_token') as string) || '';
  const refreshToken = (form.get('refresh_token') as string) || '';
  const provedorNuvem = (form.get('provedor_nuvem') as string) || 'ambos'; // 'ambos' | 'blob' | 'onedrive' | 'desativado'

  if (!file || !blocoRaw || !apartamentoRaw || !categoriaRaw) {
    return NextResponse.json({ erro: 'campos faltando' }, { status: 400 });
  }

  // Se o upload na nuvem foi desativado pelo usuário, retorna sucesso local
  if (provedorNuvem === 'desativado') {
    return NextResponse.json({ ok: true, skipped: true, url: 'local', provider: 'desativado' });
  }

  // Validate inputs
  const bloco = validateBloco(blocoRaw);
  const apartamento = validateApartamento(apartamentoRaw);
  const categoria = validateCategoria(categoriaRaw);
  if (isValidationError(bloco)) return NextResponse.json({ erro: bloco.message }, { status: 400 });
  if (isValidationError(apartamento)) return NextResponse.json({ erro: apartamento.message }, { status: 400 });
  if (isValidationError(categoria)) return NextResponse.json({ erro: categoria.message }, { status: 400 });

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { erro: `tipo de arquivo nao suportado: ${file.type}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { erro: `arquivo muito grande: ${Math.round(file.size / 1024 / 1024)}MB (max 15MB)` },
      { status: 400 },
    );
  }

  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const blobPath = `vistorias/bloco-${bloco}/apto-${apartamento}/${categoria}-${timestamp}.${ext}`;
  const oneDrivePath = `Vistoria Cyble/bloco-${bloco}/apto-${apartamento}/${categoria}-${timestamp}.${ext}`;

  let blobUrl = '';
  let oneDriveUrl = '';
  let currentToken = accessToken;

  // 1. Upload para Vercel Blob (se 'blob' ou 'ambos')
  if (provedorNuvem === 'blob' || provedorNuvem === 'ambos') {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blobRes = await put(blobPath, file, {
          access: 'public',
          addRandomSuffix: false,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        blobUrl = blobRes.url;
      } catch (err) {
        console.warn('Vercel Blob upload failed:', err);
        if (provedorNuvem === 'blob') {
          return NextResponse.json({ erro: 'Falha no upload para Vercel Blob' }, { status: 500 });
        }
      }
    } else if (provedorNuvem === 'blob') {
      return NextResponse.json({ erro: 'BLOB_READ_WRITE_TOKEN não configurado no servidor' }, { status: 500 });
    }
  }

  // 2. Upload para OneDrive (se 'onedrive' ou 'ambos')
  if (provedorNuvem === 'onedrive' || provedorNuvem === 'ambos') {
    if (accessToken) {
      try {
        const buffer = await file.arrayBuffer();
        const odRes = await uploadToOneDrive(currentToken, oneDrivePath, buffer, file.type || 'image/jpeg');
        oneDriveUrl = odRes.url;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : '';
        if (errMsg.includes('401') && refreshToken) {
          const refreshed = await refreshAccessToken(refreshToken);
          if (refreshed) {
            currentToken = refreshed.access_token;
            try {
              const buffer = await file.arrayBuffer();
              const odRes = await uploadToOneDrive(currentToken, oneDrivePath, buffer, file.type || 'image/jpeg');
              oneDriveUrl = odRes.url;
            } catch {
              if (provedorNuvem === 'onedrive') {
                return NextResponse.json({ erro: 'Falha no upload para OneDrive após renovar token' }, { status: 500 });
              }
            }
          } else if (provedorNuvem === 'onedrive') {
            return NextResponse.json({ erro: 'Token OneDrive expirado. Reconecte em Configurações.' }, { status: 401 });
          }
        } else if (provedorNuvem === 'onedrive') {
          return NextResponse.json({ erro: 'Falha no upload para OneDrive' }, { status: 500 });
        }
      }
    } else if (provedorNuvem === 'onedrive') {
      return NextResponse.json({ erro: 'OneDrive não conectado. Conecte em Configurações.' }, { status: 401 });
    }
  }

  // URL primária salva no Neon (Vercel Blob prioritária por ser pública para visualização direta)
  const primaryUrl = blobUrl || oneDriveUrl;
  if (!primaryUrl) {
    return NextResponse.json({ erro: 'Falha no envio da foto para o(s) provedor(es) de nuvem selecionado(s)' }, { status: 500 });
  }

  // 3. Salvar metadados no Neon
  if (process.env.DATABASE_URL) {
    try {
      const sql = getSql();
      const tsNum = Number(timestamp);
      const dataLeitura = !isNaN(tsNum) && tsNum > 0
        ? new Date(tsNum).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const INDEX_MAP: Record<string, number> = {
        cyble_antes: 0,
        cyble_depois: 1,
        documento: 2,
      };
      const fotoIndex = INDEX_MAP[categoria] ?? 0;

      const existing = await sql`SELECT id FROM fotos 
                                  WHERE foto_url = ${primaryUrl}`;
      if (existing.length === 0) {
        await sql`INSERT INTO fotos (bloco, apartamento, data_leitura, foto_url, foto_index)
                   VALUES (${bloco}, ${apartamento}, ${dataLeitura}, ${primaryUrl}, ${fotoIndex})`;
      }
    } catch (err) {
      console.warn('Failed to save photo metadata to DB:', err);
    }
  }

  // Resposta com URLs disponíveis e token renovado
  const response: Record<string, string> = {
    url: primaryUrl,
    path: blobUrl ? blobPath : oneDrivePath,
    provider: provedorNuvem,
  };
  if (blobUrl) response.blob_url = blobUrl;
  if (oneDriveUrl) response.onedrive_url = oneDriveUrl;
  if (currentToken && currentToken !== accessToken) {
    response.refreshed_token = currentToken;
  }

  return NextResponse.json(response);
}
