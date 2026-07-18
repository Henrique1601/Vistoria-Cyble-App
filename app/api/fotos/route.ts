import { NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';

export const runtime = 'nodejs';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const sql = getSql();
    const fotos =
      await sql`SELECT id, bloco, apartamento, data_leitura::text, foto_url, foto_index FROM fotos ORDER BY data_leitura DESC, bloco, apartamento, foto_index`;
    return NextResponse.json({ fotos });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
