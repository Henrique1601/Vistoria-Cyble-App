import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getSql, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/sql';
import { requireAdmin } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';
import { validateBloco, validateApartamento, validateCategoria, isValidationError } from '@/lib/validation';

export const runtime = 'nodejs';

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

  if (!file || !blocoRaw || !apartamentoRaw || !categoriaRaw) {
    return NextResponse.json({ erro: 'campos faltando' }, { status: 400 });
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
  const path = `vistorias/bloco-${bloco}/apto-${apartamento}/${categoria}-${timestamp}.${ext}`;

  const blob = await put(path, file, {
    access: 'public',
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (process.env.DATABASE_URL) {
    try {
      const sql = getSql();
      const dataLeitura = new Date(Number(timestamp)).toISOString().split('T')[0];
      // Idempotent: check if photo already exists before inserting
      const existing = await sql`SELECT id FROM fotos 
                                  WHERE bloco = ${bloco} AND apartamento = ${apartamento} 
                                  AND data_leitura = ${dataLeitura}`;
      if (existing.length === 0) {
        await sql`INSERT INTO fotos (bloco, apartamento, data_leitura, foto_url, foto_index)
                   VALUES (${bloco}, ${apartamento}, ${dataLeitura}, ${blob.url}, 0)`;
      }
    } catch (err) {
      console.warn('Failed to save photo metadata to DB (photo still saved to Blob):', err);
    }
  }

  return NextResponse.json({ url: blob.url, path });
}
