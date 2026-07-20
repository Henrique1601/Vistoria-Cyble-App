import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';

export const runtime = 'nodejs';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const sql = getSql();
    const rows = await sql`SELECT id, nome, config, updated_at::text FROM building_config ORDER BY id LIMIT 1`;
    if (rows.length === 0) {
      return NextResponse.json({ config: null });
    }
    return NextResponse.json({ config: rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const { nome, config } = await req.json();
    const sql = getSql();
    const configJson = JSON.stringify(config);
    await sql`
      UPDATE building_config SET config = ${configJson}::jsonb, updated_at = now() WHERE id = 1
    `;
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
