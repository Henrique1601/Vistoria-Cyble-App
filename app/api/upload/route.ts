import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getSql, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/sql';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-app-pin');

  function isValidPin(): boolean {
    if (!pin) return false;
    if (process.env.ADMIN_PIN && pin === process.env.ADMIN_PIN) return true;
    if (process.env.VIEWER_PIN && pin === process.env.VIEWER_PIN) return true;
    if (process.env.APP_PIN && pin === process.env.APP_PIN) return true;
    return false;
  }

  if (!isValidPin()) {
    return NextResponse.json({ erro: 'PIN invalido' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const bloco = form.get('bloco') as string;
  const apartamento = form.get('apartamento') as string;
  const categoria = form.get('categoria') as string;
  const timestamp = form.get('timestamp') as string;

  if (!file || !bloco || !apartamento || !categoria) {
    return NextResponse.json({ erro: 'campos faltando' }, { status: 400 });
  }

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
      await sql`INSERT INTO fotos (bloco, apartamento, data_leitura, foto_url, foto_index)
                 VALUES (${bloco}, ${apartamento}, ${dataLeitura}, ${blob.url}, 0)`;
    } catch {
      // Non-critical: photo still saved to Blob
    }
  }

  return NextResponse.json({ url: blob.url, path });
}
