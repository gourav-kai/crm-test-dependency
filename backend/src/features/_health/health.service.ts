import { db } from '@/db/client';

export type HealthBody =
  | { ok: true; backend: 'ok'; db: 'ok' }
  | { ok: false; backend: 'ok'; db: 'down' };

export function checkHealth(): HealthBody {
  try {
    db.prepare('SELECT 1').get();
    return { ok: true, backend: 'ok', db: 'ok' };
  } catch {
    return { ok: false, backend: 'ok', db: 'down' };
  }
}
