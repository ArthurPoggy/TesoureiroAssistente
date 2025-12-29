const express = require('express');
const PDFDocument = require('pdfkit');
const { query, queryOne, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { month, year, memberId } = req.query;
    let sql = `
      SELECT p.*, m.name AS member_name
      FROM payments p
      JOIN members m ON m.id = p.member_id
      WHERE 1 = 1
    `;
    const params = [];
    if (month) {
      sql += ' AND p.month = ?';
      params.push(Number(month));
    }
    if (year) {
      sql += ' AND p.year = ?';
      params.push(Number(year));
    }
    if (memberId) {
      sql += ' AND p.member_id = ?';
      params.push(Number(memberId));
    }
    sql += ' ORDER BY p.year DESC, p.month DESC';
    const payments = await query(sql, params);
    success(res, { payments });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/history/:memberId', requireAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    const payments = await query(
      'SELECT * FROM payments WHERE member_id = ? ORDER BY year DESC, month DESC',
      [memberId]
    );
    success(res, { payments });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      memberId,
      month,
      year,
      amount,
      paid,
      paidAt,
      notes,
      goalId,
      attachmentId,
      attachmentName,
      attachmentUrl
    } = req.body;
    if (!memberId || !month || !year || !amount) {
      return fail(res, 'Campos obrigatórios não preenchidos');
    }
    const paidValue = Boolean(paid);
    const [payment] = await query(
      `
      INSERT INTO payments (member_id, month, year, amount, paid, paid_at, notes, goal_id, attachment_id, attachment_name, attachment_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(member_id, month, year) DO UPDATE SET
        amount = excluded.amount,
        paid = excluded.paid,
        paid_at = excluded.paid_at,
        notes = excluded.notes,
        goal_id = excluded.goal_id,
        attachment_id = COALESCE(excluded.attachment_id, payments.attachment_id),
        attachment_name = COALESCE(excluded.attachment_name, payments.attachment_name),
        attachment_url = COALESCE(excluded.attachment_url, payments.attachment_url)
      RETURNING *
    `,
      [
        memberId,
        month,
        year,
        amount,
        paidValue,
        paidAt,
        notes,
        goalId || null,
        attachmentId || null,
        attachmentName || null,
        attachmentUrl || null
      ]
    );
    success(res, { payment });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paid, paidAt, notes, goalId, attachmentId, attachmentName, attachmentUrl } = req.body;
    const paidValue = Boolean(paid);
    const [payment] = await query(
      `UPDATE payments
       SET amount = ?, paid = ?, paid_at = ?, notes = ?, goal_id = ?,
           attachment_id = COALESCE(?, attachment_id),
           attachment_name = COALESCE(?, attachment_name),
           attachment_url = COALESCE(?, attachment_url)
       WHERE id = ? RETURNING *`,
      [
        amount,
        paidValue,
        paidAt,
        notes,
        goalId || null,
        attachmentId || null,
        attachmentName || null,
        attachmentUrl || null,
        id
      ]
    );
    success(res, { payment });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM payments WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/:id/receipt', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await queryOne(
      `SELECT p.*, m.name AS member_name, m.email
       FROM payments p
       JOIN members m ON m.id = p.member_id
       WHERE p.id = ?`,
      [id]
    );
    if (!payment) {
      return fail(res, 'Pagamento não encontrado', 404);
    }

    const formatDate = (value) => {
      if (!value) return 'não informado';
      const parts = String(value).split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
      return value;
    };
    const formatCurrency = (value) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
    const months = [
      '',
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro'
    ];
    const competenceLabel = `${months[Number(payment.month)] || payment.month}/${payment.year}`;
    const issueDate = new Date().toLocaleDateString('pt-BR');
    const statusLabel = payment.paid ? 'Pago' : 'Pendente';
    const statusColor = payment.paid ? '#16a34a' : '#f97316';

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const filename = `recibo-${payment.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const margin = doc.page.margins.left;
    const contentWidth = pageWidth - margin * 2;

    doc.rect(0, 0, pageWidth, 110).fill('#0f172a');
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(22).text('Recibo de Pagamento', margin, 28);
    doc.font('Helvetica').fontSize(10).text('Tesoureiro Assistente', margin, 58);
    doc.text('Documento gerado automaticamente', margin, 74);

    doc.fillColor('#0f172a');
    let currentY = 130;
    doc.font('Helvetica-Bold').fontSize(13).text('Resumo do pagamento', margin, currentY);
    currentY += 24;

    const colGap = 24;
    const colWidth = (contentWidth - colGap) / 2;
    const leftX = margin;
    const rightX = margin + colWidth + colGap;
    const rowHeight = 38;

    const drawField = (x, y, label, value) => {
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(label.toUpperCase(), x, y);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(value, x, y + 12, {
        width: colWidth
      });
    };

    const drawBadge = (x, y, label, color) => {
      doc.font('Helvetica-Bold').fontSize(9);
      const paddingX = 10;
      const textWidth = doc.widthOfString(label);
      const badgeWidth = textWidth + paddingX * 2;
      const badgeHeight = 18;
      doc.roundedRect(x, y, badgeWidth, badgeHeight, 6).fill(color);
      doc.fillColor('#fff').text(label, x, y + 4, { width: badgeWidth, align: 'center' });
    };

    drawField(leftX, currentY, 'Membro', payment.member_name);
    drawField(leftX, currentY + rowHeight, 'Email', payment.email || 'não informado');

    drawField(rightX, currentY, 'Recibo', `#${payment.id}`);
    drawField(rightX, currentY + rowHeight, 'Competência', competenceLabel);
    drawField(rightX, currentY + rowHeight * 2, 'Pagamento em', formatDate(payment.paid_at));
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('STATUS', rightX, currentY + rowHeight * 3);
    drawBadge(rightX, currentY + rowHeight * 3 + 12, statusLabel, statusColor);

    currentY += rowHeight * 4 + 12;

    doc.roundedRect(margin, currentY, contentWidth, 70, 10).fill('#eff6ff');
    doc.fillColor('#1d4ed8').font('Helvetica-Bold').fontSize(12).text('Valor recebido', margin + 16, currentY + 14);
    doc.fillColor('#0f172a').fontSize(24).text(formatCurrency(payment.amount), margin + 16, currentY + 34);
    doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(`Emitido em ${issueDate}`, margin + 16, currentY + 52);

    currentY += 90;

    if (payment.notes) {
      doc.roundedRect(margin, currentY, contentWidth, 70, 10).stroke('#e2e8f0');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Observações', margin + 12, currentY + 10);
      doc.font('Helvetica').fontSize(10).fillColor('#475569').text(payment.notes, margin + 12, currentY + 28, {
        width: contentWidth - 24,
        height: 40
      });
      currentY += 86;
    }

    const footerY = doc.page.height - 70;
    doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).strokeColor('#e2e8f0').stroke();
    doc.fillColor('#64748b').fontSize(9).text(
      'Guarde este recibo para referência. Em caso de dúvidas, procure o tesoureiro responsável.',
      margin,
      footerY + 12,
      { width: contentWidth, align: 'center' }
    );
    doc.end();
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
