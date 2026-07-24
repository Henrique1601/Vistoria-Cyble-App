import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/version';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ version: APP_VERSION });
}
