const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { success, fail } = require('../utils/response');
const { requireAuth, requireAdmin, requirePrivileged } = require('../middleware/auth');
const {
  DEFAULT_SETTINGS,
  getSettings,
  getPublicSettings,
  getMemberSettings,
  setSettings,
  getCurrentBalance,
  setCurrentBalance,
  normalizeDueDay
} = require('../utils/settings');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_BACKGROUND_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_BACKGROUND_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};
const BACKGROUND_TARGETS = {
  login: { urlKey: 'login_background_url', versionKey: 'login_background_version' },
  dashboard: { urlKey: 'dashboard_background_url', versionKey: 'dashboard_background_version' }
};

const backgroundImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BACKGROUND_IMAGE_SIZE }
}).single('image');

const handleBackgroundImageUpload = (req, res, next) => {
  backgroundImageUpload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return fail(res, 'Imagem acima de 5 MB', 400);
      }
      return fail(res, error.message || 'Erro ao processar a imagem', 400);
    }
    if (error) {
      return fail(res, error.message || 'Erro ao processar a imagem', 400);
    }
    return next();
  });
};

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
      pixCity: settings.pix_city || '',
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

// Deslogado por natureza: alimenta a tela de login, que não tem sessão ainda.
// Retorna apenas o subconjunto seguro (sem chave PIX, recebedor, cidade do PIX
// ou aviso interno do tesoureiro) — ver getPublicSettings em utils/settings.js.
router.get('/public', async (req, res) => {
  try {
    const settings = await getPublicSettings();
    success(res, settings);
  } catch (error) {
    fail(res, error.message);
  }
});

// Autenticado (qualquer papel): alimenta o painel já logado, que exibe chave
// PIX e aviso interno do tesoureiro para os membros.
router.get('/member', requireAuth, async (req, res) => {
  try {
    const settings = await getMemberSettings();
    success(res, settings);
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/background-image', requireAdmin, handleBackgroundImageUpload, async (req, res) => {
  try {
    const target = req.body?.target;
    const targetConfig = BACKGROUND_TARGETS[target];
    if (!targetConfig) {
      return fail(res, 'Informe um destino válido (login ou dashboard)', 400);
    }
    if (!req.file) {
      return fail(res, 'Selecione uma imagem', 400);
    }
    const extension = ALLOWED_BACKGROUND_MIME_TYPES[req.file.mimetype];
    if (!extension) {
      return fail(res, 'Formato inválido. Envie uma imagem JPG, PNG ou WebP', 400);
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const filename = `${crypto.randomUUID()}${extension}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);
    const version = String(Date.now());
    const url = `/uploads/${filename}`;
    await setSettings({
      [targetConfig.urlKey]: url,
      [targetConfig.versionKey]: version
    });
    success(res, { url: `${url}?v=${version}` });
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
      pixCity,
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
      pix_city: pixCity ?? '',
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
      pixCity: settings.pix_city || '',
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
