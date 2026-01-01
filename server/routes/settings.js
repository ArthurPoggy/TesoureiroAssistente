const express = require('express');
const { success, fail } = require('../utils/response');
const { requireAdmin } = require('../middleware/auth');
const { getCurrentBalance, setCurrentBalance } = require('../utils/settings');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const currentBalance = await getCurrentBalance();
    success(res, { currentBalance });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/balance', requireAdmin, async (req, res) => {
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
