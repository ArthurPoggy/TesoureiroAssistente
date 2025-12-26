const success = (res, payload = {}) => res.json({ ok: true, ...payload });

const fail = (res, message, status = 400) => res.status(status).json({ ok: false, message });

module.exports = {
  success,
  fail
};
