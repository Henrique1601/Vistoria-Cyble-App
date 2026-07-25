import { NextRequest, NextResponse } from 'next/server';

export type AuthRole = 'admin' | 'viewer';

export interface AuthResult {
  ok: boolean;
  role?: AuthRole;
  error?: NextResponse;
}

function isValidAdminPin(pin: string): boolean {
  if (process.env.ADMIN_PIN && pin === process.env.ADMIN_PIN) return true;
  if (process.env.APP_PIN && pin === process.env.APP_PIN) return true;
  return false;
}

function isValidViewerPin(pin: string): boolean {
  if (process.env.VIEWER_PIN && pin === process.env.VIEWER_PIN) return true;
  return false;
}

function isValidAnyPin(pin: string): boolean {
  return isValidAdminPin(pin) || isValidViewerPin(pin);
}

function unauthorized(message = 'PIN invalido'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function requireAdmin(req: NextRequest): AuthResult {
  const pin = req.headers.get('x-app-pin');
  if (!pin) return { ok: false, error: unauthorized('PIN obrigatorio') };
  if (isValidAdminPin(pin)) return { ok: true, role: 'admin' };
  return { ok: false, error: unauthorized('Acesso restrito a administradores') };
}

export function requireAnyPin(req: NextRequest): AuthResult {
  const pin = req.headers.get('x-app-pin');
  if (!pin) return { ok: false, error: unauthorized('PIN obrigatorio') };
  if (isValidAdminPin(pin)) return { ok: true, role: 'admin' };
  if (isValidViewerPin(pin)) return { ok: true, role: 'viewer' };
  return { ok: false, error: unauthorized() };
}
