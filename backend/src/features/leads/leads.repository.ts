import { db } from '@/db/client';
import { STAGES, type Lead, type Stage } from './leads.types';

interface LeadRow {
  id: number; opportunity_name: string; notes: string | null; contact_person: string;
  estimated_closing_date: string; lead_value: number; stage: Stage; owner_id: number;
  created_at: string; updated_at: string;
}
const rowToLead = (r: LeadRow): Lead => ({
  id: r.id, opportunityName: r.opportunity_name, notes: r.notes, contactPerson: r.contact_person,
  estimatedClosingDate: r.estimated_closing_date, leadValue: r.lead_value, stage: r.stage,
  ownerId: r.owner_id, createdAt: r.created_at, updatedAt: r.updated_at,
});

const findByIdStmt = db.prepare('SELECT * FROM leads WHERE id = ?');
const insertStmt = db.prepare(`INSERT INTO leads (opportunity_name, notes, contact_person, estimated_closing_date,
                                                   lead_value, stage, owner_id, created_at, updated_at)
                                VALUES (@opportunity_name,@notes,@contact_person,@estimated_closing_date,@lead_value,@stage,@owner_id,@now,@now)`);
const updateStageStmt = db.prepare(`UPDATE leads SET stage = @stage, updated_at = @now WHERE id = @id`);
const deleteStmt = db.prepare('DELETE FROM leads WHERE id = ?');

const countByOwnerStmt = db.prepare(`
  SELECT u.id AS ownerId, u.full_name AS ownerName, COUNT(l.id) AS count
  FROM users u LEFT JOIN leads l ON l.owner_id = u.id
  WHERE u.role = 'sales' AND u.active = 1
  GROUP BY u.id ORDER BY count DESC`);
const countByOneOwnerStmt = db.prepare(`
  SELECT u.id AS ownerId, u.full_name AS ownerName, COUNT(l.id) AS count
  FROM users u LEFT JOIN leads l ON l.owner_id = u.id
  WHERE u.id = ?
  GROUP BY u.id`);

export interface ListFilter { stage?: Stage; search?: string; }

export const leadsRepository = {
  listForUser(opts: { user: { id: number; role: 'admin'|'sales' } } & ListFilter): Lead[] {
    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (opts.user.role === 'sales') { where.push('owner_id = @owner_id'); params.owner_id = opts.user.id; }
    if (opts.stage) { where.push('stage = @stage'); params.stage = opts.stage; }
    if (opts.search) { where.push('LOWER(opportunity_name) LIKE @q'); params.q = `%${opts.search.toLowerCase()}%`; }
    const sql = `SELECT * FROM leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC`;
    return (db.prepare(sql).all(params) as LeadRow[]).map(rowToLead);
  },

  findById(id: number): Lead | null {
    const r = findByIdStmt.get(id) as LeadRow | undefined;
    return r ? rowToLead(r) : null;
  },

  create(input: {
    opportunityName: string; notes: string | null; contactPerson: string;
    estimatedClosingDate: string; leadValue: number;
  }, ownerId: number): Lead {
    const now = new Date().toISOString();
    const info = insertStmt.run({
      opportunity_name: input.opportunityName, notes: input.notes,
      contact_person: input.contactPerson, estimated_closing_date: input.estimatedClosingDate,
      lead_value: input.leadValue, stage: 'Evaluating', owner_id: ownerId, now,
    });
    return this.findById(Number(info.lastInsertRowid))!;
  },

  update(id: number, patch: {
    opportunityName?: string; notes?: string | null; contactPerson?: string;
    estimatedClosingDate?: string; leadValue?: number;
  }): Lead | null {
    const sets: string[] = []; const params: Record<string, unknown> = { id, now: new Date().toISOString() };
    const map: Array<[string, string, unknown]> = [
      ['opportunityName', 'opportunity_name', patch.opportunityName],
      ['notes', 'notes', patch.notes],
      ['contactPerson', 'contact_person', patch.contactPerson],
      ['estimatedClosingDate', 'estimated_closing_date', patch.estimatedClosingDate],
      ['leadValue', 'lead_value', patch.leadValue],
    ];
    for (const [_k, col, v] of map) if (v !== undefined) { sets.push(`${col} = @${col}`); params[col] = v; }
    if (sets.length === 0) return this.findById(id);
    sets.push('updated_at = @now');
    db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = @id`).run(params);
    return this.findById(id);
  },

  updateStage(id: number, stage: Stage): Lead | null {
    updateStageStmt.run({ id, stage, now: new Date().toISOString() });
    return this.findById(id);
  },

  delete(id: number): boolean {
    return deleteStmt.run(id).changes > 0;
  },

  countByOwner(ownerId?: number): Array<{ ownerId: number; ownerName: string; count: number }> {
    return (ownerId !== undefined
      ? countByOneOwnerStmt.all(ownerId)
      : countByOwnerStmt.all()) as any[];
  },

  countByStage(ownerId?: number): Array<{ stage: Stage; count: number }> {
    const where = ownerId !== undefined ? 'WHERE owner_id = @owner_id' : '';
    const rows = db.prepare(`SELECT stage, COUNT(id) AS count FROM leads ${where} GROUP BY stage`)
      .all(ownerId !== undefined ? { owner_id: ownerId } : {}) as Array<{ stage: Stage; count: number }>;
    const map = new Map(rows.map((r) => [r.stage, r.count]));
    return STAGES.map((s) => ({ stage: s, count: map.get(s) ?? 0 }));
  },
};
