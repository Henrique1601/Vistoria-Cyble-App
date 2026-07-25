import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';

export const runtime = 'nodejs';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const sql = getSql();
    const rows = await sql`SELECT bloco, apartamentos FROM concluidos ORDER BY bloco`;
    const result: Record<string, string[]> = {};
    for (const row of rows) {
      result[row.bloco] = row.apartamentos as string[];
    }
    return NextResponse.json(result);
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
    const data: Record<string, string[]> = await req.json();
    const sql = getSql();

    await sql`DELETE FROM concluidos`;

    for (const [bloco, aptos] of Object.entries(data)) {
      if (aptos.length > 0) {
        await sql`INSERT INTO concluidos (bloco, apartamentos) VALUES (${bloco}, ${aptos}::text[])`;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
