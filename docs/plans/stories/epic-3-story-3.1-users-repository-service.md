### Story 3.1: Users Repository + Service (List, Create, Patch)

**Epic**: 3 - USER MANAGEMENT | **ID**: 3.1 | **Date**: 2026-05-19 | **GitHub**: #9
**Requires**: [2.2]
**Enables**: [3.2, 6.2]
**Files Touched**:
  - backend/src/features/users/users.repository.ts
  - backend/src/features/users/users.service.ts
  - backend/src/features/users/users.schemas.ts
  - backend/src/features/users/users.service.test.ts
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § API Design (Users), § Security (passwords).
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — §§ 4, 5.

**Description**:
Extends `users.repository.ts` (seeded in Story 2.2) with `list()`, `create()`, `patch()`, and `listActiveSales()` (used later by digest). Adds `users.service.ts` orchestrating bcrypt hashing on create and enforcing unique-email at the application layer (translating DB UNIQUE violation to `ConflictError`). Adds Zod schemas for the wire contract. No HTTP routes here — Story 3.2 wires them.

**Acceptance Criteria**:
- `usersRepository.list()` returns `User[]` ordered by `created_at ASC`.
- `usersRepository.create({email,fullName,role,passwordHash})` inserts a row with `active=1`, returns the new `User`; throws on UNIQUE email violation (caught by service).
- `usersRepository.patch(id, {fullName?, role?, active?})` updates only present fields; returns updated `User`; returns `null` if id not found.
- `usersRepository.listActiveSales()` returns `User[]` where `role='sales'` AND `active=1`.
- `usersService.create({email,fullName,role,password})`:
  - Lowercases email.
  - Validates password length ≥ 12.
  - Hashes with `env.BCRYPT_COST` (default 12).
  - Throws `ConflictError('Email already exists')` on duplicate.
  - Returns `User` (no `password_hash` leakage).
- `usersService.patch(id, partial)` returns `User` or throws `NotFoundError('User')` on missing id.
- `usersService.list()` is a thin pass-through.
- `users.schemas.ts` exports `UserCreateSchema` (strict, password ≥12), `UserPatchSchema` (partial of allowed mutable fields).
- Unit tests use real in-memory SQLite + `bcrypt cost=4`; coverage ≥90% on service (critical file).
- No password / password_hash in any return type or log line.

**Prerequisites**: 2.2 (initial `users.repository.ts` with `findByEmail`/`findById`).

**Context**:
- `backend/src/features/users/users.repository.ts` (extend file from 2.2).
- `backend/src/http/errors.ts` (1.1).
- `backend/src/config/env.ts` (1.1 — `BCRYPT_COST`).

**Patterns**: Repository owns SQL (§ 4.2); ConflictError on UNIQUE (§ 2.1); strict Zod (§ 5.6).

**Steps**:

1. **Schemas** — `backend/src/features/users/users.schemas.ts`:
   ```ts
   import { z } from 'zod';
   export const RoleSchema = z.enum(['admin', 'sales']);
   export const UserCreateSchema = z.object({
     email: z.string().email().max(254),
     fullName: z.string().min(1).max(200),
     role: RoleSchema,
     password: z.string().min(12).max(1024),
   }).strict();
   export const UserPatchSchema = z.object({
     fullName: z.string().min(1).max(200).optional(),
     role: RoleSchema.optional(),
     active: z.boolean().optional(),
   }).strict().refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' });
   export type UserCreateInput = z.infer<typeof UserCreateSchema>;
   export type UserPatchInput  = z.infer<typeof UserPatchSchema>;
   ```

2. **Extend repository** — `backend/src/features/users/users.repository.ts` (append to file from 2.2):
   ```ts
   const listStmt = db.prepare('SELECT * FROM users ORDER BY created_at ASC');
   const listActiveSalesStmt = db.prepare(`SELECT * FROM users WHERE role='sales' AND active=1 ORDER BY full_name`);
   const insertStmt = db.prepare(`INSERT INTO users (email,password_hash,full_name,role,active,created_at,updated_at)
                                  VALUES (:email,:password_hash,:full_name,:role,1,:now,:now)`);

   export const usersRepositoryExt = {
     ...usersRepository,
     list(): User[] { return (listStmt.all() as UserRow[]).map(rowToUser); },
     listActiveSales(): User[] { return (listActiveSalesStmt.all() as UserRow[]).map(rowToUser); },
     create(input: { email: string; password_hash: string; full_name: string; role: 'admin'|'sales' }): User {
       const now = new Date().toISOString();
       const info = insertStmt.run({ ...input, email: input.email.toLowerCase(), now });
       const row = findByIdStmt.get({ id: Number(info.lastInsertRowid) }) as UserRow;
       return rowToUser(row);
     },
     patch(id: number, p: { fullName?: string; role?: 'admin'|'sales'; active?: boolean }): User | null {
       const sets: string[] = []; const params: Record<string, unknown> = { id, now: new Date().toISOString() };
       if (p.fullName !== undefined) { sets.push('full_name = :full_name'); params.full_name = p.fullName; }
       if (p.role     !== undefined) { sets.push('role = :role');           params.role = p.role; }
       if (p.active   !== undefined) { sets.push('active = :active');       params.active = p.active ? 1 : 0; }
       if (sets.length === 0) return this.findById(id);
       sets.push('updated_at = :now');
       db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = :id`).run(params);
       return this.findById(id);
     },
   };
   // Replace the exported binding so callers always import the extended object.
   export { usersRepositoryExt as usersRepository };
   ```
   *Note*: This re-export pattern keeps 2.2's API contract intact (existing `findByEmail`/`findById` callers still work) while widening the surface.

3. **Service** — `backend/src/features/users/users.service.ts`:
   ```ts
   import bcrypt from 'bcrypt';
   import { usersRepository, type User } from './users.repository';
   import { env } from '@/config/env';
   import { ConflictError, NotFoundError } from '@/http/errors';
   import type { UserCreateInput, UserPatchInput } from './users.schemas';

   export const usersService = {
     list(): User[] { return usersRepository.list(); },

     async create(input: UserCreateInput): Promise<User> {
       const email = input.email.toLowerCase();
       if (usersRepository.findByEmail(email)) throw new ConflictError('Email already exists');
       const password_hash = await bcrypt.hash(input.password, env.BCRYPT_COST);
       try {
         return usersRepository.create({ email, password_hash, full_name: input.fullName, role: input.role });
       } catch (e: any) {
         if (String(e.message ?? e).includes('UNIQUE')) throw new ConflictError('Email already exists');
         throw e;
       }
     },

     patch(id: number, p: UserPatchInput): User {
       const u = usersRepository.patch(id, p);
       if (!u) throw new NotFoundError('User');
       return u;
     },
   };
   ```

**Tests** — `backend/src/features/users/users.service.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/test/factories';
import { usersService } from './users.service';

describe('usersService', () => {
  beforeEach(resetDb);

  it('creates a user and returns it without the hash', async () => {
    const u = await usersService.create({ email: 'A@Ex.com', fullName: 'A', role: 'sales', password: 'password1234' });
    expect(u.email).toBe('a@ex.com');
    expect(u).not.toHaveProperty('password_hash');
  });

  it('rejects duplicate email with ConflictError', async () => {
    await usersService.create({ email: 'a@ex.com', fullName: 'A', role: 'sales', password: 'password1234' });
    await expect(
      usersService.create({ email: 'a@ex.com', fullName: 'B', role: 'sales', password: 'password1234' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('lists users by created_at asc', async () => {
    const a = await usersService.create({ email: 'a@ex.com', fullName: 'A', role: 'sales', password: 'password1234' });
    const b = await usersService.create({ email: 'b@ex.com', fullName: 'B', role: 'admin', password: 'password1234' });
    expect(usersService.list().map((x) => x.id)).toEqual([a.id, b.id]);
  });

  it('patches mutable fields and returns updated user', async () => {
    const a = await usersService.create({ email: 'a@ex.com', fullName: 'A', role: 'sales', password: 'password1234' });
    const updated = usersService.patch(a.id, { fullName: 'Alice', active: false });
    expect(updated).toMatchObject({ fullName: 'Alice', active: false });
  });

  it('throws NotFoundError on unknown id', () => {
    expect(() => usersService.patch(9999, { fullName: 'x' })).toThrow(/User not found/);
  });
});
```

Manual tests: deferred to Story 3.2 (routes) — service is not directly exposed.

**Quality**: ESLint 0; Vitest passes; coverage ≥90% on service.

**OUT**:
- ❌ HTTP routes — Story 3.2.
- ❌ Hard-delete users — only soft delete via `active=false` per requirements.
- ❌ Password reset — explicit OUT.
- ❌ Bulk user import — explicit OUT.
- ❌ Self-service password change — out of scope for MVP.

**Evidence**: Vitest output for users.service.test.ts including coverage delta.
