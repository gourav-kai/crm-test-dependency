import path from 'node:path';

import bcrypt from 'bcrypt';

import { db } from '@/db/client';
import { applyMigrations } from '@/db/migrate';
import { env } from '@/config/env';

applyMigrations(db, path.resolve(__dirname, '../../migrations'));

let _counter = 0;

export function resetDb(): void {
  db.exec('DELETE FROM digest_runs');
  db.exec('DELETE FROM leads');
  db.exec('DELETE FROM users');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','leads','digest_runs')");
  _counter = 0;
}

interface UserOverrides {
  email?: string;
  fullName?: string;
  role?: 'admin' | 'sales';
  active?: boolean;
  password?: string;
}

export async function makeUser(overrides: UserOverrides = {}): Promise<{
  id: number;
  email: string;
  fullName: string;
  role: 'admin' | 'sales';
  active: boolean;
}> {
  _counter += 1;
  const email = overrides.email ?? `user${_counter}@test.com`;
  const fullName = overrides.fullName ?? `User ${_counter}`;
  const role = overrides.role ?? 'sales';
  const active = overrides.active !== false;
  const password = overrides.password ?? 'TestPassword123!';
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_COST);
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO users (email, password_hash, full_name, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(email, passwordHash, fullName, role, active ? 1 : 0, now, now);

  return {
    id: Number(result.lastInsertRowid),
    email,
    fullName,
    role,
    active,
  };
}
