import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';
import { requireAnyPin, requireAdmin } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';
import { validateId, isValidationError } from '@/lib/validation';

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
      await sql`SELECT id, bloco, apartamento, data_leitura::text, foto_url, foto_index FROM fotos WHERE foto_url != 'concluido' AND foto_url LIKE 'http%' ORDER BY data_leitura DESC, bloco, apartamento, foto_index`;
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
    const idNum = validateId(id);
    if (isValidationError(idNum)) {
      return NextResponse.json({ error: idNum.message }, { status: 400 });
    }

    const sql = getSql();
    await sql`DELETE FROM fotos WHERE id = ${idNum}`;
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
    const idNum = validateId(id);
    if (isValidationError(idNum)) {
      return NextResponse.json({ error: idNum.message }, { status: 400 });
    }

    const sql = getSql();
    
    if (updates.bloco !== undefined && updates.apartamento !== undefined) {
      const bloco = typeof updates.bloco === 'string' ? updates.bloco.trim() : '';
      const apartamento = typeof updates.apartamento === 'string' ? updates.apartamento.trim() : '';
      if (!bloco || !apartamento) {
        return NextResponse.json({ error: 'Bloco e apartamento sao obrigatorios' }, { status: 400 });
      }
      await sql`UPDATE fotos SET bloco = ${bloco}, apartamento = ${apartamento} WHERE id = ${idNum}`;
    }
    
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
