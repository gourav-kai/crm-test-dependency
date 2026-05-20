import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/test/factories';
import { digestRepository } from './digest.repository';
import { createFakeMailer } from './mailer';

describe('digestRepository', () => {
  beforeEach(resetDb);

  it('creates a row and returns it', () => {
    const r = digestRepository.create({
      triggeredBy: 'manual', recipientsCount: 2, successCount: 2, failureCount: 0, notes: null,
    });
    expect(r.id).toBeGreaterThan(0);
    expect(r.runAt).toMatch(/T/);
  });

  it('listRecent orders by run_at DESC and respects limit', async () => {
    digestRepository.create({ triggeredBy: 'cron', recipientsCount: 1, successCount: 1, failureCount: 0, notes: null });
    await new Promise((r) => setTimeout(r, 10));
    const second = digestRepository.create({ triggeredBy: 'manual', recipientsCount: 1, successCount: 1, failureCount: 0, notes: 'x' });
    const list = digestRepository.listRecent(10);
    expect(list[0].id).toBe(second.id);
  });
});

describe('createFakeMailer', () => {
  it('captures sent messages and honours failOn', async () => {
    const m = createFakeMailer();
    await m.send({ to: 'a@x', subject: 's', text: 't' });
    m.failOn((msg) => msg.to === 'fail@x');
    await expect(m.send({ to: 'fail@x', subject: 's', text: 't' })).rejects.toThrow();
    await m.send({ to: 'b@x', subject: 's', text: 't' });
    expect(m.sent.map((s) => s.to)).toEqual(['a@x', 'b@x']);
  });
});
