const config = require('../config');
const { query, queryOne, execute } = require('../db/query');

const DEFAULT_SETTINGS = {
  org_name: 'Tesoureiro Assistente',
  org_tagline: 'Controle completo de membros, pagamentos, metas e eventos do clã.',
  default_payment_amount: '100',
  document_footer: 'Guarde este recibo para referência. Em caso de dúvidas, procure o tesoureiro responsável.',
  payment_due_day: '',
  pix_key: '',
  pix_receiver: '',
  dashboard_note: '',
  disclaimer_text: 'Sistema para uso interno. Os dados são confidenciais e de responsabilidade da organização.'
};

const normalizeDueDay = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
    return null;
  }
  return parsed;
};

const ensureBalanceRow = async () => {
  const row = await queryOne("SELECT value FROM settings WHERE key = 'current_balance'");
  if (row) {
    return Number(row.value) || 0;
  }
  const paymentsRow = await queryOne('SELECT COALESCE(SUM(amount), 0) AS total FROM payments');
  const expensesRow = await queryOne('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses');
  const totalPayments = Number(paymentsRow?.total) || 0;
  const totalExpenses = Number(expensesRow?.total) || 0;
  const initialBalance = totalPayments - totalExpenses;
  await setCurrentBalance(initialBalance);
  return initialBalance;
};

const getSettings = async () => {
  const keys = Object.keys(DEFAULT_SETTINGS);
  if (!keys.length) {
    return {};
  }
  const placeholders = keys.map(() => '?').join(', ');
  const rows = await query(
    `SELECT key, value FROM settings WHERE key IN (${placeholders})`,
    keys
  );
  const settings = { ...DEFAULT_SETTINGS };
  rows.forEach((row) => {
    if (row?.key) {
      settings[row.key] = row.value ?? settings[row.key];
    }
  });
  return settings;
};

const getSetting = async (key) => {
  if (!key) return null;
  const row = await queryOne('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
};

const getPublicSettings = async () => {
  const settings = await getSettings();
  const defaultAmount = Number(settings.default_payment_amount);
  const paymentDueDay = normalizeDueDay(settings.payment_due_day);
  return {
    orgName: settings.org_name || DEFAULT_SETTINGS.org_name,
    orgTagline: settings.org_tagline ?? DEFAULT_SETTINGS.org_tagline,
    defaultPaymentAmount: Number.isNaN(defaultAmount) ? Number(DEFAULT_SETTINGS.default_payment_amount) : defaultAmount,
    paymentDueDay,
    pixKey: settings.pix_key || '',
    pixReceiver: settings.pix_receiver || '',
    dashboardNote: settings.dashboard_note || '',
    disclaimerText: settings.disclaimer_text ?? DEFAULT_SETTINGS.disclaimer_text
  };
};

const setSetting = async (key, value) => {
  if (!key) return;
  const storedValue = value === undefined || value === null ? null : String(value);
  if (config.useSupabase) {
    await execute(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, TIMEZONE('utc', NOW()))
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [key, storedValue]
    );
    return;
  }
  await execute(
    `INSERT OR REPLACE INTO settings (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)`,
    [key, storedValue]
  );
};

const setSettings = async (values = {}) => {
  const entries = Object.entries(values).filter(([key]) => Boolean(key));
  for (const [key, value] of entries) {
    await setSetting(key, value);
  }
};

const setCurrentBalance = async (value) => {
  const balanceValue = Number(value) || 0;
  if (config.useSupabase) {
    await execute(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('current_balance', ?, TIMEZONE('utc', NOW()))
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [String(balanceValue)]
    );
    return;
  }
  await execute(
    `INSERT OR REPLACE INTO settings (key, value, updated_at)
     VALUES ('current_balance', ?, CURRENT_TIMESTAMP)`,
    [String(balanceValue)]
  );
};

const getCurrentBalance = async () => {
  return ensureBalanceRow();
};

const adjustCurrentBalance = async (delta) => {
  const numericDelta = Number(delta) || 0;
  if (!numericDelta) {
    await ensureBalanceRow();
    return;
  }
  await ensureBalanceRow();
  if (config.useSupabase) {
    await execute(
      `UPDATE settings
       SET value = ((COALESCE(value, '0')::numeric + ?)::text),
           updated_at = TIMEZONE('utc', NOW())
       WHERE key = 'current_balance'`,
      [numericDelta]
    );
    return;
  }
  await execute(
    `UPDATE settings
     SET value = (CAST(COALESCE(value, '0') AS REAL) + ?),
         updated_at = CURRENT_TIMESTAMP
     WHERE key = 'current_balance'`,
    [numericDelta]
  );
};

module.exports = {
  DEFAULT_SETTINGS,
  normalizeDueDay,
  getSetting,
  getSettings,
  getPublicSettings,
  setSetting,
  setSettings,
  getCurrentBalance,
  setCurrentBalance,
  adjustCurrentBalance
};
