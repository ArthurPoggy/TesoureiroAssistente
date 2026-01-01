const config = require('../config');
const { queryOne, execute } = require('../db/query');

const ensureBalanceRow = async () => {
  const row = await queryOne("SELECT value FROM settings WHERE key = 'current_balance'");
  if (row) {
    return Number(row.value) || 0;
  }
  const paymentsRow = await queryOne('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE paid');
  const expensesRow = await queryOne('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses');
  const totalPayments = Number(paymentsRow?.total) || 0;
  const totalExpenses = Number(expensesRow?.total) || 0;
  const initialBalance = totalPayments - totalExpenses;
  await setCurrentBalance(initialBalance);
  return initialBalance;
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
  getCurrentBalance,
  setCurrentBalance,
  adjustCurrentBalance
};
