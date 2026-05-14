const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { name, status, startDate, endDate, memberId } = req.query;

    let whereSql = 'WHERE 1 = 1';
    const params = [];

    if (name) {
      // LOWER + LIKE para busca case-insensitive em SQLite e Postgres.
      // Sem unaccent: "café" e "cafe" são considerados diferentes (limitação aceita na v1).
      whereSql += " AND LOWER(COALESCE(name, '')) LIKE LOWER(?)";
      params.push(`%${name}%`);
    }
    if (status === 'active' || status === 'inactive') {
      whereSql += ' AND status = ?';
      params.push(status);
    }
    if (startDate) {
      whereSql += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Inclui o dia inteiro: data fornecida + 23:59:59
      whereSql += ' AND created_at <= ?';
      params.push(`${endDate} 23:59:59`);
    }
    if (memberId) {
      whereSql += ' AND id IN (SELECT project_id FROM member_projects WHERE member_id = ?)';
      params.push(Number(memberId));
    }

    const projects = await query(
      `SELECT * FROM projects ${whereSql} ORDER BY created_at DESC`,
      params
    );

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
    await execute(
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
