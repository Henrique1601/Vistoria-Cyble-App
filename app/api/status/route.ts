import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const ok = !!process.env.APP_PIN && pin === process.env.APP_PIN;
  return NextResponse.json({ ok });
}
