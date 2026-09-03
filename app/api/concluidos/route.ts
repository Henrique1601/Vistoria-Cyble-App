import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';
import { requireAnyPin, requireAdmin } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';
import { validateBloco, isValidationError } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`read:${ip}`, RATE_LIMITS.read);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Muitas requisicoes' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  const auth = requireAnyPin(req);
  if (!auth.ok) return auth.error!;

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
  const ip = getClientIp(req);
  const rl = checkRateLimit(`write:${ip}`, RATE_LIMITS.write);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Muitas requisicoes' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  const auth = requireAdmin(req);
  if (!auth.ok) return auth.error!;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const data: unknown = await req.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: 'Formato invalido' }, { status: 400 });
    }

    const sql = getSql();
    const entries = Object.entries(data as Record<string, unknown>);

    if (entries.length === 0) {
      await sql`DELETE FROM concluidos`;
      return NextResponse.json({ ok: true, cleared: true });
    }

    for (const [bloco, aptos] of entries) {
      const b = validateBloco(bloco);
      if (isValidationError(b)) continue; // skip invalid bloco keys
      if (!Array.isArray(aptos)) continue;
      // Only keep valid string apartment IDs
      const validAptos = aptos.filter((a): a is string => typeof a === 'string' && /^\d{1,10}$/.test(a));
      await sql`
        INSERT INTO concluidos (bloco, apartamentos)
        VALUES (${b}, ${validAptos}::text[])
        ON CONFLICT (bloco) DO UPDATE
        SET apartamentos = EXCLUDED.apartamentos
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`write:${ip}`, RATE_LIMITS.write);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Muitas requisicoes' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  const auth = requireAdmin(req);
  if (!auth.ok) return auth.error!;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const sql = getSql();
    await sql`DELETE FROM concluidos`;
    return NextResponse.json({ ok: true, cleared: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
