### Story 1.1: Backend Skeleton

**Epic**: 1 - PROJECT FOUNDATION | **ID**: 1.1 | **Date**: 2026-05-19 | **GitHub**: #1
**Requires**: []
**Enables**: [1.4, 2.1]
**Files Touched**:
  - backend/package.json
  - backend/tsconfig.json
  - backend/vitest.config.ts
  - backend/src/server.ts
  - backend/src/app.ts
  - backend/src/config/env.ts
  - backend/src/logger.ts
  - backend/src/http/middleware/errorHandler.ts
  - backend/src/http/middleware/requestId.ts
  - backend/src/http/errors.ts
  - backend/src/routes.ts
  - backend/src/features/_health/health.routes.ts
  - backend/src/features/_health/health.routes.test.ts
  - .env.example
  - tsconfig.base.json
  - .eslintrc.cjs
  - .prettierrc
  - .gitignore
  - package.json
**Assignee**: abhigyan.ranjan@3pillarglobal.com

**Must Read**:
- `docs/requirements.md` — Vision, success criteria, non-functional reqs.
- `docs/architecture/design/00-system-architecture-greenfield.md` — Component architecture, layer responsibilities, error categories, observability.
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — Section 1 (Project Structure), 2 (Error Handling), 3 (Logging), 5 (API Design), 6 (Configuration).

**Description**:
This is the first foundation story for the Mvp-crm backend. It scaffolds the Express application as an npm workspace under `/backend`, sets up TypeScript + Vitest + ESLint + Prettier, builds the composition root (`app.ts` factory + `server.ts` entrypoint), wires the cross-cutting middleware stack (`requestId` → `pino-http` → `cors` → `json` → routes → `errorHandler`), introduces the `AppError` class hierarchy, and exposes a single bare `GET /api/health` endpoint that returns `{ ok: true }`. It does NOT connect to a database (that lands in Story 1.3) and does NOT add any feature routes (those land in their respective epics). The goal is to produce a runnable Express server that satisfies the patterns doc's error envelope, logging, and configuration contracts so that every subsequent feature story can plug in without touching the bootstrap again.

**Acceptance Criteria**:
- `npm install` at the repo root succeeds and installs `/backend` workspace dependencies.
- `npm --workspace backend run dev` starts the API on the port from `env.PORT` (default 4000) and logs a single structured JSON line: `{level:30,msg:"server listening",port:4000,...}`.
- The env loader (`backend/src/config/env.ts`) parses `process.env` via Zod; missing required vars (`JWT_SECRET`, `SMTP_*`) cause the process to exit at boot with a clear validation error (stderr).
- `JWT_SECRET` shorter than 32 characters causes the process to exit at boot.
- `GET http://localhost:4000/api/health` returns `200 { "ok": true }` with `content-type: application/json`.
- `GET http://localhost:4000/api/does-not-exist` returns `404 { "error": { "code": "NOT_FOUND", "message": "Route not found" } }`.
- Any thrown `AppError` subclass is translated by `errorHandler` to its correct HTTP status and error envelope.
- A thrown non-`AppError` returns `500 { "error": { "code": "INTERNAL_ERROR", ... , "reqId": "<uuid>" } }` and is logged at level `error` with the stack.
- Every request log line includes `reqId`, `method`, `url`, `statusCode`, `responseTime` (via `pino-http`).
- `req.headers.authorization`, `password`, `password_hash`, and `*.token` paths are redacted in logs.
- ESLint reports 0 errors on the backend workspace; Prettier check is clean.
- `npm --workspace backend run test` runs Vitest and the `health.routes.test.ts` suite passes; coverage ≥85% on changed files.
- `tsconfig.base.json` exists at the repo root; `backend/tsconfig.json` extends it.
- `.env.example` ships placeholder values for **every** key in the Zod env schema.
- `.env` is in `.gitignore`.

**Prerequisites**: None (root story).

**Context**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — § Component Architecture, § Security Design (error categories).
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — §§ 1, 2, 3, 5, 6.

**Patterns**: Error class hierarchy (Pattern §2.1), centralized handler (§2.2), pino logger config (§3.2), env loader (§6.1), route file shape (§5.1) — all in `docs/architecture/design/01-patterns-and-standards-greenfield.md`.

**Steps**:

1. **Root workspace bootstrap** — at the repo root, create `package.json`:
   ```json
   {
     "name": "mvp-crm",
     "private": true,
     "version": "0.1.0",
     "workspaces": ["backend", "frontend"],
     "scripts": {
       "dev": "concurrently -k -n be,fe -c blue,magenta \"npm --workspace backend run dev\" \"npm --workspace frontend run dev\"",
       "test": "npm --workspaces run test",
       "lint": "npm --workspaces run lint",
       "format:check": "prettier --check ."
     },
     "devDependencies": {
       "concurrently": "^9.0.0",
       "eslint": "^9.0.0",
       "prettier": "^3.3.0",
       "typescript": "^5.5.0"
     }
   }
   ```

2. **Root TypeScript base** — `tsconfig.base.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "Bundler",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "forceConsistentCasingInFileNames": true,
       "noUncheckedIndexedAccess": true,
       "baseUrl": ".",
       "paths": { "@/*": ["src/*"] }
     }
   }
   ```

3. **Root tooling** — `.eslintrc.cjs`, `.prettierrc`, `.gitignore`:
   ```cjs
   // .eslintrc.cjs
   module.exports = {
     root: true,
     parser: '@typescript-eslint/parser',
     plugins: ['@typescript-eslint', 'import'],
     extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
     rules: {
       '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
       'import/order': ['error', { groups: ['builtin', 'external', 'internal', ['parent', 'sibling']], 'newlines-between': 'always' }],
       'no-console': ['error', { allow: ['warn', 'error'] }],
     },
   };
   ```
   ```
   # .prettierrc
   { "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100 }
   ```
   ```gitignore
   # .gitignore
   node_modules
   dist
   coverage
   .env
   backend/data/*.db
   backend/data/*.db-*
   .DS_Store
   ```

4. **Backend workspace `package.json`** — `backend/package.json`:
   ```json
   {
     "name": "@mvp-crm/backend",
     "private": true,
     "version": "0.1.0",
     "type": "module",
     "scripts": {
       "dev": "tsx watch src/server.ts",
       "build": "tsc -p tsconfig.json",
       "start": "node dist/server.js",
       "test": "vitest run --coverage",
       "lint": "eslint src --max-warnings 0"
     },
     "dependencies": {
       "cors": "^2.8.5",
       "dotenv": "^16.4.5",
       "express": "^4.21.0",
       "pino": "^9.4.0",
       "pino-http": "^10.3.0",
       "uuid": "^10.0.0",
       "zod": "^3.23.8"
     },
     "devDependencies": {
       "@types/cors": "^2.8.17",
       "@types/express": "^4.17.21",
       "@types/node": "^20.16.0",
       "@types/uuid": "^10.0.0",
       "@typescript-eslint/eslint-plugin": "^8.0.0",
       "@typescript-eslint/parser": "^8.0.0",
       "supertest": "^7.0.0",
       "@types/supertest": "^6.0.2",
       "tsx": "^4.19.0",
       "vitest": "^2.0.0",
       "@vitest/coverage-v8": "^2.0.0"
     }
   }
   ```

5. **Backend `tsconfig.json`** — `backend/tsconfig.json`:
   ```json
   {
     "extends": "../tsconfig.base.json",
     "compilerOptions": {
       "outDir": "dist",
       "rootDir": "src",
       "types": ["node", "vitest/globals"]
     },
     "include": ["src/**/*"]
   }
   ```

6. **Vitest config** — `backend/vitest.config.ts`:
   ```ts
   import { defineConfig } from 'vitest/config';
   import path from 'node:path';

   export default defineConfig({
     test: {
       environment: 'node',
       globals: true,
       coverage: {
         provider: 'v8',
         reporter: ['text', 'lcov'],
         thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
         exclude: ['src/server.ts', 'src/scripts/**', 'dist/**'],
       },
     },
     resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
   });
   ```

7. **Env loader** — `backend/src/config/env.ts` (full schema, all features pre-declared so future stories don't touch this file again):
   ```ts
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
     DIGEST_CRON: z.string().default('0 9 * * 1'),
     CORS_ORIGIN: z.string().default('http://localhost:5173'),
     SEED_ADMIN_EMAIL: z.string().email().optional(),
     SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
   });

   const parsed = EnvSchema.safeParse(process.env);
   if (!parsed.success) {
     console.error('❌ Invalid environment configuration:');
     console.error(parsed.error.flatten().fieldErrors);
     process.exit(1);
   }
   export const env = parsed.data;
   ```

8. **`.env.example`** — placeholder values for every key (note: SMTP_* placeholders are non-secret stubs that pass validation):
   ```
   NODE_ENV=development
   PORT=4000
   DB_FILE=./data/mvp-crm.db
   JWT_SECRET=replace-me-with-32-plus-random-characters-please
   JWT_TTL_SECONDS=86400
   BCRYPT_COST=12
   LOG_LEVEL=info
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=587
   SMTP_USER=user
   SMTP_PASS=pass
   SMTP_FROM=noreply@mvp-crm.local
   DIGEST_CRON=0 9 * * 1
   CORS_ORIGIN=http://localhost:5173
   ```

9. **Logger** — `backend/src/logger.ts`:
   ```ts
   import pino from 'pino';
   import { env } from './config/env';

   export const logger = pino({
     level: env.LOG_LEVEL,
     redact: {
       paths: ['password', 'password_hash', 'req.headers.authorization', '*.token', '*.jwt'],
       censor: '[REDACTED]',
     },
     base: { service: 'mvp-crm', env: env.NODE_ENV },
   });
   ```

10. **Error classes** — `backend/src/http/errors.ts`:
    ```ts
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
      constructor(message = 'Authentication required') { super('UNAUTHORIZED', 401, message); }
    }
    export class ForbiddenError extends AppError {
      constructor(message = 'Forbidden') { super('FORBIDDEN', 403, message); }
    }
    export class NotFoundError extends AppError {
      constructor(resource = 'Resource') { super('NOT_FOUND', 404, `${resource} not found`); }
    }
    export class ConflictError extends AppError {
      constructor(message: string) { super('CONFLICT', 409, message); }
    }
    ```

11. **Request ID middleware** — `backend/src/http/middleware/requestId.ts`:
    ```ts
    import type { RequestHandler } from 'express';
    import { v4 as uuid } from 'uuid';

    export const requestId: RequestHandler = (req, _res, next) => {
      (req as any).id = req.header('x-request-id') ?? uuid();
      next();
    };
    ```

12. **Error handler middleware** — `backend/src/http/middleware/errorHandler.ts`:
    ```ts
    import type { ErrorRequestHandler } from 'express';
    import { ZodError } from 'zod';
    import { AppError, ValidationError } from '../errors';
    import { logger } from '@/logger';

    export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
      if (err instanceof ZodError) err = new ValidationError(err.flatten());
      const reqId = (req as any).id;
      if (err instanceof AppError) {
        const level = err.status >= 500 ? 'error' : err.status >= 401 ? 'warn' : 'info';
        logger[level]({ err, reqId, path: req.path }, err.message);
        return res.status(err.status).json({
          error: { code: err.code, message: err.message, details: err.details },
        });
      }
      logger.error({ err, reqId, path: req.path }, 'Unhandled error');
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error', reqId },
      });
    };
    ```

13. **Health routes** — `backend/src/features/_health/health.routes.ts`:
    ```ts
    import { Router } from 'express';
    export const healthRouter = Router();
    healthRouter.get('/', (_req, res) => {
      res.json({ ok: true });
    });
    ```

14. **Central route registry** — `backend/src/routes.ts`:
    ```ts
    import { Router } from 'express';
    import { healthRouter } from './features/_health/health.routes';

    export const apiRouter = Router();
    apiRouter.use('/health', healthRouter);
    // Future feature routers mount here (auth, users, leads, analytics, admin).
    ```

15. **App factory** — `backend/src/app.ts`:
    ```ts
    import express from 'express';
    import cors from 'cors';
    import pinoHttp from 'pino-http';
    import { env } from './config/env';
    import { logger } from './logger';
    import { requestId } from './http/middleware/requestId';
    import { errorHandler } from './http/middleware/errorHandler';
    import { NotFoundError } from './http/errors';
    import { apiRouter } from './routes';

    export function buildApp() {
      const app = express();
      app.use(requestId);
      app.use(pinoHttp({ logger, customProps: (req) => ({ reqId: (req as any).id }) }));
      app.use(cors({ origin: env.CORS_ORIGIN }));
      app.use(express.json({ limit: '100kb' }));
      app.use('/api', apiRouter);
      app.use((_req, _res, next) => next(new NotFoundError('Route')));
      app.use(errorHandler);
      return app;
    }
    ```

16. **Server entrypoint** — `backend/src/server.ts`:
    ```ts
    import { buildApp } from './app';
    import { env } from './config/env';
    import { logger } from './logger';

    const app = buildApp();
    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'server listening');
    });
    ```

**Tests**:

```ts
// backend/src/features/_health/health.routes.test.ts
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { buildApp } from '@/app';

describe('GET /api/health', () => {
  const app = buildApp();

  it('returns { ok: true }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 404 with NOT_FOUND envelope on unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 500 INTERNAL_ERROR envelope with reqId on unhandled error', async () => {
    const app2 = buildApp();
    // Inject a route that throws to exercise errorHandler's catch-all path.
    (app2 as any)._router.stack.unshift({
      route: { path: '/api/boom', methods: { get: true } },
      handle: (_req: any, _res: any, next: any) => next(new Error('boom')),
    });
    const res = await request(app2).get('/api/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.reqId).toBeTruthy();
  });
});
```

Manual tests:
- `cp .env.example .env`, edit `JWT_SECRET` to a 32+ char string, then `npm run dev` → backend logs "server listening" on port 4000.
- `curl http://localhost:4000/api/health` → `{"ok":true}`.
- `curl -i http://localhost:4000/api/nope` → `404` with the NOT_FOUND envelope.
- Set `JWT_SECRET=short` in `.env` → `npm run dev` exits with the Zod validation error, no listening log line.

**Quality**: ESLint 0 errors; Prettier clean; Vitest passes; backend workspace coverage ≥85% on changed files; no `console.log` outside config bootstrap (Zod fail path is allowed via `console.error`).

**OUT**:
- ❌ Database client / connection — Story 1.3.
- ❌ Any feature routes (auth, users, leads, analytics, digest) — their respective epics.
- ❌ Auth middleware — Story 2.1.
- ❌ Rate limiter — Story 2.1.
- ❌ Frontend scaffolding — Story 1.2.
- ❌ CI workflow changes — out of scope for this story.

**Evidence**: Paste the output of `npm --workspace backend run test -- --coverage`, the structured log line from a `curl /api/health` run, and the failing-Zod-validation log line.
