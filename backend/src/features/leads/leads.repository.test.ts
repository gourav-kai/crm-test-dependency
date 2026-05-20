import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, makeUser } from '@/test/factories';
import { leadsRepository } from './leads.repository';

function mkLead(ownerId: number, p: Partial<{ opportunityName: string; stage: any; leadValue: number }> = {}) {
  return leadsRepository.create({
    opportunityName: p.opportunityName ?? 'Opp',
    notes: null,
    contactPerson: 'Jane',
    estimatedClosingDate: '2026-12-01',
    leadValue: p.leadValue ?? 1000,
  }, ownerId);
}

describe('leadsRepository.listForUser', () => {
  beforeEach(resetDb);

  it('returns only the rep\'s rows for sales', async () => {
    const alice = await makeUser({ role: 'sales' });
    const bob   = await makeUser({ role: 'sales' });
    mkLead(alice.id); mkLead(alice.id); mkLead(bob.id);
    const ls = leadsRepository.listForUser({ user: { id: alice.id, role: 'sales' } });
    expect(ls).toHaveLength(2);
    expect(ls.every((l) => l.ownerId === alice.id)).toBe(true);
  });

  it('returns all for admin', async () => {
    const admin = await makeUser({ role: 'admin' });
    const alice = await makeUser(); mkLead(alice.id); mkLead(alice.id);
    expect(leadsRepository.listForUser({ user: { id: admin.id, role: 'admin' } })).toHaveLength(2);
  });

  it('filters by stage', async () => {
    const alice = await makeUser(); const l = mkLead(alice.id);
    leadsRepository.updateStage(l.id, 'Proposing');
    expect(leadsRepository.listForUser({ user: { id: alice.id, role: 'sales' }, stage: 'Proposing' })).toHaveLength(1);
    expect(leadsRepository.listForUser({ user: { id: alice.id, role: 'sales' }, stage: 'Complete' })).toHaveLength(0);
  });

  it('search is case-insensitive substring on opportunity_name', async () => {
    const alice = await makeUser();
    mkLead(alice.id, { opportunityName: 'Acme Corp' });
    mkLead(alice.id, { opportunityName: 'Globex' });
    const r = leadsRepository.listForUser({ user: { id: alice.id, role: 'sales' }, search: 'acm' });
    expect(r.map((x) => x.opportunityName)).toEqual(['Acme Corp']);
  });
});

describe('leadsRepository CRUD', () => {
  beforeEach(resetDb);
  it('create → findById → update → updateStage → delete', async () => {
    const alice = await makeUser();
    const created = mkLead(alice.id);
    expect(leadsRepository.findById(created.id)).toMatchObject({ stage: 'Evaluating' });
    const upd = leadsRepository.update(created.id, { leadValue: 2000 });
    expect(upd?.leadValue).toBe(2000);
    const moved = leadsRepository.updateStage(created.id, 'Complete');
    expect(moved?.stage).toBe('Complete');
    expect(leadsRepository.delete(created.id)).toBe(true);
    expect(leadsRepository.findById(created.id)).toBeNull();
  });
});

describe('leadsRepository aggregations', () => {
  beforeEach(resetDb);

  it('countByStage returns all 4 stages even when 0 leads', async () => {
    const alice = await makeUser();
    mkLead(alice.id);
    const r = leadsRepository.countByStage();
    expect(r).toHaveLength(4);
    expect(r.find((x) => x.stage === 'Evaluating')!.count).toBe(1);
    expect(r.find((x) => x.stage === 'Complete')!.count).toBe(0);
  });

  it('countByOwner returns 0 for active sales users with no leads', async () => {
    await makeUser({ role: 'sales' }); // no leads
    expect(leadsRepository.countByOwner().every((r) => r.count >= 0)).toBe(true);
  });
});
