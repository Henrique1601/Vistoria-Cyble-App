import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/rateLimit';

describe('Rate Limit Module (lib/rateLimit.ts)', () => {
  it('permite requisições dentro do limite configurado', () => {
    const key = `test-ip-${Date.now()}`;
    const config = { windowMs: 60000, max: 3 };

    const r1 = checkRateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('bloqueia requisições que excedem o limite', () => {
    const key = `test-ip-blocked-${Date.now()}`;
    const config = { windowMs: 60000, max: 2 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);

    const rBlocked = checkRateLimit(key, config);
    expect(rBlocked.allowed).toBe(false);
    expect(rBlocked.remaining).toBe(0);
  });
});
