const express = require('express');
const PDFDocument = require('pdfkit');
const config = require('../config');
const { query, queryOne } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth } = require('../middleware/auth');
const { getSettings, DEFAULT_SETTINGS } = require('../utils/settings');

const router = express.Router();

const sumPayments = async (filters = {}) => {
  let sql = 'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE paid';
  const params = [];
  if (filters.year) {
    sql += ' AND year = ?';
    params.push(filters.year);
  }
  if (filters.month) {
    sql += ' AND month = ?';
    params.push(filters.month);
  }
  if (filters.memberId) {
    sql += ' AND member_id = ?';
    params.push(filters.memberId);
  }
  const row = await queryOne(sql, params);
  return Number(row?.total) || 0;
};

const sumExpenses = async (filters = {}) => {
  let sql = 'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1 = 1';
  const params = [];
  if (filters.year) {
    sql += config.useSupabase ? ' AND EXTRACT(YEAR FROM expense_date) = ?' : " AND strftime('%Y', expense_date) = ?";
    params.push(filters.year);
  }
  if (filters.month) {
    sql += config.useSupabase ? ' AND EXTRACT(MONTH FROM expense_date) = ?' : " AND strftime('%m', expense_date) = ?";
    params.push(config.useSupabase ? filters.month : String(filters.month).padStart(2, '0'));
  }
  const row = await queryOne(sql, params);
  return Number(row?.total) || 0;
};

const monthNames = [
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

const monthShort = [
  '',
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez'
];

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

const formatPeriodLabel = (month, year) => {
  if (month && year) {
    return `${monthNames[month] || month}/${year}`;
  }
  if (year) {
    return `Ano ${year}`;
  }
  return 'Todos os períodos';
};

const ensureSpace = (doc, y, height) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + height > bottom) {
    doc.addPage();
    return doc.page.margins.top;
  }
  return y;
};

const truncateText = (doc, text, width) => {
  if (!text) return '-';
  let output = String(text);
  if (doc.widthOfString(output) <= width) return output;
  const ellipsis = '...';
  while (output.length > 1 && doc.widthOfString(`${output}${ellipsis}`) > width) {
    output = output.slice(0, -1);
  }
  return `${output}${ellipsis}`;
};

const drawHeader = (doc, title, subtitle, orgName, orgTagline) => {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  doc.rect(0, 0, pageWidth, 100).fill('#0f172a');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(20).text(title, margin, 28);
  doc.font('Helvetica').fontSize(10).text(orgName || DEFAULT_SETTINGS.org_name, margin, 58);
  if (orgTagline) {
    doc.text(orgTagline, margin, 72);
  }
  doc.text(subtitle, margin, orgTagline ? 86 : 74);
  doc.fillColor('#0f172a');
  return 120;
};

const drawSummaryCards = (doc, items, y) => {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const gap = 12;
  const cardHeight = 58;
  const cardWidth = (contentWidth - gap * (items.length - 1)) / items.length;
  const startY = ensureSpace(doc, y, cardHeight + 10);

  items.forEach((item, index) => {
    const x = margin + index * (cardWidth + gap);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 10).fill('#f8fafc');
    doc.fillColor('#64748b').fontSize(9).text(item.label.toUpperCase(), x + 12, startY + 10);
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(item.value, x + 12, startY + 28, {
      width: cardWidth - 24
    });
  });
  return startY + cardHeight + 18;
};

const drawBarChart = (doc, { title, data, x, y, width, color = '#2563eb', valueFormatter }) => {
  const neededHeight = 30 + Math.max(data.length, 1) * 18;
  let currentY = ensureSpace(doc, y, neededHeight);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(title, x, currentY);
  currentY += 18;

  if (!data.length) {
    doc.font('Helvetica').fontSize(10).fillColor('#64748b').text('Sem dados para o período.', x, currentY);
    return currentY + 20;
  }

  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const labelWidth = 150;
  const valueWidth = 70;
  const gap = 8;
  const barMaxWidth = Math.max(60, width - labelWidth - valueWidth - gap * 2);

  data.forEach((item, index) => {
    const rowY = currentY + index * 18;
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(item.label, x, rowY, {
      width: labelWidth,
      lineBreak: false
    });
    const barWidth = maxValue ? (item.value / maxValue) * barMaxWidth : 0;
    doc.roundedRect(x + labelWidth + gap, rowY + 3, barWidth, 10, 4).fill(color);
    const valueText = valueFormatter ? valueFormatter(item.value) : item.value;
    doc.fillColor('#0f172a')
      .fontSize(9)
      .text(valueText, x + labelWidth + gap + barMaxWidth + gap, rowY, {
        width: valueWidth,
        align: 'right',
        lineBreak: false
      });
  });

  return currentY + data.length * 18 + 12;
};

const drawTable = (doc, { title, columns, rows, rowHeight = 22 }) => {
  const margin = doc.page.margins.left;
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  let y = doc.y;
  if (title) {
    y = ensureSpace(doc, y, rowHeight + 16);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(title, margin, y);
    y += 16;
  }

  const drawHeaderRow = () => {
    doc.rect(margin, y, tableWidth, rowHeight).fill('#e2e8f0');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
    let x = margin;
    columns.forEach((col) => {
      doc.text(col.label, x + 4, y + 6, { width: col.width - 8, lineBreak: false });
      x += col.width;
    });
    y += rowHeight;
  };

  drawHeaderRow();

  doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
  rows.forEach((row, index) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeaderRow();
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
    }
    let x = margin;
    columns.forEach((col) => {
      const text = col.value(row);
      const clipped = truncateText(doc, text, col.width - 8);
      doc.text(clipped, x + 4, y + 6, { width: col.width - 8, lineBreak: false });
      x += col.width;
    });
    y += rowHeight;
    if (index < rows.length - 1) {
      doc.moveTo(margin, y).lineTo(margin + tableWidth, y).strokeColor('#f1f5f9').stroke();
    }
  });

  doc.y = y + 8;
  return doc.y;
};

const drawFooterNote = (doc, text) => {
  if (!text) return doc.y;
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  let y = ensureSpace(doc, doc.y, 40);
  doc.moveTo(margin, y).lineTo(margin + contentWidth, y).strokeColor('#e2e8f0').stroke();
  doc.fillColor('#64748b').fontSize(9).text(text, margin, y + 12, { width: contentWidth, align: 'center' });
  doc.y = y + 34;
  return doc.y;
};

const renderPaymentsReport = (doc, rows, filters = {}, settings = {}) => {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const monthValue = filters.month ? Number(filters.month) : null;
  const yearValue = filters.year ? Number(filters.year) : null;
  const periodLabel = formatPeriodLabel(monthValue, yearValue);

  let y = drawHeader(
    doc,
    'Relatório de Pagamentos',
    periodLabel,
    settings.org_name || DEFAULT_SETTINGS.org_name,
    settings.org_tagline ?? DEFAULT_SETTINGS.org_tagline
  );

  const paidRows = rows.filter((row) => Boolean(row.paid));
  const pendingRows = rows.filter((row) => !Boolean(row.paid));
  const totalPaid = paidRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalPending = pendingRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const paymentRate = rows.length ? Math.round((paidRows.length / rows.length) * 100) : 0;

  y = drawSummaryCards(doc, [
    { label: 'Total arrecadado', value: formatCurrency(totalPaid) },
    { label: 'Total pendente', value: formatCurrency(totalPending) },
    { label: 'Pagamentos registrados', value: String(rows.length) },
    { label: 'Taxa de pagamento', value: `${paymentRate}%` }
  ], y);

  let chartData = [];
  if (monthValue) {
    const byMember = paidRows.reduce((acc, row) => {
      const key = row.member || 'Sem nome';
      acc[key] = (acc[key] || 0) + Number(row.amount || 0);
      return acc;
    }, {});
    chartData = Object.entries(byMember)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  } else {
    const byMonth = paidRows.reduce((acc, row) => {
      const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
      acc[key] = (acc[key] || 0) + Number(row.amount || 0);
      return acc;
    }, {});
    chartData = Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        return {
          label: `${monthShort[Number(month)] || month}/${year}`,
          value
        };
      });
  }

  y = drawBarChart(doc, {
    title: monthValue ? 'Arrecadação por membro' : 'Arrecadação por mês',
    data: chartData,
    x: margin,
    y,
    width: contentWidth,
    valueFormatter: formatCurrency
  });

  doc.y = y;
  drawTable(doc, {
    title: 'Detalhamento dos pagamentos',
    columns: [
      { label: 'Membro', width: 150, value: (row) => row.member },
      {
        label: 'Competência',
        width: 70,
        value: (row) => `${String(row.month).padStart(2, '0')}/${row.year}`
      },
      { label: 'Valor', width: 70, value: (row) => formatCurrency(row.amount) },
      { label: 'Status', width: 60, value: (row) => (row.paid ? 'Pago' : 'Pendente') },
      {
        label: 'Detalhes',
        width: 165,
        value: (row) => {
          const details = [];
          if (row.paidAt) details.push(`Pago em ${formatDate(row.paidAt)}`);
          if (row.goal) details.push(`Meta: ${row.goal}`);
          if (row.attachmentName) details.push(`Anexo: ${row.attachmentName}`);
          if (row.notes) details.push(`Obs: ${row.notes}`);
          return details.join(' • ') || '-';
        }
      }
    ],
    rows
  });
  drawFooterNote(doc, settings.document_footer ?? DEFAULT_SETTINGS.document_footer);
};

const renderExpensesReport = (doc, rows, filters = {}, settings = {}) => {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const monthValue = filters.month ? Number(filters.month) : null;
  const yearValue = filters.year ? Number(filters.year) : null;
  const periodLabel = formatPeriodLabel(monthValue, yearValue);

  let y = drawHeader(
    doc,
    'Relatório de Despesas',
    periodLabel,
    settings.org_name || DEFAULT_SETTINGS.org_name,
    settings.org_tagline ?? DEFAULT_SETTINGS.org_tagline
  );

  const totalExpense = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const averageExpense = rows.length ? totalExpense / rows.length : 0;
  const maxExpense = rows.reduce((max, row) => (Number(row.amount || 0) > max ? Number(row.amount || 0) : max), 0);

  y = drawSummaryCards(doc, [
    { label: 'Total gasto', value: formatCurrency(totalExpense) },
    { label: 'Média por despesa', value: formatCurrency(averageExpense) },
    { label: 'Despesas registradas', value: String(rows.length) },
    { label: 'Maior despesa', value: formatCurrency(maxExpense) }
  ], y);

  const byCategory = rows.reduce((acc, row) => {
    const label = row.category ? row.category.trim() : 'Sem categoria';
    acc[label] = (acc[label] || 0) + Number(row.amount || 0);
    return acc;
  }, {});

  let categoryData = Object.entries(byCategory)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  if (categoryData.length > 8) {
    const top = categoryData.slice(0, 7);
    const others = categoryData.slice(7).reduce((sum, item) => sum + item.value, 0);
    categoryData = [...top, { label: 'Outros', value: others }];
  }

  y = drawBarChart(doc, {
    title: 'Gastos por categoria',
    data: categoryData,
    x: margin,
    y,
    width: contentWidth,
    color: '#f97316',
    valueFormatter: formatCurrency
  });

  const byMonth = rows.reduce((acc, row) => {
    if (!row.date) return acc;
    const [year, month] = String(row.date).split('-');
    if (!year || !month) return acc;
    const key = `${year}-${month}`;
    acc[key] = (acc[key] || 0) + Number(row.amount || 0);
    return acc;
  }, {});
  const monthData = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => {
      const [year, month] = key.split('-');
      return { label: `${monthShort[Number(month)] || month}/${year}`, value };
    });

  if (monthData.length > 1) {
    y = drawBarChart(doc, {
      title: 'Gastos por mês',
      data: monthData,
      x: margin,
      y,
      width: contentWidth,
      color: '#0ea5e9',
      valueFormatter: formatCurrency
    });
  }

  doc.y = y;
  drawTable(doc, {
    title: 'Detalhamento das despesas',
    columns: [
      { label: 'Data', width: 70, value: (row) => formatDate(row.date) },
      { label: 'Descrição', width: 150, value: (row) => row.title },
      {
        label: 'Categoria/Evento',
        width: 130,
        value: (row) => row.event ? `${row.category || 'Sem categoria'} • ${row.event}` : row.category || 'Sem categoria'
      },
      { label: 'Valor', width: 70, value: (row) => formatCurrency(row.amount) },
      {
        label: 'Detalhes',
        width: 95,
        value: (row) => {
          const details = [];
          if (row.attachmentName) details.push(`Anexo: ${row.attachmentName}`);
          if (row.notes) details.push(`Obs: ${row.notes}`);
          return details.join(' • ') || '-';
        }
      }
    ],
    rows
  });
  drawFooterNote(doc, settings.document_footer ?? DEFAULT_SETTINGS.document_footer);
};

router.get('/monthly', requireAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return fail(res, 'Informe mês e ano');
    }
    const isAdminRequest = req.user?.role === 'admin';
    if (!isAdminRequest && !req.user?.memberId) {
      return success(res, { month: Number(month), year: Number(year), total: 0 });
    }
    const total = await sumPayments({
      month: Number(month),
      year: Number(year),
      ...(isAdminRequest ? {} : { memberId: req.user?.memberId })
    });
    success(res, { month: Number(month), year: Number(year), total });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/annual', requireAuth, async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) {
      return fail(res, 'Informe o ano');
    }
    const isAdminRequest = req.user?.role === 'admin';
    if (!isAdminRequest && !req.user?.memberId) {
      return success(res, { year: Number(year), total: 0 });
    }
    const total = await sumPayments({
      year: Number(year),
      ...(isAdminRequest ? {} : { memberId: req.user?.memberId })
    });
    success(res, { year: Number(year), total });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/balance', requireAuth, async (req, res) => {
  try {
    const { year } = req.query;
    const isAdminRequest = req.user?.role === 'admin';
    const yearNum = year ? Number(year) : undefined;
    if (!isAdminRequest && !req.user?.memberId) {
      return success(res, { totalRaised: 0, totalExpenses: 0, balance: 0 });
    }
    const [totalRaised, totalExpenses] = await Promise.all([
      sumPayments({ year: yearNum, ...(isAdminRequest ? {} : { memberId: req.user?.memberId }) }),
      isAdminRequest ? sumExpenses({ year: yearNum }) : Promise.resolve(0)
    ]);
    success(res, { totalRaised, totalExpenses, balance: totalRaised - totalExpenses });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/export', requireAuth, async (req, res) => {
  try {
    const { format = 'csv', type = 'payments', month, year } = req.query;
    const isAdminRequest = req.user?.role === 'admin';
    if (!isAdminRequest && type === 'expenses') {
      return fail(res, 'Acesso restrito', 403);
    }
    if (!isAdminRequest && !req.user?.memberId) {
      return fail(res, 'Acesso restrito', 403);
    }
    const monthValue = month ? Number(month) : null;
    const yearValue = year ? Number(year) : null;
    let rows = [];
    if (type === 'expenses') {
      let sql = `SELECT e.title,
        e.amount,
        e.expense_date AS date,
        e.category,
        e.notes,
        ev.name AS event,
        e.attachment_name AS attachmentName,
        e.attachment_url AS attachmentUrl
        FROM expenses e
        LEFT JOIN events ev ON ev.id = e.event_id
        WHERE 1 = 1`;
      const params = [];
      if (yearValue) {
        sql += config.useSupabase ? ' AND EXTRACT(YEAR FROM expense_date) = ?' : " AND strftime('%Y', expense_date) = ?";
        params.push(yearValue);
      }
      if (monthValue) {
        sql += config.useSupabase ? ' AND EXTRACT(MONTH FROM expense_date) = ?' : " AND strftime('%m', expense_date) = ?";
        params.push(config.useSupabase ? monthValue : String(monthValue).padStart(2, '0'));
      }
      sql += ' ORDER BY expense_date DESC';
      rows = await query(sql, params);
    } else {
      let sql = `
        SELECT m.name AS member,
               p.month,
               p.year,
               p.amount,
               p.paid,
               p.paid_at AS paidAt,
               p.notes,
               g.title AS goal,
               p.attachment_name AS attachmentName,
               p.attachment_url AS attachmentUrl
        FROM payments p
        JOIN members m ON m.id = p.member_id
        LEFT JOIN goals g ON g.id = p.goal_id
        WHERE 1 = 1
      `;
      const params = [];
      if (!isAdminRequest && req.user?.memberId) {
        sql += ' AND p.member_id = ?';
        params.push(req.user.memberId);
      }
      if (yearValue) {
        sql += ' AND year = ?';
        params.push(yearValue);
      }
      if (monthValue) {
        sql += ' AND month = ?';
        params.push(monthValue);
      }
      sql += ' ORDER BY p.year DESC, p.month DESC, m.name ASC';
      rows = await query(sql, params);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${type}.pdf"`);
      doc.pipe(res);
      const settings = await getSettings();
      if (type === 'expenses') {
        renderExpensesReport(doc, rows, { month: monthValue, year: yearValue }, settings);
      } else {
        renderPaymentsReport(doc, rows, { month: monthValue, year: yearValue }, settings);
      }
      doc.end();
    } else {
      const headers =
        type === 'expenses'
          ? ['title', 'amount', 'date', 'category', 'event', 'notes', 'attachmentName', 'attachmentUrl']
          : ['member', 'month', 'year', 'amount', 'paid', 'paidAt', 'goal', 'notes', 'attachmentName', 'attachmentUrl'];
      const csvLines = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => `"${row[header] ?? ''}"`).join(','))
      ];
      const csv = csvLines.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${type}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
