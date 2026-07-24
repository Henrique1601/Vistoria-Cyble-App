import { NextResponse } from 'next/server';
import { getSql } from '@/lib/sql';

export const runtime = 'nodejs';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const sql = getSql();
    const agendamentos = await sql`
      SELECT id, bloco, apartamento, data, concluido, observacao, criado_em::text
      FROM agendamentos
      ORDER BY data ASC, criado_em DESC
    `;
    return NextResponse.json({ agendamentos });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const { bloco, apartamento, data, concluido, observacao } = await request.json();
    if (!bloco || !apartamento || !data) {
      return NextResponse.json({ error: 'bloco, apartamento e data sao obrigatorios' }, { status: 400 });
    }

    const sql = getSql();
    const [ag] = await sql`
      INSERT INTO agendamentos (bloco, apartamento, data, concluido, observacao)
      VALUES (${bloco}, ${apartamento}, ${data}, ${concluido || false}, ${observacao || null})
      RETURNING id, bloco, apartamento, data, concluido, observacao, criado_em::text
    `;
    return NextResponse.json({ ok: true, agendamento: ag });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const { id, bloco, apartamento, data, concluido, observacao } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const sql = getSql();
    const [ag] = await sql`
      UPDATE agendamentos
      SET bloco = COALESCE(${bloco}, bloco),
          apartamento = COALESCE(${apartamento}, apartamento),
          data = COALESCE(${data}, data),
          concluido = COALESCE(${concluido}, concluido),
          observacao = ${observacao}
      WHERE id = ${id}
      RETURNING id, bloco, apartamento, data, concluido, observacao, criado_em::text
    `;
    return NextResponse.json({ ok: true, agendamento: ag });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const sql = getSql();
    await sql`DELETE FROM agendamentos WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
