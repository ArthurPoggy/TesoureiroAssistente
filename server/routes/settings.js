const express = require('express');
const { success, fail } = require('../utils/response');
const { requireAdmin, requireAuth, requirePrivileged } = require('../middleware/auth');
const {
  DEFAULT_SETTINGS,
  getSettings,
  getPublicSettings,
  setSettings,
  getCurrentBalance,
  setCurrentBalance,
  normalizeDueDay
} = require('../utils/settings');

const router = express.Router();

router.get('/', requirePrivileged, async (req, res) => {
  try {
    const settings = await getSettings();
    const currentBalance = await getCurrentBalance();
    const defaultPaymentAmount = Number(settings.default_payment_amount);
    const paymentDueDay = normalizeDueDay(settings.payment_due_day);
    success(res, {
      orgName: settings.org_name || DEFAULT_SETTINGS.org_name,
      orgTagline: settings.org_tagline ?? DEFAULT_SETTINGS.org_tagline,
      defaultPaymentAmount: Number.isNaN(defaultPaymentAmount)
        ? Number(DEFAULT_SETTINGS.default_payment_amount)
        : defaultPaymentAmount,
      documentFooter: settings.document_footer ?? DEFAULT_SETTINGS.document_footer,
      paymentDueDay,
      pixKey: settings.pix_key || '',
      pixReceiver: settings.pix_receiver || '',
      dashboardNote: settings.dashboard_note || '',
      disclaimerText: settings.disclaimer_text ?? DEFAULT_SETTINGS.disclaimer_text,
      currentBalance
    });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/disclaimer', async (req, res) => {
  try {
    const settings = await getPublicSettings();
    success(res, { disclaimerText: settings.disclaimerText || '' });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/public', requireAuth, async (req, res) => {
  try {
    const settings = await getPublicSettings();
    success(res, settings);
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/', requirePrivileged, async (req, res) => {
  try {
    const {
      orgName,
      orgTagline,
      defaultPaymentAmount,
      documentFooter,
      currentBalance,
      paymentDueDay,
      pixKey,
      pixReceiver,
      dashboardNote,
      disclaimerText
    } = req.body || {};
    const parsedAmount = Number(defaultPaymentAmount);
    if (Number.isNaN(parsedAmount)) {
      return fail(res, 'Informe um valor padrão válido');
    }
    let dueDayValue = '';
    if (paymentDueDay !== undefined && paymentDueDay !== null && String(paymentDueDay).trim() !== '') {
      const parsedDueDay = Number(paymentDueDay);
      if (!Number.isInteger(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
        return fail(res, 'Informe um dia de vencimento válido (1 a 31)');
      }
      dueDayValue = parsedDueDay;
    }
    const parsedBalance = Number(currentBalance);
    if (Number.isNaN(parsedBalance)) {
      return fail(res, 'Informe um saldo válido');
    }
    await setSettings({
      org_name: orgName ?? DEFAULT_SETTINGS.org_name,
      org_tagline: orgTagline ?? DEFAULT_SETTINGS.org_tagline,
      default_payment_amount: parsedAmount,
      document_footer: documentFooter ?? DEFAULT_SETTINGS.document_footer,
      payment_due_day: dueDayValue,
      pix_key: pixKey ?? '',
      pix_receiver: pixReceiver ?? '',
      dashboard_note: dashboardNote ?? '',
      disclaimer_text: disclaimerText ?? DEFAULT_SETTINGS.disclaimer_text
    });
    await setCurrentBalance(parsedBalance);
    const settings = await getSettings();
    const refreshedBalance = await getCurrentBalance();
    const defaultPaymentAmountValue = Number(settings.default_payment_amount);
    const refreshedDueDay = normalizeDueDay(settings.payment_due_day);
    success(res, {
      orgName: settings.org_name || DEFAULT_SETTINGS.org_name,
      orgTagline: settings.org_tagline ?? DEFAULT_SETTINGS.org_tagline,
      defaultPaymentAmount: Number.isNaN(defaultPaymentAmountValue)
        ? Number(DEFAULT_SETTINGS.default_payment_amount)
        : defaultPaymentAmountValue,
      documentFooter: settings.document_footer ?? DEFAULT_SETTINGS.document_footer,
      paymentDueDay: refreshedDueDay,
      pixKey: settings.pix_key || '',
      pixReceiver: settings.pix_receiver || '',
      dashboardNote: settings.dashboard_note || '',
      disclaimerText: settings.disclaimer_text ?? DEFAULT_SETTINGS.disclaimer_text,
      currentBalance: refreshedBalance
    });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/balance', requirePrivileged, async (req, res) => {
  try {
    const { value } = req.body || {};
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return fail(res, 'Informe um saldo válido');
    }
    await setCurrentBalance(parsed);
    success(res, { currentBalance: parsed });
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
