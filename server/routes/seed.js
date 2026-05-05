const express = require('express');
const { query, queryOne, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requirePrivileged } = require('../middleware/auth');
const { createMemberUser, normalizeEmail } = require('../utils/auth');

const router = express.Router();

const TEST_PROFILES = [
  { name: 'Admin Teste',    email: 'admin_teste@clan.com',   cpf: 'TEST-ADMIN',   password: 'test123', role: 'admin' },
  { name: 'Diretor Teste',  email: 'diretor_teste@clan.com', cpf: 'TEST-DIRETOR', password: 'test123', role: 'diretor_financeiro' },
  { name: 'Viewer Teste',   email: 'viewer_teste@clan.com',  cpf: 'TEST-VIEWER',  password: 'test123', role: 'viewer' }
];

router.post('/', requirePrivileged, async (req, res) => {
  try {
    const membersCountRow = await queryOne('SELECT COUNT(*) as total FROM members');
    if (membersCountRow?.total) {
      return fail(res, 'Base já possui dados');
    }
    const memberIds = [];
    const seedMembers = ['Ana', 'Bruno', 'Carla', 'Diego'];
    for (let index = 0; index < seedMembers.length; index += 1) {
      const name = seedMembers[index];
      const [member] = await query(
        'INSERT INTO members (name, email, nickname) VALUES (?, ?, ?) RETURNING id',
        [name, `${name.toLowerCase()}@clan.com`, `M${index + 1}`]
      );
      if (member?.id) {
        memberIds.push(member.id);
      }
    }
    for (let idx = 0; idx < memberIds.length; idx += 1) {
      for (let month = 1; month <= 6; month += 1) {
        await execute(
          'INSERT INTO payments (member_id, month, year, amount, paid, paid_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            memberIds[idx],
            month,
            2024,
            100,
            idx % 2 === 0 || month % 2 === 0,
            `2024-${String(month).padStart(2, '0')}-05`,
            'Pagamento seed'
          ]
        );
      }
    }
    await execute(
      'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?)',
      ['Acampamento de inverno', 3000, '2024-08-15', 'Cobrir custos do acampamento']
    );
    await execute(
      'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?)',
      ['Compra de equipamentos', 5000, '2024-12-10', 'Melhorar infraestrutura']
    );
    await execute(
      'INSERT INTO expenses (title, amount, expense_date, category, notes) VALUES (?, ?, ?, ?, ?)',
      ['Compra de mantimentos', 350, '2024-04-12', 'Operacional', 'Itens semanais']
    );
    await execute(
      'INSERT INTO expenses (title, amount, expense_date, category, notes) VALUES (?, ?, ?, ?, ?)',
      ['Transporte acampamento', 600, '2024-05-02', 'Eventos', 'Ônibus fretado']
    );
    await execute(
      'INSERT INTO events (name, event_date, raised_amount, spent_amount, description) VALUES (?, ?, ?, ?, ?)',
      ['Acampamento de junho', '2024-06-20', 2000, 1500, 'Evento principal do semestre']
    );
    success(res, { message: 'Base populada' });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/test-users', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return fail(res, 'Não disponível em produção', 403);
  }
  try {
    const created = [];
    const existing = [];

    for (const profile of TEST_PROFILES) {
      const found = await queryOne(
        'SELECT id, role FROM members WHERE LOWER(email) = ?',
        [normalizeEmail(profile.email)]
      );
      if (found) {
        existing.push({ email: profile.email, role: profile.role });
      } else {
        await createMemberUser({
          name: profile.name,
          email: normalizeEmail(profile.email),
          cpf: profile.cpf,
          password: profile.password,
          role: profile.role
        });
        created.push({ email: profile.email, role: profile.role });
      }
    }

    const credentials = TEST_PROFILES.map((p) => ({
      role: p.role,
      email: p.email,
      password: p.password
    }));

    return success(res, { created, existing, credentials });
  } catch (error) {
    return fail(res, error.message);
  }
});

module.exports = router;
