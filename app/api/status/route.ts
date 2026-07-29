import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAnyPin } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';

function getSql() {
  return neon(process.env.DATABASE_URL!);
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

  try {
    const sql = getSql();
    const all = await sql`
      SELECT DISTINCT bloco, apartamento, foto_url FROM fotos ORDER BY bloco, apartamento
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
      const [bloco] = key.split('||');
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
  const rl = checkRateLimit(`status-post:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Muitas requisicoes' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  // Use timing-safe auth instead of plain === comparison
  const auth = requireAnyPin(req);
  if (!auth.ok) return auth.error!;

  try {
    const body = await req.json();
    const { bloco, apartamento, concluido } = body;

    if (concluido && bloco && apartamento) {
      const sql = getSql();
      await sql`
        INSERT INTO fotos (bloco, apartamento, foto_url, foto_index, data_leitura)
        VALUES (${bloco}, ${apartamento}, 'concluido', 0, CURRENT_DATE)
        ON CONFLICT DO NOTHING
      `;
    }

    return NextResponse.json({ ok: true, role: auth.role });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed' }, { status: 500 });
  }
}
