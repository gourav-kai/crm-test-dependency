### Story 1.2: Frontend Skeleton

**Epic**: 1 - PROJECT FOUNDATION | **ID**: 1.2 | **Date**: 2026-05-19 | **GitHub**: #2
**Requires**: []
**Enables**: [1.4, 2.3]
**Files Touched**:
  - frontend/package.json
  - frontend/tsconfig.json
  - frontend/vite.config.ts
  - frontend/vitest.config.ts
  - frontend/index.html
  - frontend/tailwind.config.ts
  - frontend/postcss.config.cjs
  - frontend/src/main.tsx
  - frontend/src/App.tsx
  - frontend/src/router.tsx
  - frontend/src/api/client.ts
  - frontend/src/ui/AppShell.tsx
  - frontend/src/ui/Button.tsx
  - frontend/src/ui/Card.tsx
  - frontend/src/index.css
  - package.json
**Assignee**: gourav.g@3pillarglobal.com

**Must Read**:
- `docs/requirements.md` — Vision, target users, success criteria.
- `docs/architecture/design/00-system-architecture-greenfield.md` — § Frontend feature folders, § DR-6 (Tailwind), § DR-4 (JWT in localStorage).
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — § 1.1 (repo layout), § 7 (Frontend Patterns).

**Description**:
Scaffolds the Vite + React + TypeScript + Tailwind + React Router + TanStack Query frontend workspace. Produces an `AppShell` component with a top nav (logo + future menu items + active-user slot), wires the QueryClientProvider, RouterProvider, and bootstrap CSS, and ships a thin `api/client.ts` fetch wrapper with `ApiError` handling per § 7.1 of the patterns doc. The router contains only a placeholder home route (`/`) that renders `AppShell` with empty content — Story 1.4 replaces this with the real `HomePage`. There is no auth, no feature pages, no API calls yet. The goal is a runnable Vite dev server, a Tailwind-styled shell, and the three providers in place so every subsequent feature story plugs in without touching `main.tsx`.

**Acceptance Criteria**:
- `npm --workspace frontend run dev` starts Vite on port 5173 with no errors.
- Browsing `http://localhost:5173/` renders the `AppShell` (header with "Mvp-CRM" brand + empty main content area).
- Tailwind utilities work — change a class, hot reload shows the change.
- `frontend/src/api/client.ts` exports `api<T>(path, init?)` and the `ApiError` class as specified in patterns § 7.1.
- `api()` throws `ApiError` (with `code`, `status`, `message`, `details`) on a non-2xx response.
- Vite dev proxies `/api` → `http://localhost:4000` (so frontend-to-backend works without CORS in dev).
- `npm --workspace frontend run test` runs Vitest with jsdom; a smoke test asserting `AppShell` renders the brand passes.
- ESLint 0 errors on the frontend workspace; Prettier check is clean.
- `frontend/tsconfig.json` extends `tsconfig.base.json`; alias `@/*` resolves to `frontend/src/*`.
- Bundle includes Tailwind, Recharts is NOT yet imported (lazy in 5.2), TanStack Query is wired but unused.

**Prerequisites**: None (root story).

**Context**:
- `docs/architecture/design/00-system-architecture-greenfield.md` — Component Architecture (Browser block).
- `docs/architecture/design/01-patterns-and-standards-greenfield.md` — §§ 1, 7.

**Patterns**: API client (§7.1), routing (§7.4), feature folder structure (§1.1) — all in `docs/architecture/design/01-patterns-and-standards-greenfield.md`.

**Steps**:

1. **Frontend `package.json`** — `frontend/package.json`:
   ```json
   {
     "name": "@mvp-crm/frontend",
     "private": true,
     "version": "0.1.0",
     "type": "module",
     "scripts": {
       "dev": "vite",
       "build": "tsc -p tsconfig.json && vite build",
       "preview": "vite preview",
       "test": "vitest run --coverage",
       "lint": "eslint src --max-warnings 0"
     },
     "dependencies": {
       "@tanstack/react-query": "^5.50.0",
       "react": "^18.3.0",
       "react-dom": "^18.3.0",
       "react-router-dom": "^6.26.0"
     },
     "devDependencies": {
       "@testing-library/jest-dom": "^6.5.0",
       "@testing-library/react": "^16.0.0",
       "@types/react": "^18.3.0",
       "@types/react-dom": "^18.3.0",
       "@vitejs/plugin-react": "^4.3.0",
       "autoprefixer": "^10.4.20",
       "jsdom": "^25.0.0",
       "postcss": "^8.4.45",
       "tailwindcss": "^3.4.0",
       "typescript": "^5.5.0",
       "vite": "^5.4.0",
       "vitest": "^2.0.0",
       "@vitest/coverage-v8": "^2.0.0"
     }
   }
   ```

2. **`frontend/vite.config.ts`** — dev server with `/api` proxy:
   ```ts
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import path from 'node:path';

   export default defineConfig({
     plugins: [react()],
     resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
     server: {
       port: 5173,
       proxy: { '/api': 'http://localhost:4000' },
     },
   });
   ```

3. **`frontend/vitest.config.ts`** — jsdom + coverage thresholds:
   ```ts
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   import path from 'node:path';

   export default defineConfig({
     plugins: [react()],
     resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./src/test/setup.ts'],
       coverage: {
         provider: 'v8',
         reporter: ['text', 'lcov'],
         thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
         exclude: ['src/main.tsx', 'src/test/**', 'dist/**'],
       },
     },
   });
   ```

4. **`frontend/tsconfig.json`**:
   ```json
   {
     "extends": "../tsconfig.base.json",
     "compilerOptions": {
       "jsx": "react-jsx",
       "lib": ["ES2022", "DOM", "DOM.Iterable"],
       "types": ["vitest/globals", "@testing-library/jest-dom"],
       "outDir": "dist",
       "rootDir": "src"
     },
     "include": ["src/**/*"]
   }
   ```

5. **Tailwind** — `frontend/tailwind.config.ts` + `postcss.config.cjs` + `src/index.css`:
   ```ts
   // tailwind.config.ts
   import type { Config } from 'tailwindcss';
   export default {
     content: ['./index.html', './src/**/*.{ts,tsx}'],
     theme: {
       extend: {
         colors: {
           brand: { DEFAULT: '#1976D2', dark: '#125ea8' },
           danger: '#F44336',
         },
       },
     },
     plugins: [],
   } satisfies Config;
   ```
   ```cjs
   // postcss.config.cjs
   module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
   ```
   ```css
   /* src/index.css */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

6. **API client** — `frontend/src/api/client.ts` (per patterns § 7.1):
   ```ts
   const BASE = '/api';

   export class ApiError extends Error {
     constructor(
       public code: string,
       public status: number,
       message: string,
       public details?: unknown,
     ) {
       super(message);
     }
   }

   export async function api<T>(
     path: string,
     init: RequestInit & { auth?: boolean } = {},
   ): Promise<T> {
     const headers = new Headers(init.headers);
     if (!headers.has('Content-Type') && init.body) {
       headers.set('Content-Type', 'application/json');
     }
     if (init.auth !== false) {
       const token = localStorage.getItem('mvp-crm-token');
       if (token) headers.set('Authorization', `Bearer ${token}`);
     }
     const res = await fetch(`${BASE}${path}`, { ...init, headers });
     if (!res.ok) {
       const body = await res.json().catch(() => ({}));
       throw new ApiError(
         body?.error?.code ?? 'HTTP_ERROR',
         res.status,
         body?.error?.message ?? res.statusText,
         body?.error?.details,
       );
     }
     return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
   }
   ```

7. **UI primitives** — `frontend/src/ui/Button.tsx`, `Card.tsx`:
   ```tsx
   // Button.tsx
   import type { ButtonHTMLAttributes } from 'react';
   type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' };
   export function Button({ variant = 'primary', className = '', ...rest }: Props) {
     const base = 'px-4 py-2 rounded-md text-sm font-semibold transition';
     const styles = variant === 'primary'
       ? 'bg-brand text-white hover:bg-brand-dark disabled:opacity-50'
       : 'text-brand hover:bg-brand/10';
     return <button className={`${base} ${styles} ${className}`} {...rest} />;
   }
   ```
   ```tsx
   // Card.tsx
   import type { ReactNode } from 'react';
   export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
     return <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>{children}</div>;
   }
   ```

8. **AppShell** — `frontend/src/ui/AppShell.tsx`:
   ```tsx
   import type { ReactNode } from 'react';

   export function AppShell({ children }: { children: ReactNode }) {
     return (
       <div className="min-h-screen bg-gray-50">
         <header className="bg-white border-b border-gray-200">
           <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
             <span className="text-lg font-bold text-brand">Mvp-CRM</span>
             <nav className="flex gap-4 text-sm text-gray-600" aria-label="primary">
               {/* feature stories add nav links here */}
             </nav>
           </div>
         </header>
         <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
       </div>
     );
   }
   ```

9. **Router** — `frontend/src/router.tsx`:
   ```tsx
   import { createBrowserRouter } from 'react-router-dom';
   import { AppShell } from './ui/AppShell';

   export const router = createBrowserRouter([
     {
       path: '/',
       element: <AppShell><div /></AppShell>,
     },
   ]);
   ```

10. **App + entrypoint** — `frontend/src/App.tsx`, `frontend/src/main.tsx`:
    ```tsx
    // App.tsx
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { RouterProvider } from 'react-router-dom';
    import { router } from './router';

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
    });

    export function App() {
      return (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );
    }
    ```
    ```tsx
    // main.tsx
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import { App } from './App';
    import './index.css';

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode><App /></React.StrictMode>,
    );
    ```

11. **`frontend/index.html`**:
    ```html
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Mvp-CRM</title>
      </head>
      <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
    </html>
    ```

12. **Test setup file** — `frontend/src/test/setup.ts`:
    ```ts
    import '@testing-library/jest-dom/vitest';
    ```

**Tests**:

```tsx
// frontend/src/ui/AppShell.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders the brand', () => {
    render(<AppShell><div>hello</div></AppShell>);
    expect(screen.getByText('Mvp-CRM')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('exposes a navigation landmark', () => {
    render(<AppShell><div /></AppShell>);
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
  });
});
```

Manual tests:
- `cp .env.example .env` (root), `npm install`, `npm --workspace frontend run dev` → Vite opens on 5173.
- Brand visible; Tailwind colors render (`text-brand` shows blue).
- `curl http://localhost:5173/api/health` proxies to backend (will fail until 1.1 is up — proxy works, target down).

**Quality**: ESLint 0 errors, Prettier clean, Vitest passes, coverage ≥85% on changed files, no `console.log`.

**OUT**:
- ❌ Any feature pages (login, leads, users, dashboard) — their respective epics.
- ❌ Auth state / providers — Story 2.3.
- ❌ Calling `/api/health` from the home page — Story 1.4.
- ❌ Recharts import — Story 5.2 (lazy).
- ❌ MSW setup — Story 2.4.

**Evidence**: Screenshot of `http://localhost:5173/` showing the branded shell, output of `npm --workspace frontend run test -- --coverage`.
