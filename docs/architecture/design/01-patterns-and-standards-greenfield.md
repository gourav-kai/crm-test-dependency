# Patterns & Standards - Mvp-crm

**Date**: 2026-05-19
**Author**: ARCHITECT
**Status**: Draft
**Version**: 1.0

> Source of truth for code organization, naming, error handling, logging, DB access, API design, configuration, testing, and the **File/Module Boundary Map** used by `aire-greenfield-plan` to populate `dependency-graph.yml`.

---

## 1. Project Structure

### 1.1 Repository layout (npm workspaces)

```
mvp-crm/
├── package.json                  # workspace root (private, "workspaces": ["backend","frontend"])
├── tsconfig.base.json            # shared TS compiler options
├── .env.example                  # template; .env is gitignored
├── .eslintrc.cjs
├── .prettierrc
├── README.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── data/                     # SQLite file lives here (gitignored)
│   ├── migrations/               # 0001_init.sql, 0002_*.sql ...
│   └── src/
│       ├── server.ts             # composition root: builds app + scheduler, listens
│       ├── app.ts                # express app factory (testable, no .listen)
│       ├── config/
│       │   └── env.ts            # zod-validated env loader
│       ├── db/
│       │   ├── client.ts         # better-sqlite3 singleton + pragmas
│       │   └── migrate.ts        # numbered-file runner
│       ├── http/
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── requireRole.ts
│       │   │   ├── errorHandler.ts
│       │   │   └── requestId.ts
│       │   └── errors.ts         # AppError class hierarchy
│       ├── features/
│       │   ├── auth/
│       │   │   ├── auth.routes.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── auth.schemas.ts   # Zod schemas
│       │   │   └── auth.service.test.ts
│       │   ├── users/
│       │   │   ├── users.routes.ts
│       │   │   ├── users.service.ts
│       │   │   ├── users.repository.ts
│       │   │   ├── users.schemas.ts
│       │   │   └── *.test.ts
│       │   ├── leads/
│       │   │   ├── leads.routes.ts
│       │   │   ├── leads.service.ts
│       │   │   ├── leads.repository.ts
│       │   │   ├── leads.schemas.ts
│       │   │   └── *.test.ts
│       │   ├── analytics/
│       │   │   ├── analytics.routes.ts
│       │   │   ├── analytics.service.ts
│       │   │   └── *.test.ts
│       │   └── digest/
│       │       ├── digest.routes.ts      # /admin/digest/*
│       │       ├── digest.service.ts
│       │       ├── digest.scheduler.ts   # node-cron wiring
│       │       ├── digest.repository.ts  # digest_runs table
│       │       ├── mailer.ts             # nodemailer transporter factory
│       │       └── *.test.ts
│       ├── routes.ts             # central route registry — mounts every feature router
│       ├── logger.ts             # pino instance
│       └── types/
│           └── express.d.ts      # augments req.user
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vitest.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── router.tsx
        ├── api/
        │   └── client.ts         # fetch wrapper with JWT
        ├── features/
        │   ├── auth/             # AuthProvider, LoginPage, useAuth
        │   ├── leads/            # LeadsListPage, LeadFormPage, useLeads
        │   ├── users/            # UsersAdminPage, useUsers (admin only)
        │   └── dashboard/        # DashboardPage, charts
        ├── ui/                   # Button, Input, Card, Table, EmptyState, Toast
        ├── types/                # shared TS types matching API contracts
        └── utils/
```

### 1.2 Naming conventions

| Asset | Convention | Example |
|-------|-----------|---------|
| Files (code) | `kebab-case.ts` for shared, `dot.kind.ts` for feature files | `users.service.ts`, `error-handler.ts` |
| React components | `PascalCase.tsx` matching exported component | `LeadFormPage.tsx` |
| Test files | sibling to source, `.test.ts(x)` | `leads.service.test.ts` |
| Folders | `kebab-case` lowercase | `architecture-diagrams/` |
| TS variables / functions | `camelCase` | `getActiveLeads()` |
| TS types / classes / Zod schemas | `PascalCase` | `Lead`, `LeadCreateSchema` |
| Zod schemas | suffix `Schema` | `LoginSchema` |
| TS constants (true constants) | `SCREAMING_SNAKE_CASE` | `JWT_TTL_SECONDS` |
| SQL tables | `snake_case` plural | `leads`, `digest_runs` |
| SQL columns | `snake_case` | `owner_id`, `estimated_closing_date` |
| Stage enum values | exact strings | `Evaluating`, `Proposing`, `Solutioning`, `Complete` |
| API paths | `kebab-case`, lowercase | `/api/admin/digest/run` |
| Env vars | `SCREAMING_SNAKE_CASE` | `SMTP_HOST` |
| Migrations | `NNNN_short-description.sql` | `0003_add-digest-runs.sql` |

### 1.3 Import order (enforced by ESLint `import/order`)

```ts
// 1. node built-ins
import path from 'node:path';
// 2. external packages
import express from 'express';
import { z } from 'zod';
// 3. internal absolute (aliased `@/`)
import { logger } from '@/logger';
import { db } from '@/db/client';
// 4. parent/sibling
import { LoginSchema } from './auth.schemas';
// 5. types-only imports last, grouped
import type { Request, Response } from 'express';
```

### 1.4 File length and shape

- Soft max **200 lines** per file. If you exceed it, split by responsibility.
- One default export per React component file. **Service / repository files use named exports only** — easier to refactor, no rename ambiguity.
- No barrel `index.ts` files (they hide dependencies and break tree-shaking).

### 1.5 Dependency management

- All deps installed at the **workspace they're used in**, not at the root, except `eslint`, `prettier`, `typescript`, `concurrently`, and `vitest` (shared dev deps go at root).
- `^` for libraries we trust; **pin exact versions** for security-critical deps: `bcrypt`, `jsonwebtoken`, `better-sqlite3`.
- Renovate / dependabot is out of scope for MVP — review deps quarterly.

---

## 2. Error Handling

### 2.1 Error class hierarchy

```ts
// backend/src/http/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown, message = 'Validation failed') {
    super('VALIDATION_ERROR', 422, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', 404, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message);
  }
}
```

### 2.2 Centralized handler

```ts
// backend/src/http/middleware/errorHandler.ts
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors';
import { logger } from '@/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Normalize Zod errors at the boundary
  if (err instanceof ZodError) {
    err = new ValidationError(err.flatten());
  }

  if (err instanceof AppError) {
    const level = err.status >= 500 ? 'error' : err.status >= 401 ? 'warn' : 'info';
    logger[level]({ err, reqId: req.id, userId: req.user?.id, path: req.path }, err.message);
    return res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  logger.error({ err, reqId: req.id, userId: req.user?.id, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error', reqId: req.id },
  });
};
```

### 2.3 Usage rules

**✅ DO** — throw a typed `AppError` subclass from services; let middleware translate.

```ts
// good
async function getLeadForUser(id: number, user: AuthedUser): Promise<Lead> {
  const lead = leadRepository.findById(id);
  if (!lead) throw new NotFoundError('Lead');
  if (user.role !== 'admin' && lead.owner_id !== user.id) {
    throw new NotFoundError('Lead'); // return 404 not 403 to avoid ID enumeration
  }
  return lead;
}
```

**❌ DON'T** — `try/catch` and return HTTP responses from services.

```ts
// bad — service doing HTTP work
async function getLead(id: number, res: Response) {
  try { /* ... */ } catch { res.status(500).send('oops'); } // ❌
}
```

**❌ DON'T** — swallow errors silently.

```ts
try { await mailer.send(msg); } catch { /* ignore */ } // ❌ — log AND record in digest_runs
```

### 2.4 The digest job is the only exception

Per-recipient `try/catch` is required (one failure must not abort the run). Failures are recorded in `digest_runs.notes` and logged at `error`. The cron-level `try/catch` protects the process.

```ts
for (const recipient of recipients) {
  try {
    await mailer.send(buildMessage(recipient));
    successCount++;
  } catch (err) {
    failureCount++;
    failures.push({ recipientId: recipient.id, error: String(err) });
    logger.error({ err, recipientId: recipient.id }, 'digest send failed');
  }
}
```

---

## 3. Logging

### 3.1 Levels and intent

| Level | Use for |
|-------|---------|
| `fatal` | Never — process is going down (only `unhandledRejection` handlers) |
| `error` | 5xx responses, scheduler failures, unrecoverable IO errors |
| `warn` | 4xx ≥ 401, validation rejects from authed users, retried operations |
| `info` | HTTP request log, server start, scheduler tick, digest run summary |
| `debug` | Local development tracing; off by default |

### 3.2 Configuration

```ts
// backend/src/logger.ts
import pino from 'pino';
import { env } from './config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'password',
      'password_hash',
      'req.headers.authorization',
      '*.token',
      '*.jwt',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 'mvp-crm', env: env.NODE_ENV },
});
```

### 3.3 What to log

**✅ DO** include: `reqId`, `userId` when authed, `path`, `method`, `statusCode`, `durationMs`, error object.

```ts
logger.info({ reqId, userId, leadId: lead.id }, 'lead created');
```

**❌ DON'T** log: passwords, password hashes, JWTs, SMTP credentials, full request bodies, full email contents (subject + recipient is fine).

### 3.4 HTTP request log

```ts
import pinoHttp from 'pino-http';
app.use(pinoHttp({ logger, customProps: (req) => ({ userId: req.user?.id }) }));
```

---

## 4. Database Access

### 4.1 Connection (single shared `better-sqlite3` instance)

```ts
// backend/src/db/client.ts
import Database from 'better-sqlite3';
import { env } from '@/config/env';
export const db = new Database(env.DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
```

### 4.2 Repository pattern

Repositories own SQL. **Prepared statements cached** at module load — never build SQL via string concat.

```ts
// backend/src/features/leads/leads.repository.ts
import { db } from '@/db/client';
import type { Lead, LeadStage } from './leads.types';

const selectAllForOwner = db.prepare<{ owner_id: number }>(
  'SELECT * FROM leads WHERE owner_id = :owner_id ORDER BY updated_at DESC',
);
const selectAll = db.prepare('SELECT * FROM leads ORDER BY updated_at DESC');
const insert = db.prepare(`
  INSERT INTO leads (opportunity_name, notes, contact_person, estimated_closing_date,
                     lead_value, stage, owner_id, created_at, updated_at)
  VALUES (:opportunity_name, :notes, :contact_person, :estimated_closing_date,
          :lead_value, :stage, :owner_id, :now, :now)
`);

export const leadRepository = {
  listForUser(user: { id: number; role: 'admin' | 'sales' }): Lead[] {
    return user.role === 'admin'
      ? (selectAll.all() as Lead[])
      : (selectAllForOwner.all({ owner_id: user.id }) as Lead[]);
  },
  create(input: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Lead {
    const now = new Date().toISOString();
    const info = insert.run({ ...input, now });
    return { id: Number(info.lastInsertRowid), ...input, created_at: now, updated_at: now };
  },
};
```

### 4.3 Transactions

```ts
const createUserWithLead = db.transaction((user, lead) => {
  const u = userRepository.create(user);
  return leadRepository.create({ ...lead, owner_id: u.id });
});
```

`db.transaction()` returns a wrapped function — call it like any other; rollback is automatic on throw.

### 4.4 Migrations

- Pure SQL files in `backend/migrations/NNNN_*.sql`.
- Runner reads applied migrations from `_migrations(id, name, applied_at)`, applies new ones in a transaction.
- **One concern per migration** (don't bundle a column add with a data backfill into the same file).
- Migrations are **append-only**. Never edit a migration that's been applied.

### 4.5 Rules

**✅ DO** — bind every input as a parameter.

```ts
db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
```

**❌ DON'T** — interpolate.

```ts
db.exec(`SELECT * FROM leads WHERE id = ${id}`); // ❌ SQL injection
```

**❌ DON'T** — write SQL outside the `*.repository.ts` files. Services call repositories, not the DB.

---

## 5. API Design

### 5.1 Route file shape

```ts
// backend/src/features/leads/leads.routes.ts
import { Router } from 'express';
import { LeadCreateSchema, LeadUpdateSchema } from './leads.schemas';
import { leadService } from './leads.service';

export const leadsRouter = Router();

leadsRouter.post('/', async (req, res) => {
  const input = LeadCreateSchema.parse(req.body);     // throws ZodError → 422
  const lead = leadService.create(input, req.user!);
  res.status(201).json(lead);
});

leadsRouter.get('/:id(\\d+)', async (req, res) => {
  const lead = leadService.getById(Number(req.params.id), req.user!);
  res.json(lead);
});
```

### 5.2 Zod schemas as the contract

```ts
// backend/src/features/leads/leads.schemas.ts
import { z } from 'zod';
export const STAGES = ['Evaluating', 'Proposing', 'Solutioning', 'Complete'] as const;
export const LeadStageSchema = z.enum(STAGES);

export const LeadCreateSchema = z.object({
  opportunityName: z.string().min(1).max(200),
  contactPerson: z.string().min(1).max(200),
  estimatedClosingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leadValue: z.number().nonnegative(),
  notes: z.string().max(5000).optional(),
});
export type LeadCreateInput = z.infer<typeof LeadCreateSchema>;
```

### 5.3 Response shape

Success: bare resource or `{ data: [...] }` for collections — pick one and stick with it. We pick **bare resource**: `GET /leads` returns `Lead[]`, `GET /leads/:id` returns `Lead`. Lists never include metadata for MVP (no pagination yet).

Error: always
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {...} } }
```

### 5.4 Authentication wiring

```ts
// backend/src/app.ts
app.use('/api/auth', authRouter);              // public + GET /me (protected within router)
app.use('/api', authMiddleware);               // everything below is authed
app.use('/api/users', requireRole('admin'), usersRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', requireRole('admin'), adminRouter);
```

### 5.5 Camel/snake mapping

- HTTP wire format: **camelCase** (`opportunityName`)
- DB columns: **snake_case** (`opportunity_name`)
- Mapping happens in the **repository** layer (single conversion point):

```ts
function rowToLead(row: any): Lead {
  return {
    id: row.id,
    opportunityName: row.opportunity_name,
    contactPerson: row.contact_person,
    estimatedClosingDate: row.estimated_closing_date,
    leadValue: row.lead_value,
    stage: row.stage,
    notes: row.notes,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

### 5.6 Rules

**✅ DO** — validate every body with Zod at the route entry. Services trust their inputs.
**✅ DO** — return 404 (not 403) when a Salesperson tries to access another user's lead, to prevent ID enumeration.
**❌ DON'T** — perform business logic in routes. Routes parse + delegate, that's it.
**❌ DON'T** — accept partial validation. Use `.strict()` on schemas that should reject unknown keys.

---

## 6. Configuration

### 6.1 Env loader (single source of truth)

```ts
// backend/src/config/env.ts
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DB_FILE: z.string().default('./data/mvp-crm.db'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be ≥ 32 chars'),
  JWT_TTL_SECONDS: z.coerce.number().default(60 * 60 * 24),
  BCRYPT_COST: z.coerce.number().int().min(10).default(12),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug']).default('info'),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string().email(),
  DIGEST_CRON: z.string().default('0 9 * * 1'),  // Mon 09:00
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
});

export const env = EnvSchema.parse(process.env);
```

If validation fails the process **exits at boot** — no half-configured runtime.

### 6.2 `.env.example` ships with placeholder values; `.env` is gitignored.

### 6.3 Frontend env

Only `VITE_*`-prefixed vars are exposed to the bundle. For MVP we expose **none** — the frontend talks to a relative `/api` (Vite dev proxy).

### 6.4 Secret rules

- Never `console.log(env)` or anything that includes secrets.
- Pino redacts request headers; do not add a log of `env` anywhere.
- `JWT_SECRET` must be ≥ 32 chars. CI fails the boot otherwise.

---

## 7. Frontend Patterns

### 7.1 API client

```ts
// frontend/src/api/client.ts
const BASE = '/api';
export async function api<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (init.auth !== false) {
    const token = localStorage.getItem('mvp-crm-token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body?.error?.code ?? 'HTTP_ERROR', res.status, body?.error?.message ?? res.statusText, body?.error?.details);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
export class ApiError extends Error {
  constructor(public code: string, public status: number, message: string, public details?: unknown) {
    super(message);
  }
}
```

### 7.2 TanStack Query hooks per feature

```ts
// frontend/src/features/leads/api.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Lead, LeadCreateInput } from '@/types';

export const leadsKeys = {
  all: ['leads'] as const,
  list: (filter: { stage?: string; search?: string }) => [...leadsKeys.all, 'list', filter] as const,
  detail: (id: number) => [...leadsKeys.all, 'detail', id] as const,
};

export function useLeads(filter: { stage?: string; search?: string }) {
  return useQuery({
    queryKey: leadsKeys.list(filter),
    queryFn: () =>
      api<Lead[]>(`/leads?${new URLSearchParams(filter as Record<string, string>)}`),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadCreateInput) =>
      api<Lead>('/leads', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadsKeys.all }),
  });
}
```

### 7.3 Component rules

- Components receive **data via props or query hooks**, not via context (except auth).
- No `useEffect` for data fetching — use TanStack Query.
- Forms use **React Hook Form + Zod resolver**, sharing the same Zod schema as the backend (one source of truth, shipped via a small `frontend/src/types/schemas.ts` mirror — generated by hand for MVP, type-only).
- Page components live under `features/<x>/pages/`; reusable UI under `ui/`.

### 7.4 Routing

```tsx
// frontend/src/router.tsx
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth />, // redirects to /login if no token
    children: [
      { index: true, element: <Navigate to="/leads" /> },
      { path: 'leads', element: <LeadsListPage /> },
      { path: 'leads/new', element: <LeadFormPage mode="create" /> },
      { path: 'leads/:id', element: <LeadFormPage mode="edit" /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'users', element: <RequireRole role="admin"><UsersAdminPage /></RequireRole> },
    ],
  },
]);
```

---

## 8. Testing Patterns

### 8.1 Test runner: Vitest in both workspaces

- Backend: `vitest run --coverage` — uses Node environment + Supertest for HTTP tests.
- Frontend: `vitest run --coverage` — uses jsdom + React Testing Library + MSW for API mocks.

### 8.2 Unit test structure (AAA + naming)

```ts
// backend/src/features/leads/leads.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, makeUser, makeLead } from '@/test/factories';
import { leadService } from './leads.service';

describe('leadService.getById', () => {
  beforeEach(resetDb);

  it('returns the lead when the requester owns it', () => {
    // Arrange
    const alice = makeUser({ role: 'sales' });
    const lead = makeLead({ owner_id: alice.id });

    // Act
    const result = leadService.getById(lead.id, alice);

    // Assert
    expect(result.id).toBe(lead.id);
  });

  it('throws NotFoundError when a Salesperson requests another rep\'s lead', () => {
    const alice = makeUser({ role: 'sales' });
    const bob = makeUser({ role: 'sales' });
    const lead = makeLead({ owner_id: alice.id });
    expect(() => leadService.getById(lead.id, bob)).toThrow(/not found/i);
  });

  it('returns the lead for an admin regardless of owner', () => {
    const admin = makeUser({ role: 'admin' });
    const alice = makeUser({ role: 'sales' });
    const lead = makeLead({ owner_id: alice.id });
    expect(leadService.getById(lead.id, admin).id).toBe(lead.id);
  });
});
```

### 8.3 Naming convention

- `describe('<unit>')` — class/function/component name only
- `it('<behavior in plain English>')` — present tense, no "should"
- One assertion per behavior; multi-assert OK if asserting one logical fact

### 8.4 Mocking strategy

- **Pure logic**: no mocks. Pass plain objects.
- **DB-touching tests**: use a **real in-memory SQLite** (`new Database(':memory:')` + migrations applied in `beforeAll`). Faster than mocks, asserts real SQL.
- **HTTP boundary**: Supertest against the `app` factory (not `server.ts`).
- **External services** (SMTP): inject a fake `Mailer` via constructor / module factory. Never mock `nodemailer` itself with `vi.mock`.
- **Frontend**: MSW request handlers, not `vi.mock('fetch')`.

### 8.5 Integration test pattern

```ts
// backend/src/features/leads/leads.routes.int.test.ts
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '@/app';
import { resetDb, makeUser, tokenFor } from '@/test/factories';

describe('POST /api/leads', () => {
  const app = buildApp({ /* override SMTP, scheduler */ });
  beforeEach(resetDb);

  it('creates a lead owned by the authed Salesperson', async () => {
    const rep = makeUser({ role: 'sales' });
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${tokenFor(rep)}`)
      .send({ opportunityName: 'Acme', contactPerson: 'Jane Doe',
              estimatedClosingDate: '2026-12-01', leadValue: 5000 });
    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe(rep.id);
  });

  it('returns 404 when a Salesperson reads another rep\'s lead', async () => {
    const alice = makeUser({ role: 'sales' });
    const bob = makeUser({ role: 'sales' });
    const lead = makeLead({ owner_id: alice.id });
    const res = await request(app).get(`/api/leads/${lead.id}`).set('Authorization', `Bearer ${tokenFor(bob)}`);
    expect(res.status).toBe(404);
  });
});
```

### 8.6 Coverage requirements

| Target | Threshold | Enforcement |
|--------|-----------|-------------|
| Backend lines/branches/functions | **≥ 85%** | Vitest `--coverage.thresholds.lines=85` etc., fails CI |
| Frontend lines/branches/functions | **≥ 85%** | Same |
| Critical files (services, middleware, repositories) | **≥ 90%** | Per-file threshold |
| Throwaway scripts (`seed.ts`, `migrate.ts` CLI shells) | exempt | Excluded via `coverage.exclude` |

### 8.7 What to test / skip

**Test**:
- Every service method's happy + failure paths
- Every middleware (auth, requireRole, errorHandler)
- Every repository query against in-memory SQLite
- Every route's contract via Supertest (200 + main error responses)
- Role-isolation: two-user fixtures asserting cross-rep returns 404
- Frontend pages: render + main user flow (login → list leads → create lead)

**Skip**:
- Trivial getters / pure mappers (covered transitively)
- Third-party library internals
- The cron schedule string itself (it's config, not logic — but test the digest job by invoking it directly)

---

## 9. Documentation Standards

### 9.1 Code comments

Default to **no comments**. Add a comment only when the WHY is non-obvious:
- Hidden constraint (e.g. "node-cron uses server-local TZ — see DR-3")
- Workaround for a known library bug (link the issue)
- Surprising invariant a reader couldn't infer

**❌ DON'T** write what the code does:
```ts
// increment count
count++;
```

### 9.2 Function documentation

JSDoc only on **public exported** functions where types alone don't tell the full story.

```ts
/**
 * Sends the weekly digest to each active Salesperson with at least one
 * non-Complete lead. Per-recipient failures are recorded in digest_runs
 * and do NOT abort the run. Returns aggregate counts.
 */
export async function runWeeklyDigest(opts: { triggeredBy: 'cron' | 'manual' }): Promise<DigestRunSummary> { /* ... */ }
```

### 9.3 README structure (root)

1. What it is (1 paragraph)
2. Quick start (`npm install`, `npm run seed`, `npm run dev`)
3. Project layout (link to this patterns doc)
4. Environment variables (link to `.env.example`)
5. Common scripts table
6. Architecture link (`docs/architecture/`)

### 9.4 API documentation

For MVP, the Zod schemas + the API contract table in the architecture doc are the source of truth. Swagger/OpenAPI is out of scope.

---

## 10. File/Module Boundary Map

> Authoritative input for `aire-greenfield-plan` to populate `dependency-graph.yml`'s `files_touched` and `shared_files` for each story. **This is the contract that decides which stories can be parallelized.**

### 10.1 Concern ownership

| Concern | Owning files / globs |
|---------|----------------------|
| **auth** | `backend/src/features/auth/**`, `backend/src/http/middleware/auth.ts`, `frontend/src/features/auth/**` |
| **users (admin)** | `backend/src/features/users/**`, `frontend/src/features/users/**` |
| **leads** | `backend/src/features/leads/**`, `frontend/src/features/leads/**` |
| **analytics** | `backend/src/features/analytics/**`, `frontend/src/features/dashboard/**` |
| **digest** | `backend/src/features/digest/**` |
| **role-gating** | `backend/src/http/middleware/requireRole.ts` |
| **error envelope** | `backend/src/http/middleware/errorHandler.ts`, `backend/src/http/errors.ts` |
| **logging** | `backend/src/logger.ts`, `backend/src/http/middleware/requestId.ts` |
| **db client + migrations runner** | `backend/src/db/**` |
| **env / config** | `backend/src/config/env.ts`, `.env.example` |
| **shared UI primitives** | `frontend/src/ui/**` |
| **api client (frontend)** | `frontend/src/api/client.ts`, `frontend/src/types/**` |
| **routing (frontend)** | `frontend/src/router.tsx`, `frontend/src/App.tsx`, `frontend/src/main.tsx` |

### 10.2 `shared_files` — serialize cross-concern edits

These files are touched by multiple concerns. Stories that modify them **cannot run in parallel with each other** even if their logical concerns don't overlap:

| File | Why shared |
|------|-----------|
| `backend/package.json` | Adding dependencies for any feature |
| `frontend/package.json` | Same |
| `package.json` (root) | Workspace scripts |
| `backend/src/routes.ts` | Central route registry — every new feature router mounts here |
| `backend/src/app.ts` | Composition root — feature wiring lives here |
| `backend/src/server.ts` | Startup ordering (scheduler init) |
| `backend/migrations/*` | Migration ordering — `0003_*` must not be written in parallel with another `0003_*` |
| `frontend/src/router.tsx` | Every new page mounts a route here |
| `frontend/src/main.tsx` / `App.tsx` | Provider wiring (QueryClient, AuthProvider, RouterProvider) |
| `backend/src/types/express.d.ts` | Type augmentation for `req.user` |
| `tsconfig.base.json`, `.eslintrc.cjs`, `.prettierrc` | Project-wide tooling |
| `README.md` | Cross-feature doc updates |

### 10.3 Unavoidable cross-concern files (with rationale)

- `backend/src/routes.ts` and `frontend/src/router.tsx` — central mount points are intentional to keep a single auditable map of all routes. Alternative (auto-discovery) is harder to reason about and breaks tree-shaking.
- `backend/src/app.ts` — composition root must own the middleware order (`requestId → pinoHttp → cors → json → auth → routes → errorHandler`). Splitting it creates coupling without simplifying.
- `backend/migrations/*` — file ordering is the migration contract. Conflict resolution is rebase + renumber, not parallel append.

### 10.4 Parallelization implications

The plan workflow should treat these as **safe to parallelize** when no `shared_files` overlap and concerns differ:
- `leads` ↔ `users` ↔ `analytics` ↔ `digest` feature stories (assuming each is one PR per story)

These **must serialize**:
- Any two stories that mount a new route (both touch `routes.ts` + `app.ts`)
- Any two stories that add a migration (both touch `backend/migrations/`)
- Any two stories that add a new frontend page (both touch `router.tsx`)

The plan workflow's wave assignment honors this map verbatim.

---

## 11. Quality Checklist (per PR)

Before requesting review on a PR, every author must confirm:

- [ ] All new code is under 200 lines per file (or the file split is justified in the PR description)
- [ ] No `console.log` outside test fixtures — use `logger`
- [ ] No `any` in new code without `// eslint-disable-next-line` + reason
- [ ] No unused imports / variables (ESLint clean)
- [ ] Prettier clean (`npm run format:check`)
- [ ] Vitest passes locally (`npm test`)
- [ ] Coverage on changed files ≥ 85%
- [ ] If schema changed: a new migration file added, never an in-place edit
- [ ] If a new route added: registered in `backend/src/routes.ts`, auth middleware applied, Zod schema present, error envelope used
- [ ] If a new page added: registered in `frontend/src/router.tsx`, `RequireAuth` / `RequireRole` applied as needed
- [ ] If sensitive data introduced: pino redact paths updated
- [ ] PR description references the story / issue number from GitHub Project #9
- [ ] CODEOWNERS reviewer approved (per branch protection)

---

## 12. Anti-patterns (forbidden)

- ❌ Raw SQL in services or routes
- ❌ Business logic in routes
- ❌ String-concat SQL
- ❌ Trusting client-supplied `ownerId` / `role` — server derives both from JWT
- ❌ Returning 403 on a Salesperson reading another rep's lead — always 404
- ❌ `dangerouslySetInnerHTML`
- ❌ Storing tokens in cookies for this MVP (DR-4)
- ❌ Editing applied migrations
- ❌ Barrel `index.ts` re-exports
- ❌ `vi.mock('better-sqlite3')` or `vi.mock('nodemailer')` — inject fakes via DI instead
- ❌ Catch-and-swallow on the digest send path — always log + record in `digest_runs`
