const express = require('express');
const PDFDocument = require('pdfkit');
const { query, queryOne, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');
const { isPrivilegedRequest } = require('../utils/roles');
const { adjustCurrentBalance, getSettings, DEFAULT_SETTINGS } = require('../utils/settings');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { month, year, memberId } = req.query;
    const isAdminRequest = isPrivilegedRequest(req);
    const effectiveMemberId = isAdminRequest ? memberId : req.user?.memberId;
    if (!isAdminRequest && !effectiveMemberId) {
      return success(res, { payments: [] });
    }
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
    if (effectiveMemberId) {
      sql += ' AND p.member_id = ?';
      params.push(Number(effectiveMemberId));
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
    const isAdminRequest = isPrivilegedRequest(req);
    const effectiveMemberId = isAdminRequest ? memberId : req.user?.memberId;
    if (!effectiveMemberId) {
      return success(res, { payments: [] });
    }
    const payments = await query(
      'SELECT * FROM payments WHERE member_id = ? ORDER BY year DESC, month DESC',
      [Number(effectiveMemberId)]
    );
    success(res, { payments });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requirePrivileged, async (req, res) => {
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
    const existingPayment = await queryOne(
      'SELECT id, amount, paid FROM payments WHERE member_id = ? AND month = ? AND year = ?',
      [memberId, month, year]
    );
    const createdAt = new Date().toISOString();
    const [payment] = await query(
      `
      INSERT INTO payments (member_id, month, year, amount, paid, paid_at, created_at, notes, goal_id, attachment_id, attachment_name, attachment_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        createdAt,
        notes,
        goalId || null,
        attachmentId || null,
        attachmentName || null,
        attachmentUrl || null
      ]
    );
    const previousAmount = existingPayment ? Number(existingPayment.amount || 0) : 0;
    const nextAmount = Number(amount || 0);
    await adjustCurrentBalance(nextAmount - previousAmount);
    success(res, { payment });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paid, paidAt, notes, goalId, attachmentId, attachmentName, attachmentUrl } = req.body;
    const paidValue = Boolean(paid);
    const existingPayment = await queryOne(
      'SELECT amount, paid FROM payments WHERE id = ?',
      [id]
    );
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
    if (!payment) {
      return fail(res, 'Pagamento não encontrado', 404);
    }
    const previousAmount = existingPayment ? Number(existingPayment.amount || 0) : 0;
    const nextAmount = Number(amount || 0);
    await adjustCurrentBalance(nextAmount - previousAmount);
    success(res, { payment });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const existingPayment = await queryOne('SELECT amount, paid FROM payments WHERE id = ?', [id]);
    await execute('DELETE FROM payments WHERE id = ?', [id]);
    if (existingPayment) {
      await adjustCurrentBalance(-Number(existingPayment.amount || 0));
    }
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/:id/receipt', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await queryOne(
      `SELECT p.*, p.member_id, m.name AS member_name, m.email
       FROM payments p
       JOIN members m ON m.id = p.member_id
       WHERE p.id = ?`,
      [id]
    );
    if (!payment) {
      return fail(res, 'Pagamento não encontrado', 404);
    }
    if (!isPrivilegedRequest(req) && payment.member_id !== req.user?.memberId) {
      return fail(res, 'Acesso restrito', 403);
    }

    const reportTimeZone = process.env.REPORT_TIMEZONE || 'America/Sao_Paulo';
    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    const parseDateValue = (value) => {
      if (!value) return null;
      if (value instanceof Date) {
        return value;
      }
      if (typeof value === 'string' && dateOnlyPattern.test(value)) {
        const [year, month, day] = value.split('-');
        return new Date(Number(year), Number(month) - 1, Number(day));
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const formatDateOnly = (value) => {
      if (!value) return 'não informado';
      if (typeof value === 'string' && dateOnlyPattern.test(value)) {
        const [year, month, day] = value.split('-');
        return `${day}/${month}/${year}`;
      }
      const date = parseDateValue(value);
      if (!date) return 'não informado';
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: reportTimeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    };
    const formatDateTime = (value) => {
      if (typeof value === 'string' && dateOnlyPattern.test(value)) {
        return formatDateOnly(value);
      }
      const date = parseDateValue(value);
      if (!date) return 'não informado';
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: reportTimeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
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
    const issueDate = formatDateTime(new Date());
    const statusLabel = payment.paid ? 'Pago' : 'Pendente';
    const statusColor = payment.paid ? '#16a34a' : '#f97316';

    const settings = await getSettings();
    const orgName = settings.org_name || DEFAULT_SETTINGS.org_name;
    const orgTagline = settings.org_tagline ?? DEFAULT_SETTINGS.org_tagline;
    const footerNote = settings.document_footer ?? DEFAULT_SETTINGS.document_footer;
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
    doc.font('Helvetica').fontSize(10).text(orgName, margin, 58);
    if (orgTagline) {
      doc.text(orgTagline, margin, 72);
    }
    doc.text('Documento gerado automaticamente', margin, orgTagline ? 86 : 74);

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
    drawField(rightX, currentY + rowHeight * 2, 'Pagamento em', formatDateOnly(payment.paid_at));
    const registeredAt = payment.created_at ? formatDateTime(payment.created_at) : 'não informado';
    drawField(rightX, currentY + rowHeight * 3, 'Registrado em', registeredAt);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('STATUS', rightX, currentY + rowHeight * 4);
    drawBadge(rightX, currentY + rowHeight * 4 + 12, statusLabel, statusColor);

    currentY += rowHeight * 5 + 12;

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
      footerNote || 'Guarde este recibo para referência.',
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
