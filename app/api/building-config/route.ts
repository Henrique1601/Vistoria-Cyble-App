import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';

export const runtime = 'nodejs';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const sql = getSql();
    const rows = await sql`SELECT id, nome, config, updated_at::text FROM building_config ORDER BY id`;
    if (rows.length === 0) {
      return NextResponse.json({ buildings: [] });
    }
    return NextResponse.json({ buildings: rows });
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
      INSERT INTO building_config (id, nome, config, updated_at)
      VALUES (1, ${nome || 'Prédio AcquaPlay'}::text, ${configJson}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET
        config = EXCLUDED.config,
        updated_at = now()
    `;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
