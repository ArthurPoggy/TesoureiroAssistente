CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  nickname TEXT,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  must_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
  setup_token_hash TEXT,
  setup_token_created_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer';
ALTER TABLE members ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS setup_token_hash TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS setup_token_created_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  deadline DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  raised_amount NUMERIC DEFAULT 0,
  spent_amount NUMERIC DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT TRUE,
  paid_at DATE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  notes TEXT,
  goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
  attachment_id TEXT,
  attachment_name TEXT,
  attachment_url TEXT,
  UNIQUE(member_id, month, year)
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL,
  category TEXT,
  notes TEXT,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  attachment_id TEXT,
  attachment_name TEXT,
  attachment_url TEXT
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS attachment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE payments ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc', NOW());
UPDATE payments
SET created_at = COALESCE(created_at, paid_at, TIMEZONE('utc', NOW()))
WHERE created_at IS NULL;

INSERT INTO settings (key, value, updated_at)
SELECT
  'current_balance',
  ((SELECT COALESCE(SUM(amount), 0) FROM payments)
   - (SELECT COALESCE(SUM(amount), 0) FROM expenses))::TEXT,
  TIMEZONE('utc', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, updated_at)
VALUES
  ('org_name', 'Tesoureiro Assistente', TIMEZONE('utc', NOW())),
  ('org_tagline', 'Controle completo de membros, pagamentos, metas e eventos do clã.', TIMEZONE('utc', NOW())),
  ('default_payment_amount', '100', TIMEZONE('utc', NOW())),
  ('document_footer', 'Guarde este recibo para referência. Em caso de dúvidas, procure o tesoureiro responsável.', TIMEZONE('utc', NOW())),
  ('payment_due_day', '', TIMEZONE('utc', NOW())),
  ('pix_key', '', TIMEZONE('utc', NOW())),
  ('pix_receiver', '', TIMEZONE('utc', NOW())),
  ('dashboard_note', '', TIMEZONE('utc', NOW()))
ON CONFLICT (key) DO NOTHING;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS attachment_id TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS attachment_url TEXT;
