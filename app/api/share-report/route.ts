import { put, del, list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SHARE_PREFIX = 'v2/reports/';
const MAX_REPORTS = 20;
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: NextRequest) {
  try {
    const { html, filename } = await req.json();

    if (!html || typeof html !== 'string') {
      return NextResponse.json({ erro: 'HTML nao fornecido' }, { status: 400 });
    }

    if (html.length > 10 * 1024 * 1024) {
      return NextResponse.json({ erro: 'HTML muito grande (max 10MB)' }, { status: 400 });
    }

    const name = filename || `relatorio-${Date.now()}.html`;
    const path = `${SHARE_PREFIX}${name}`;

    const blob = await put(path, new Blob([html], { type: 'text/html;charset=utf-8' }), {
      access: 'public',
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Cleanup old reports
    try {
      const { blobs } = await list({
        prefix: SHARE_PREFIX,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      const now = Date.now();
      const expired = blobs.filter((b) => now - new Date(b.uploadedAt).getTime() > EXPIRY_MS);
      const excess = blobs.length > MAX_REPORTS
        ? blobs.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()).slice(0, blobs.length - MAX_REPORTS)
        : [];

      for (const b of [...expired, ...excess]) {
        await del(b.url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
      }
    } catch {
      // Cleanup non-critical
    }

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 });
  }
}
