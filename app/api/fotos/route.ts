import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';
import { requireAnyPin, requireAdmin } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';

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
    const fotos =
      await sql`SELECT id, bloco, apartamento, data_leitura::text, foto_url, foto_index FROM fotos ORDER BY data_leitura DESC, bloco, apartamento, foto_index`;
    return NextResponse.json({ fotos });
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
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const sql = getSql();
    await sql`DELETE FROM fotos WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const sql = getSql();
    
    if (updates.bloco !== undefined || updates.apartamento !== undefined) {
      const bloco = updates.bloco;
      const apartamento = updates.apartamento;
      await sql`UPDATE fotos SET bloco = ${bloco}, apartamento = ${apartamento} WHERE id = ${id}`;
    }
    
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
