import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { requireAdmin, requireAnyPin } from '@/lib/auth';
import { NextRequest } from 'next/server';

describe('Auth Module (lib/auth.ts)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ADMIN_PIN: '1234',
      VIEWER_PIN: '5678',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function makeRequest(pin?: string) {
    const headers = new Headers();
    if (pin !== undefined) {
      headers.set('x-app-pin', pin);
    }
    return new NextRequest('http://localhost:3000/api/status', { headers });
  }

  describe('requireAdmin', () => {
    it('rejeita requisições sem o cabeçalho x-app-pin', () => {
      const req = makeRequest();
      const res = requireAdmin(req);
      expect(res.ok).toBe(false);
      expect(res.role).toBeUndefined();
    });

    it('rejeita PIN incorreto', () => {
      const req = makeRequest('9999');
      const res = requireAdmin(req);
      expect(res.ok).toBe(false);
    });

    it('rejeita VIEWER_PIN quando admin é exigido', () => {
      const req = makeRequest('5678');
      const res = requireAdmin(req);
      expect(res.ok).toBe(false);
    });

    it('aceita ADMIN_PIN com sucesso', () => {
      const req = makeRequest('1234');
      const res = requireAdmin(req);
      expect(res.ok).toBe(true);
      expect(res.role).toBe('admin');
    });
  });

  describe('requireAnyPin', () => {
    it('rejeita requisições sem PIN', () => {
      const req = makeRequest();
      const res = requireAnyPin(req);
      expect(res.ok).toBe(false);
    });

    it('autentica ADMIN_PIN como role admin', () => {
      const req = makeRequest('1234');
      const res = requireAnyPin(req);
      expect(res.ok).toBe(true);
      expect(res.role).toBe('admin');
    });

    it('autentica VIEWER_PIN como role viewer', () => {
      const req = makeRequest('5678');
      const res = requireAnyPin(req);
      expect(res.ok).toBe(true);
      expect(res.role).toBe('viewer');
    });

    it('rejeita PIN inválido', () => {
      const req = makeRequest('0000');
      const res = requireAnyPin(req);
      expect(res.ok).toBe(false);
    });
  });
});
