import { describe, it, expect, vi, afterEach } from 'vitest';

import { db } from '@/db/client';

import { checkHealth } from './health.service';

describe('checkHealth', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns ok+db=ok when SELECT 1 succeeds', () => {
    const result = checkHealth();
    expect(result).toEqual({ ok: true, backend: 'ok', db: 'ok' });
  });

  it('returns ok=false + db=down when SELECT 1 throws', () => {
    vi.spyOn(db, 'prepare').mockImplementationOnce(() => {
      throw new Error('db unreachable');
    });
    const result = checkHealth();
    expect(result).toEqual({ ok: false, backend: 'ok', db: 'down' });
  });

  it('never throws — db error is caught and reported', () => {
    vi.spyOn(db, 'prepare').mockImplementationOnce(() => {
      throw new Error('catastrophic');
    });
    expect(() => checkHealth()).not.toThrow();
  });
});
