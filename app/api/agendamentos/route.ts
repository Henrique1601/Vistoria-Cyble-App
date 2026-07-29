import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';
import { requireAnyPin, requireAdmin } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';
import { validateBloco, validateApartamento, validateData, validateHora, validateId, validateObservacao, isValidationError } from '@/lib/validation';

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
    const agendamentos = await sql`
      SELECT id, bloco, apartamento, data, hora, concluido, observacao, criado_em::text
      FROM agendamentos
      ORDER BY data ASC, hora ASC NULLS LAST, criado_em DESC
    `;
    return NextResponse.json({ agendamentos });
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
    const { bloco, apartamento, data, hora, concluido, observacao } = await req.json();

    // Validate inputs
    const b = validateBloco(bloco);
    const a = validateApartamento(apartamento);
    const d = validateData(data);
    const h = validateHora(hora);
    const obs = validateObservacao(observacao);
    if (isValidationError(b)) return NextResponse.json({ error: b.message }, { status: 400 });
    if (isValidationError(a)) return NextResponse.json({ error: a.message }, { status: 400 });
    if (isValidationError(d)) return NextResponse.json({ error: d.message }, { status: 400 });
    if (isValidationError(h)) return NextResponse.json({ error: h.message }, { status: 400 });
    if (isValidationError(obs)) return NextResponse.json({ error: obs.message }, { status: 400 });

    const sql = getSql();
    const [ag] = await sql`
      INSERT INTO agendamentos (bloco, apartamento, data, hora, concluido, observacao)
      VALUES (${b}, ${a}, ${d}, ${h || null}, ${concluido || false}, ${obs || null})
      RETURNING id, bloco, apartamento, data, hora, concluido, observacao, criado_em::text
    `;
    return NextResponse.json({ ok: true, agendamento: ag });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
    const { id, bloco, apartamento, data, hora, concluido, observacao } = await req.json();
    const idNum = validateId(id);
    if (isValidationError(idNum)) return NextResponse.json({ error: idNum.message }, { status: 400 });

    // Validate optional fields
    const b = bloco !== undefined ? validateBloco(bloco) : undefined;
    const a = apartamento !== undefined ? validateApartamento(apartamento) : undefined;
    const d = data !== undefined ? validateData(data) : undefined;
    const h = validateHora(hora);
    const obs = validateObservacao(observacao);
    if (b && isValidationError(b)) return NextResponse.json({ error: b.message }, { status: 400 });
    if (a && isValidationError(a)) return NextResponse.json({ error: a.message }, { status: 400 });
    if (d && isValidationError(d)) return NextResponse.json({ error: d.message }, { status: 400 });
    if (h && isValidationError(h)) return NextResponse.json({ error: h.message }, { status: 400 });
    if (obs && isValidationError(obs)) return NextResponse.json({ error: obs.message }, { status: 400 });

    const sql = getSql();
    const [ag] = await sql`
      UPDATE agendamentos
      SET bloco = COALESCE(${bloco}, bloco),
          apartamento = COALESCE(${apartamento}, apartamento),
          data = COALESCE(${data}, data),
          hora = ${hora},
          concluido = COALESCE(${concluido}, concluido),
          observacao = ${observacao}
      WHERE id = ${idNum}
      RETURNING id, bloco, apartamento, data, hora, concluido, observacao, criado_em::text
    `;
    return NextResponse.json({ ok: true, agendamento: ag });
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
    if (isValidationError(idNum)) return NextResponse.json({ error: idNum.message }, { status: 400 });

    const sql = getSql();
    await sql`DELETE FROM agendamentos WHERE id = ${idNum}`;
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
