import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSql } from '@/lib/sql';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';
import { validateBloco, validateApartamento, isValidationError } from '@/lib/validation';

/** Normalize "A" → "Torre A", "B" → "Torre B", etc. */
function normalizeBlocoName(raw: string): string {
  const letter = raw.trim().toUpperCase();
  if (/^[A-Z]$/.test(letter)) return `Torre ${letter}`;
  return raw.trim();
}

export async function GET(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req);
  const rl = checkRateLimit(`status:${ip}`, RATE_LIMITS.read);
  if (!rl.allowed) {
    return NextResponse.json({ status: {}, lastUpdate: Date.now() }, {
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  const pin = req.headers.get('x-app-pin') || req.nextUrl.searchParams.get('pin') || '';
  if (!pin) return NextResponse.json({ status: {}, lastUpdate: Date.now() });

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ status: {}, lastUpdate: Date.now() });
  }

  try {
    const sql = getSql();
    const all = await sql`
      SELECT DISTINCT bloco, apartamento, foto_url FROM fotos WHERE foto_url != 'concluido' ORDER BY bloco, apartamento
    `;

    const aptoCats: Record<string, Set<string>> = {};
    for (const row of all) {
      const key = `${row.bloco}||${row.apartamento}`;
      if (!aptoCats[key]) aptoCats[key] = new Set();
      const url: string = row.foto_url || '';
      if (url.includes('cyble_antes')) aptoCats[key].add('cyble_antes');
      else if (url.includes('cyble_depois')) aptoCats[key].add('cyble_depois');
      else if (url.includes('documento')) aptoCats[key].add('documento');
    }

    const towerStats: Record<string, { total: number; concluidos: number; emAndamento: number; pendentes: number }> = {};
    for (const [key, cats] of Object.entries(aptoCats)) {
      const [rawBloco] = key.split('||');
      const bloco = normalizeBlocoName(rawBloco);
      if (!towerStats[bloco]) towerStats[bloco] = { total: 0, concluidos: 0, emAndamento: 0, pendentes: 0 };
      towerStats[bloco].total++;
      if (cats.has('cyble_antes') && cats.has('cyble_depois') && cats.has('documento')) {
        towerStats[bloco].concluidos++;
      } else if (cats.size > 0) {
        towerStats[bloco].emAndamento++;
      } else {
        towerStats[bloco].pendentes++;
      }
    }

    const now = Date.now();
    const data: Record<string, { total: number; concluidos: number; percentual: number; timestamp: number }> = {};
    for (const [bloco, stats] of Object.entries(towerStats)) {
      data[bloco] = {
        total: stats.total,
        concluidos: stats.concluidos,
        percentual: stats.total > 0 ? Math.round((stats.concluidos / stats.total) * 100) : 0,
        timestamp: now,
      };
    }

    return NextResponse.json({ status: data, lastUpdate: now });
  } catch {
    return NextResponse.json({ status: {}, lastUpdate: Date.now() });
  }
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req);
  const rl = checkRateLimit(`status-post:${ip}`, RATE_LIMITS.write);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas requisicoes' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  // Admin only
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.error!;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { bloco, apartamento, concluido } = body;

    if (concluido && bloco && apartamento) {
      const b = validateBloco(bloco);
      const a = validateApartamento(apartamento);
      if (!isValidationError(b) && !isValidationError(a)) {
        const sql = getSql();
        await sql`
          INSERT INTO concluidos (bloco, apartamentos)
          VALUES (${b}, ARRAY[${a}]::text[])
          ON CONFLICT (bloco) DO UPDATE
          SET apartamentos = ARRAY(
            SELECT DISTINCT unnest(concluidos.apartamentos || EXCLUDED.apartamentos)
          )
        `;
      }
    }

    return NextResponse.json({ ok: true, role: auth.role });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req);
  const rl = checkRateLimit(`status-del:${ip}`, RATE_LIMITS.write);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas requisicoes' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  // Admin only — desmarcar conclusão é ação destrutiva
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.error!;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { bloco, apartamento } = body;

    const b = validateBloco(bloco);
    const a = validateApartamento(apartamento);
    if (isValidationError(b)) return NextResponse.json({ error: b.message }, { status: 400 });
    if (isValidationError(a)) return NextResponse.json({ error: a.message }, { status: 400 });

    const sql = getSql();
    // Remove o apartamento da tabela concluidos
    await sql`
      UPDATE concluidos
      SET apartamentos = array_remove(apartamentos, ${a})
      WHERE bloco = ${b}
    `;

    // Deleta todas as fotos do apartamento para desmarcar como concluido
    const result = await sql`
      WITH deleted AS (
        DELETE FROM fotos
        WHERE bloco = ${b} AND apartamento = ${a}
        RETURNING 1
      )
      SELECT count(*)::int AS cnt FROM deleted
    `;

    const count = result[0]?.cnt ?? 0;
    return NextResponse.json({ ok: true, deleted: count > 0, count });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed' }, { status: 500 });
  }
}
