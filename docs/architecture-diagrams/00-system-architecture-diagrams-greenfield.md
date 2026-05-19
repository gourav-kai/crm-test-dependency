# Architecture Diagrams - Mvp-crm

**Source**: `docs/architecture/design/00-system-architecture-greenfield.md`
**Generated**: 2026-05-19

> This file contains Mermaid diagrams extracted from the architecture document for easy preview.
> For full architecture details, refer to the source `.md` file.

---

## System Context Diagram

```mermaid
C4Context
  title System Context Diagram — Mvp-crm

  Person(admin, "Admin", "Sales manager / founder. Full org access.")
  Person(rep, "Salesperson", "Manages own leads only.")

  System(crm, "Mvp-crm", "React SPA + Node API + SQLite. Lead management, analytics, scheduled digest.")

  System_Ext(smtp, "SMTP Provider", "Mailtrap / Gmail / SendGrid via env config")
  System_Ext(browser, "Web Browser", "Chrome / Firefox / Safari")

  Rel(admin, browser, "Uses")
  Rel(rep, browser, "Uses")
  Rel(browser, crm, "HTTPS (localhost) — JSON over REST")
  Rel(crm, smtp, "SMTP (Monday 09:00 + manual trigger)")
```

---

## Component Architecture Diagram

```mermaid
flowchart TB
  subgraph Browser["Browser (React SPA — Vite)"]
    direction TB
    Pages[Pages: Login, Leads, LeadDetail, Dashboard, Users]
    RQ[TanStack Query Cache]
    AuthCtx[Auth Context — JWT in memory + localStorage]
    Pages --> RQ
    Pages --> AuthCtx
  end

  subgraph Backend["Node.js Backend (Express, single process)"]
    direction TB
    Mw[HTTP Middleware: cors, json, pino-http, errorHandler]
    AuthMw[authMiddleware — verifies JWT, attaches req.user]
    RoleMw[requireRole — enforces admin / scoping]

    subgraph Routes
      AuthR[/auth/]
      UsersR[/users/ — admin only]
      LeadsR[/leads/]
      AnalyticsR[/analytics/]
      AdminR[/admin/digest/run/]
    end

    subgraph Services
      AuthSvc[authService]
      UserSvc[userService]
      LeadSvc[leadService — applies role scope]
      AnalyticsSvc[analyticsService]
      DigestSvc[digestService]
    end

    subgraph Repos
      UserRepo[userRepository]
      LeadRepo[leadRepository]
    end

    Scheduler[node-cron Scheduler — Mon 09:00]
    Mailer[Nodemailer Transporter]
    DB[(SQLite — WAL, file-backed)]

    Mw --> AuthMw --> RoleMw --> Routes
    AuthR --> AuthSvc
    UsersR --> UserSvc
    LeadsR --> LeadSvc
    AnalyticsR --> AnalyticsSvc
    AdminR --> DigestSvc
    AuthSvc --> UserRepo
    UserSvc --> UserRepo
    LeadSvc --> LeadRepo
    AnalyticsSvc --> LeadRepo
    DigestSvc --> LeadRepo
    DigestSvc --> UserRepo
    DigestSvc --> Mailer
    Scheduler --> DigestSvc
    UserRepo --> DB
    LeadRepo --> DB
  end

  SMTP[(SMTP Provider)]

  Browser -- "fetch /api/* + Bearer JWT" --> Mw
  Mailer --> SMTP
```

---

## Data Model / ER Diagram

```mermaid
erDiagram
  USERS ||--o{ LEADS : owns
  USERS {
    integer id PK
    text email UK "unique, lowercase"
    text password_hash "bcrypt cost=12"
    text full_name
    text role "admin or sales"
    integer active "1 or 0"
    text created_at "ISO-8601 UTC"
    text updated_at "ISO-8601 UTC"
  }
  LEADS {
    integer id PK
    text opportunity_name "required"
    text notes "nullable"
    text contact_person "required"
    text estimated_closing_date "ISO date, required"
    real lead_value "required, >= 0"
    text stage "Evaluating Proposing Solutioning Complete"
    integer owner_id FK "users.id"
    text created_at "ISO-8601 UTC"
    text updated_at "ISO-8601 UTC"
  }
  DIGEST_RUNS {
    integer id PK
    text run_at "ISO-8601 UTC"
    text triggered_by "cron or manual"
    integer recipients_count
    integer success_count
    integer failure_count
    text notes "JSON of per-recipient errors"
  }
```
