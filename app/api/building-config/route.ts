import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';
import { requireAnyPin, requireAdmin } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';
import { validateNome, isValidationError } from '@/lib/validation';

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
    const rows = await sql`SELECT id, nome, config::text, updated_at::text FROM building_config ORDER BY id`;
    if (rows.length === 0) {
      return NextResponse.json({ buildings: [] });
    }
    const buildings = rows.map((r) => {
      let config = JSON.parse(r.config as string);
      if (typeof config === 'string') config = JSON.parse(config);
      return {
        id: r.id,
        nome: r.nome,
        config,
        updated_at: r.updated_at,
      };
    });
    return NextResponse.json({ buildings });
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
    const { nome, config } = await req.json();

    // Validate name
    const n = validateNome(nome);
    if (isValidationError(n)) return NextResponse.json({ error: n.message }, { status: 400 });

    // Validate config is an object
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return NextResponse.json({ error: 'Configuracao invalida' }, { status: 400 });
    }

    const sql = getSql();
    const configStr = typeof config === 'string' ? config : JSON.stringify(config);

    await sql`
      INSERT INTO building_config (id, nome, config, updated_at)
      VALUES (1, ${nome || 'Prédio AcquaPlay'}::text, ${configStr}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET
        nome = EXCLUDED.nome,
        config = EXCLUDED.config,
        updated_at = now()
    `;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
