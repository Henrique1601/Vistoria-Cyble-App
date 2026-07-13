import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-app-pin');
  if (!process.env.APP_PIN || pin !== process.env.APP_PIN) {
    return NextResponse.json({ erro: 'PIN inválido' }, { status: 401 });
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

  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `vistorias/bloco-${bloco}/apto-${apartamento}/${categoria}-${timestamp}.${ext}`;

  const blob = await put(path, file, {
    access: 'public',
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ url: blob.url, path });
}
