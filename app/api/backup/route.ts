import { put, list, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const BACKUP_PREFIX = 'v2/backup/';
const MAX_BACKUPS = 7;

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

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const timestamp = form.get('timestamp') as string;

    if (!file) {
      return NextResponse.json({ erro: 'Arquivo nao fornecido' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ erro: 'Arquivo muito grande (max 50MB)' }, { status: 400 });
    }

    const rawName = file.name || `backup-${Date.now()}.json`;
    // Strip path traversal: only use the basename, remove any directory components
    const safeName = rawName.replace(/^.*[/\\]/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
    const fileName = safeName || `backup-${Date.now()}.json`;
    const path = `${BACKUP_PREFIX}${fileName}`;

    const blob = await put(path, file, {
      access: 'public',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    try {
      const { blobs } = await list({
        prefix: BACKUP_PREFIX,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      if (blobs.length > MAX_BACKUPS) {
        const sorted = blobs.sort(
          (a, b) => b.pathname.localeCompare(a.pathname)
        );
        const toDelete = sorted.slice(MAX_BACKUPS);
        await Promise.all(
          toDelete.map((b) =>
            del(b.url, { token: process.env.BLOB_READ_WRITE_TOKEN })
          )
        );
      }
    } catch {
      // Cleanup non-critical
    }

    return NextResponse.json({ ok: true, url: blob.url, path });
  } catch (err) {
    return NextResponse.json(
      { erro: String(err) },
      { status: 500 }
    );
  }
}
