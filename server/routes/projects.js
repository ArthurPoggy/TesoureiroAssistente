const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const projects = await query('SELECT * FROM projects ORDER BY created_at DESC');
    const memberRows = await query(
      `SELECT mp.project_id, mp.member_id, mp.joined_at, m.name, m.nickname
       FROM member_projects mp
       JOIN members m ON m.id = mp.member_id
       ORDER BY m.name`
    );
    const membersByProject = memberRows.reduce((acc, row) => {
      if (!acc[row.project_id]) acc[row.project_id] = [];
      acc[row.project_id].push({
        member_id: row.member_id,
        name: row.name,
        nickname: row.nickname,
        joined_at: row.joined_at
      });
      return acc;
    }, {});
    const enriched = projects.map((project) => ({
      ...project,
      members: membersByProject[project.id] || []
    }));
    success(res, { projects: enriched });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requirePrivileged, async (req, res) => {
  try {
    const { name, description, status = 'active' } = req.body;
    if (!name) return fail(res, 'Nome do projeto é obrigatório');
    const [project] = await query(
      'INSERT INTO projects (name, description, status) VALUES (?, ?, ?) RETURNING *',
      [name, description, status]
    );
    success(res, { project: { ...project, members: [] } });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    if (!name) return fail(res, 'Nome do projeto é obrigatório');
    const [project] = await query(
      'UPDATE projects SET name = ?, description = ?, status = ? WHERE id = ? RETURNING *',
      [name, description, status, id]
    );
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
    if (!memberId) return fail(res, 'Membro é obrigatório');
    await query(
      'INSERT OR IGNORE INTO member_projects (member_id, project_id) VALUES (?, ?)',
      [memberId, id]
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
