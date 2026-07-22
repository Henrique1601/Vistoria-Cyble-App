import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  
  if (process.env.ADMIN_PIN && pin === process.env.ADMIN_PIN) {
    return NextResponse.json({ ok: true, role: 'admin' });
  }
  
  if (process.env.VIEWER_PIN && pin === process.env.VIEWER_PIN) {
    return NextResponse.json({ ok: true, role: 'viewer' });
  }
  
  if (process.env.APP_PIN && pin === process.env.APP_PIN) {
    return NextResponse.json({ ok: true, role: 'admin' });
  }
  
  return NextResponse.json({ ok: false });
}
