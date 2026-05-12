const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const projects = await query('SELECT * FROM projects ORDER BY created_at DESC');
    const memberships = await query(`
      SELECT mp.project_id, mp.member_id, m.name, m.nickname
      FROM member_projects mp
      JOIN members m ON m.id = mp.member_id
    `);
    const enriched = projects.map((p) => ({
      ...p,
      members: memberships.filter((mp) => mp.project_id === p.id)
    }));
    success(res, { projects: enriched });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requirePrivileged, async (req, res) => {
  try {
    const { name, description, status, start_date, end_date } = req.body;
    if (!name) return fail(res, 'Nome é obrigatório');
    if (start_date && end_date && end_date < start_date) {
      return fail(res, 'Data de término não pode ser anterior à data de início');
    }
    const [project] = await query(
      'INSERT INTO projects (name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?) RETURNING *',
      [name, description || null, status || 'active', start_date || null, end_date || null]
    );
    success(res, { project: { ...project, members: [] } });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, start_date, end_date } = req.body;
    if (!name) return fail(res, 'Nome é obrigatório');
    if (start_date && end_date && end_date < start_date) {
      return fail(res, 'Data de término não pode ser anterior à data de início');
    }
    const [project] = await query(
      'UPDATE projects SET name = ?, description = ?, status = ?, start_date = ?, end_date = ? WHERE id = ? RETURNING *',
      [name, description || null, status || 'active', start_date || null, end_date || null, id]
    );
    if (!project) return fail(res, 'Projeto não encontrado', 404);
    success(res, { project });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM projects WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/:id/members', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    await execute(
      'INSERT OR IGNORE INTO member_projects (project_id, member_id) VALUES (?, ?)',
      [id, memberId]
    );
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id/members/:memberId', requirePrivileged, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    await execute(
      'DELETE FROM member_projects WHERE project_id = ? AND member_id = ?',
      [id, memberId]
    );
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
