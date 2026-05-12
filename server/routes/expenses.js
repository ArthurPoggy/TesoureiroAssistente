const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

const router = express.Router();

const attachTags = async (expenses) => {
  if (!expenses.length) return expenses;
  const ids = expenses.map((e) => e.id);
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await query(
    `SELECT et.expense_id, t.id, t.name
     FROM expense_tags et
     JOIN tags t ON t.id = et.tag_id
     WHERE et.expense_id IN (${placeholders})
     ORDER BY t.name ASC`,
    ids
  );
  const tagsByExpense = rows.reduce((acc, row) => {
    if (!acc[row.expense_id]) acc[row.expense_id] = [];
    acc[row.expense_id].push({ id: row.id, name: row.name });
    return acc;
  }, {});
  return expenses.map((e) => ({ ...e, tags: tagsByExpense[e.id] || [] }));
};

const syncTags = async (expenseId, tagIds = []) => {
  await execute('DELETE FROM expense_tags WHERE expense_id = ?', [expenseId]);
  for (const tagId of tagIds) {
    await execute(
      'INSERT OR IGNORE INTO expense_tags (expense_id, tag_id) VALUES (?, ?)',
      [expenseId, tagId]
    );
  }
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const expenses = await query('SELECT * FROM expenses ORDER BY expense_date DESC');
    const enriched = await attachTags(expenses);
    success(res, { expenses: enriched });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requirePrivileged, async (req, res) => {
  try {
    const {
      title,
      amount,
      expenseDate,
      category,
      notes,
      eventId,
      attachmentId,
      attachmentName,
      attachmentUrl,
      tagIds
    } = req.body;
    if (!title || !amount || !expenseDate) {
      return fail(res, 'Título, valor e data são obrigatórios');
    }
    const [expense] = await query(
      `INSERT INTO expenses (title, amount, expense_date, category, notes, event_id, attachment_id, attachment_name, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        title,
        amount,
        expenseDate,
        category,
        notes,
        eventId || null,
        attachmentId || null,
        attachmentName || null,
        attachmentUrl || null
      ]
    );
    await syncTags(expense.id, Array.isArray(tagIds) ? tagIds : []);
    const [enriched] = await attachTags([expense]);
    success(res, { expense: enriched });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      amount,
      expenseDate,
      category,
      notes,
      eventId,
      attachmentId,
      attachmentName,
      attachmentUrl,
      tagIds
    } = req.body;
    const [expense] = await query(
      `UPDATE expenses
       SET title = ?, amount = ?, expense_date = ?, category = ?, notes = ?, event_id = ?,
           attachment_id = COALESCE(?, attachment_id),
           attachment_name = COALESCE(?, attachment_name),
           attachment_url = COALESCE(?, attachment_url)
       WHERE id = ? RETURNING *`,
      [
        title,
        amount,
        expenseDate,
        category,
        notes,
        eventId || null,
        attachmentId || null,
        attachmentName || null,
        attachmentUrl || null,
        id
      ]
    );
    if (tagIds !== undefined) {
      await syncTags(id, Array.isArray(tagIds) ? tagIds : []);
    }
    const [enriched] = await attachTags([expense]);
    success(res, { expense: enriched });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM expenses WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
