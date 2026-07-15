import { NextResponse } from 'next/server';
import postgres from 'postgres';

export const runtime = 'nodejs';

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const sql = postgres(databaseUrl, { ssl: 'require' });
    const fotos = await sql`SELECT id, bloco, apartamento, data_leitura::text, foto_url, foto_index FROM fotos ORDER BY data_leitura DESC, bloco, apartamento, foto_index`;
    await sql.end();
    return NextResponse.json({ fotos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
