import { db } from '@/db/client';
import type { DigestRun } from './digest.types';

interface Row {
  id: number; run_at: string; triggered_by: 'cron'|'manual';
  recipients_count: number; success_count: number; failure_count: number; notes: string | null;
}
const rowToRun = (r: Row): DigestRun => ({
  id: r.id, runAt: r.run_at, triggeredBy: r.triggered_by,
  recipientsCount: r.recipients_count, successCount: r.success_count,
  failureCount: r.failure_count, notes: r.notes,
});

const insertStmt = db.prepare(`INSERT INTO digest_runs (run_at, triggered_by, recipients_count, success_count, failure_count, notes)
                                VALUES (@run_at, @triggered_by, @recipients_count, @success_count, @failure_count, @notes)`);
const listStmt   = db.prepare('SELECT * FROM digest_runs ORDER BY run_at DESC LIMIT ?');

export const digestRepository = {
  create(input: {
    triggeredBy: 'cron' | 'manual';
    recipientsCount: number;
    successCount: number;
    failureCount: number;
    notes: string | null;
  }): DigestRun {
    const run_at = new Date().toISOString();
    const info = insertStmt.run({
      run_at,
      triggered_by: input.triggeredBy,
      recipients_count: input.recipientsCount,
      success_count: input.successCount,
      failure_count: input.failureCount,
      notes: input.notes,
    });
    return {
      id: Number(info.lastInsertRowid),
      runAt: run_at, triggeredBy: input.triggeredBy,
      recipientsCount: input.recipientsCount,
      successCount: input.successCount, failureCount: input.failureCount,
      notes: input.notes,
    };
  },

  listRecent(limit = 30): DigestRun[] {
    return (listStmt.all(limit) as Row[]).map(rowToRun);
  },
};
