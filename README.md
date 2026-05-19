# Mvp-CRM

A lean CRM MVP built with React, Node.js, and SQLite.

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+

### Setup

```bash
# Install dependencies for all workspaces
npm install

# Copy environment template
cp .env.example .env
```

### Development

```bash
# Run backend + frontend in dev mode
npm run dev

# Backend runs on http://localhost:4000
# Frontend runs on http://localhost:5173
```

### Testing

```bash
# Run all tests
npm test

# Run tests for a specific workspace
npm test --workspace backend
npm test --workspace frontend
```

### Linting

```bash
# Lint all workspaces
npm run lint
```

## Architecture

- **Backend**: Express.js + TypeScript + SQLite
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Database**: better-sqlite3 (WAL mode)
- **Auth**: JWT (localStorage)
- **Testing**: Vitest + React Testing Library + Supertest

## Project Structure

See `docs/architecture/design/00-system-architecture-greenfield.md` for detailed architecture.
See `docs/architecture/design/01-patterns-and-standards-greenfield.md` for coding patterns.

## Implementation Status

Track progress in `docs/status.md` and individual story files in `docs/plans/stories/`.
