import { NextRequest, NextResponse } from 'next/server';
import { getSql, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/sql';
import { requireAdmin } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';
import { validateBloco, validateApartamento, validateCategoria, isValidationError } from '@/lib/validation';

export const runtime = 'nodejs';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// --- Token refresh ---
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const clientId = process.env.ONEDRIVE_CLIENT_ID;
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
    return NextResponse.json({ erro: 'Muitas requisitions. Aguarde.' }, {
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
  const accessToken = form.get('access_token') as string;
  const refreshToken = form.get('refresh_token') as string;

  if (!file || !blocoRaw || !apartamentoRaw || !categoriaRaw) {
    return NextResponse.json({ erro: 'campos faltando' }, { status: 400 });
  }

  if (!accessToken) {
    return NextResponse.json({ erro: 'OneDrive não conectado. Conecte em Configurações.' }, { status: 401 });
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
  const filePath = `Vistoria Cyble/bloco-${bloco}/apto-${apartamento}/${categoria}-${timestamp}.${ext}`;

  // Try upload with current token, refresh if 401
  let currentToken = accessToken;
  let uploadResult: { url: string; id: string };

  try {
    const buffer = await file.arrayBuffer();
    uploadResult = await uploadToOneDrive(currentToken, filePath, buffer, file.type || 'image/jpeg');
  } catch (err: unknown) {
    // If 401, try refreshing the token
    const errMsg = err instanceof Error ? err.message : '';
    if (errMsg.includes('401') && refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken);
      if (refreshed) {
        currentToken = refreshed.access_token;
        const buffer = await file.arrayBuffer();
        uploadResult = await uploadToOneDrive(currentToken, filePath, buffer, file.type || 'image/jpeg');
      } else {
        return NextResponse.json({ erro: 'Token OneDrive expirado. Reconecte em Configurações.' }, { status: 401 });
      }
    } else {
      throw err;
    }
  }

  // Save metadata to Neon
  if (process.env.DATABASE_URL) {
    try {
      const sql = getSql();
      const dataLeitura = new Date(Number(timestamp)).toISOString().split('T')[0];
      const existing = await sql`SELECT id FROM fotos 
                                  WHERE bloco = ${bloco} AND apartamento = ${apartamento} 
                                  AND data_leitura = ${dataLeitura}`;
      if (existing.length === 0) {
        await sql`INSERT INTO fotos (bloco, apartamento, data_leitura, foto_url, foto_index)
                   VALUES (${bloco}, ${apartamento}, ${dataLeitura}, ${uploadResult.url}, 0)`;
      }
    } catch (err) {
      console.warn('Failed to save photo metadata to DB (photo still saved to OneDrive):', err);
    }
  }

  // Return new tokens if refreshed
  const response: Record<string, string> = { url: uploadResult.url, path: filePath };
  if (currentToken !== accessToken) {
    response.refreshed_token = currentToken;
  }

  return NextResponse.json(response);
}
