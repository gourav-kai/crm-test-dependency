import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';

import { runMigrationsAt, applyMigrations } from './migrate';
import { openDatabase } from './client';

interface MigrationRow {
  name: string;
}

describe('migration runner', () => {
  let tmpDir: string;
  let dbFile: string;
  let migDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mvp-crm-migrate-'));
    dbFile = path.join(tmpDir, 'test.db');
    migDir = path.join(tmpDir, 'migrations');
    fs.mkdirSync(migDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should apply migrations in lexicographic order and record them in _migrations', () => {
    // Arrange — write two migrations out of lex order to prove sort is happening.
    fs.writeFileSync(
      path.join(migDir, '0002_b.sql'),
      'CREATE TABLE b (id INTEGER PRIMARY KEY);',
    );
    fs.writeFileSync(
      path.join(migDir, '0001_a.sql'),
      'CREATE TABLE a (id INTEGER PRIMARY KEY);',
    );

    // Act
    const result = runMigrationsAt(dbFile, migDir);

    // Assert
    expect(result.count).toBe(2);
    expect(result.applied).toEqual(['0001_a.sql', '0002_b.sql']);

    const conn = new Database(dbFile);
    try {
      const rows = conn
        .prepare('SELECT name FROM _migrations ORDER BY id')
        .all() as MigrationRow[];
      expect(rows.map((r) => r.name)).toEqual(['0001_a.sql', '0002_b.sql']);
      // Tables actually created
      expect(
        conn
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('a','b') ORDER BY name",
          )
          .all(),
      ).toEqual([{ name: 'a' }, { name: 'b' }]);
    } finally {
      conn.close();
    }
  });

  it('should be a no-op on the second run (idempotent)', () => {
    // Arrange
    fs.writeFileSync(
      path.join(migDir, '0001_a.sql'),
      'CREATE TABLE a (id INTEGER PRIMARY KEY);',
    );

    // Act
    const first = runMigrationsAt(dbFile, migDir);
    const second = runMigrationsAt(dbFile, migDir);

    // Assert
    expect(first.count).toBe(1);
    expect(second.count).toBe(0);
    expect(second.applied).toEqual([]);
  });

  it('should roll back the failing migration and leave the database unchanged when SQL errors', () => {
    // Arrange — a known-good migration followed by an invalid one. The
    // invalid one's transaction must abort; the good one must remain applied
    // since it was committed in its own transaction.
    fs.writeFileSync(
      path.join(migDir, '0001_a.sql'),
      'CREATE TABLE a (id INTEGER PRIMARY KEY);',
    );
    fs.writeFileSync(
      path.join(migDir, '0002_bad.sql'),
      'CREATE TABLE bad (id INTEGER PRIMARY KEY); THIS IS NOT VALID SQL;',
    );

    // Act + Assert: failing migration surfaces the error.
    expect(() => runMigrationsAt(dbFile, migDir)).toThrow();

    const conn = new Database(dbFile);
    try {
      const applied = conn
        .prepare('SELECT name FROM _migrations ORDER BY id')
        .all() as MigrationRow[];
      // 0001 should be present, 0002 must NOT be recorded.
      expect(applied.map((r) => r.name)).toEqual(['0001_a.sql']);

      // The `bad` table from 0002 must NOT exist (transaction rolled back).
      const badTable = conn
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name = 'bad'",
        )
        .get();
      expect(badTable).toBeUndefined();
    } finally {
      conn.close();
    }
  });

  it('should ignore non-.sql files in the migrations directory', () => {
    // Arrange
    fs.writeFileSync(
      path.join(migDir, '0001_a.sql'),
      'CREATE TABLE a (id INTEGER PRIMARY KEY);',
    );
    fs.writeFileSync(path.join(migDir, 'README.md'), '# migrations');
    fs.writeFileSync(path.join(migDir, '0002_b.sql.bak'), 'garbage');

    // Act
    const result = runMigrationsAt(dbFile, migDir);

    // Assert
    expect(result.count).toBe(1);
    expect(result.applied).toEqual(['0001_a.sql']);
  });

  it('applyMigrations should create the _migrations tracking table with the documented schema', () => {
    // Arrange
    const conn = openDatabase(dbFile);
    try {
      // Act — empty migrations dir is fine; we only need the tracking table.
      applyMigrations(conn, migDir);

      // Assert — schema columns match the contract.
      const cols = conn.prepare('PRAGMA table_info(_migrations)').all() as {
        name: string;
        type: string;
        notnull: number;
        pk: number;
      }[];
      const byName = Object.fromEntries(cols.map((c) => [c.name, c]));
      expect(byName.id).toMatchObject({ type: 'INTEGER', pk: 1 });
      expect(byName.name).toMatchObject({ type: 'TEXT', notnull: 1 });
      expect(byName.applied_at).toMatchObject({ type: 'TEXT', notnull: 1 });
    } finally {
      conn.close();
    }
  });
});
