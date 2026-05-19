import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { describe, it, expect, afterEach } from 'vitest';

import { openDatabase } from './client';

describe('openDatabase', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    while (createdDirs.length > 0) {
      const dir = createdDirs.pop();
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should create the parent directory if it does not exist', () => {
    // Arrange
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mvp-crm-client-'));
    createdDirs.push(root);
    const dbFile = path.join(root, 'nested', 'deeper', 'test.db');

    // Act
    const conn = openDatabase(dbFile);
    conn.close();

    // Assert
    expect(fs.existsSync(path.dirname(dbFile))).toBe(true);
    expect(fs.existsSync(dbFile)).toBe(true);
  });

  it('should enable WAL journal mode, foreign keys, and synchronous=NORMAL', () => {
    // Arrange
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mvp-crm-client-'));
    createdDirs.push(root);
    const dbFile = path.join(root, 'test.db');

    // Act
    const conn = openDatabase(dbFile);
    try {
      const journal = conn.pragma('journal_mode', { simple: true });
      const fk = conn.pragma('foreign_keys', { simple: true });
      const sync = conn.pragma('synchronous', { simple: true });

      // Assert
      expect(String(journal).toLowerCase()).toBe('wal');
      // foreign_keys returns 1 when enabled
      expect(Number(fk)).toBe(1);
      // synchronous: 1 == NORMAL
      expect(Number(sync)).toBe(1);
    } finally {
      conn.close();
    }
  });

  it('should return a working connection that can execute SQL', () => {
    // Arrange
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mvp-crm-client-'));
    createdDirs.push(root);
    const dbFile = path.join(root, 'test.db');

    // Act
    const conn = openDatabase(dbFile);
    try {
      conn.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT NOT NULL)');
      conn.prepare('INSERT INTO t (v) VALUES (?)').run('hello');
      const row = conn.prepare('SELECT v FROM t WHERE id = 1').get() as {
        v: string;
      };

      // Assert
      expect(row.v).toBe('hello');
    } finally {
      conn.close();
    }
  });
});
