-- 0001_init.sql
-- Initial schema for Mvp-crm: users, leads, digest_runs.
-- Column conventions follow patterns § 1.2 (snake_case columns, TEXT
-- timestamps as ISO-8601 strings). All CHECK constraints and indexes per
-- architecture § Data Model.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','sales')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_name TEXT NOT NULL,
  notes TEXT,
  contact_person TEXT NOT NULL,
  estimated_closing_date TEXT NOT NULL,
  lead_value REAL NOT NULL CHECK (lead_value >= 0),
  stage TEXT NOT NULL DEFAULT 'Evaluating'
    CHECK (stage IN ('Evaluating','Proposing','Solutioning','Complete')),
  owner_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_stage    ON leads(stage);

CREATE TABLE digest_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at TEXT NOT NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cron','manual')),
  recipients_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  failure_count INTEGER NOT NULL,
  notes TEXT
);
