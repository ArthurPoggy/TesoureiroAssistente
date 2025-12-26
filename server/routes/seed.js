const express = require('express');
const { query, queryOne, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAdmin, async (req, res) => {
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

module.exports = router;
