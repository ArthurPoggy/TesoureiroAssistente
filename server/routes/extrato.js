const express = require('express');
const PDFDocument = require('pdfkit');
const config = require('../config');
const { query } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requirePrivileged } = require('../middleware/auth');
const { getSettings, DEFAULT_SETTINGS } = require('../utils/settings');

const router = express.Router();

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';
  const parts = String(value).split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return value;
};

const buildEntries = async (filters = {}) => {
  const { startDate, endDate, type, memberId } = filters;
  const entries = [];

  // Payments (entradas)
  if (!type || type === 'pagamento') {
    let sql = `
      SELECT p.id, p.amount, p.paid_at, p.created_at, p.month, p.year, p.notes,
             m.name AS member_name, 'pagamento' AS entry_type
      FROM payments p
      JOIN members m ON m.id = p.member_id
      WHERE p.paid
    `;
    const params = [];
    if (memberId) {
      sql += ' AND p.member_id = ?';
      params.push(Number(memberId));
    }
    if (startDate) {
      sql += ' AND COALESCE(p.paid_at, p.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND COALESCE(p.paid_at, p.created_at) <= ?';
      params.push(endDate);
    }
    const rows = await query(sql, params);
    rows.forEach((row) => {
      entries.push({
        date: row.paid_at || row.created_at || `${row.year}-${String(row.month).padStart(2, '0')}-01`,
        type: 'pagamento',
        description: `Pagamento - ${row.member_name} (${String(row.month).padStart(2, '0')}/${row.year})`,
        amount: Number(row.amount || 0),
        notes: row.notes || ''
      });
    });
  }

  // Expenses (saídas)
  if (!type || type === 'despesa') {
    let sql = `
      SELECT e.id, e.title, e.amount, e.expense_date, e.category, e.notes,
             'despesa' AS entry_type
      FROM expenses e
      WHERE 1 = 1
    `;
    const params = [];
    if (startDate) {
      sql += ' AND e.expense_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND e.expense_date <= ?';
      params.push(endDate);
    }
    const rows = await query(sql, params);
    rows.forEach((row) => {
      entries.push({
        date: row.expense_date,
        type: 'despesa',
        description: `Despesa - ${row.title}${row.category ? ` (${row.category})` : ''}`,
        amount: -Number(row.amount || 0),
        notes: row.notes || ''
      });
    });
  }

  // Events (líquido)
  if (!type || type === 'evento') {
    let sql = `
      SELECT ev.id, ev.name, ev.event_date, ev.raised_amount, ev.spent_amount, ev.description,
             'evento' AS entry_type
      FROM events ev
      WHERE 1 = 1
    `;
    const params = [];
    if (startDate) {
      sql += ' AND ev.event_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND ev.event_date <= ?';
      params.push(endDate);
    }
    const rows = await query(sql, params);
    rows.forEach((row) => {
      const raised = Number(row.raised_amount || 0);
      const spent = Number(row.spent_amount || 0);
      const net = raised - spent;
      entries.push({
        date: row.event_date,
        type: 'evento',
        description: `Evento - ${row.name}`,
        amount: net,
        notes: row.description || ''
      });
    });
  }

  // Sort by date
  entries.sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateA.localeCompare(dateB);
  });

  // Calculate running balance
  let runningBalance = 0;
  entries.forEach((entry) => {
    runningBalance += entry.amount;
    entry.running_balance = runningBalance;
  });

  return entries;
};

router.get('/', requirePrivileged, async (req, res) => {
  try {
    const { startDate, endDate, type, memberId } = req.query;
    const entries = await buildEntries({ startDate, endDate, type, memberId });

    const totalIncome = entries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = entries.filter((e) => e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const netBalance = totalIncome - totalExpense;

    success(res, {
      entries,
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        count: entries.length
      }
    });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/export', requirePrivileged, async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate, type, memberId } = req.query;
    const entries = await buildEntries({ startDate, endDate, type, memberId });

    const totalIncome = entries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = entries.filter((e) => e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0);

    if (format === 'pdf') {
      const settings = await getSettings();
      const orgName = settings.org_name || DEFAULT_SETTINGS.org_name;
      const orgTagline = settings.org_tagline ?? DEFAULT_SETTINGS.org_tagline;
      const footerNote = settings.document_footer ?? DEFAULT_SETTINGS.document_footer;

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="extrato.pdf"');
      doc.pipe(res);

      const pageWidth = doc.page.width;
      const margin = doc.page.margins.left;
      const contentWidth = pageWidth - margin * 2;

      // Header
      doc.rect(0, 0, pageWidth, 100).fill('#0f172a');
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(20).text('Extrato de Movimentações', margin, 28);
      doc.font('Helvetica').fontSize(10).text(orgName, margin, 58);
      if (orgTagline) doc.text(orgTagline, margin, 72);
      doc.text('Documento gerado automaticamente', margin, orgTagline ? 86 : 74);
      doc.fillColor('#0f172a');

      let y = 120;

      // Summary cards
      const gap = 12;
      const cardWidth = (contentWidth - gap * 2) / 3;
      const items = [
        { label: 'TOTAL ENTRADAS', value: formatCurrency(totalIncome) },
        { label: 'TOTAL SAÍDAS', value: formatCurrency(totalExpense) },
        { label: 'SALDO LÍQUIDO', value: formatCurrency(totalIncome - totalExpense) }
      ];
      items.forEach((item, i) => {
        const x = margin + i * (cardWidth + gap);
        doc.roundedRect(x, y, cardWidth, 50, 8).fill('#f8fafc');
        doc.fillColor('#64748b').fontSize(8).text(item.label, x + 10, y + 10);
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(item.value, x + 10, y + 26, { width: cardWidth - 20 });
      });
      y += 70;

      // Table
      const colWidths = [70, 70, 200, 85, 90];
      const headers = ['Data', 'Tipo', 'Descrição', 'Valor', 'Saldo'];

      const drawHeaderRow = () => {
        doc.rect(margin, y, contentWidth, 20).fill('#e2e8f0');
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8);
        let x = margin;
        headers.forEach((h, i) => {
          doc.text(h, x + 4, y + 6, { width: colWidths[i] - 8, lineBreak: false });
          x += colWidths[i];
        });
        y += 20;
      };

      drawHeaderRow();
      doc.font('Helvetica').fontSize(8).fillColor('#0f172a');

      entries.forEach((entry) => {
        if (y + 18 > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
          drawHeaderRow();
          doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
        }
        let x = margin;
        const typeLabels = { pagamento: 'Entrada', despesa: 'Saída', evento: 'Evento' };
        const cells = [
          formatDate(entry.date),
          typeLabels[entry.type] || entry.type,
          entry.description,
          formatCurrency(entry.amount),
          formatCurrency(entry.running_balance)
        ];
        cells.forEach((cell, i) => {
          const text = String(cell || '-');
          doc.text(text.length > 35 ? text.slice(0, 32) + '...' : text, x + 4, y + 4, { width: colWidths[i] - 8, lineBreak: false });
          x += colWidths[i];
        });
        y += 18;
      });

      // Footer
      if (footerNote) {
        y = Math.max(y + 20, doc.page.height - 60);
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = doc.page.height - 60;
        }
        doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor('#e2e8f0').stroke();
        doc.fillColor('#64748b').fontSize(9).text(footerNote, margin, y + 12, { width: contentWidth, align: 'center' });
      }

      doc.end();
    } else {
      // CSV
      const csvHeaders = ['data', 'tipo', 'descricao', 'valor', 'saldo_acumulado', 'observacoes'];
      const typeLabels = { pagamento: 'Entrada', despesa: 'Saída', evento: 'Evento' };
      const csvLines = [
        csvHeaders.join(','),
        ...entries.map((entry) =>
          [
            `"${formatDate(entry.date)}"`,
            `"${typeLabels[entry.type] || entry.type}"`,
            `"${(entry.description || '').replace(/"/g, '""')}"`,
            `"${entry.amount.toFixed(2)}"`,
            `"${entry.running_balance.toFixed(2)}"`,
            `"${(entry.notes || '').replace(/"/g, '""')}"`
          ].join(',')
        )
      ];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="extrato.csv"');
      res.send(csvLines.join('\n'));
    }
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
