import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.error!;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    const sql = getSql();
    await sql`DELETE FROM fotos WHERE id = ANY(${ids})`;
    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
