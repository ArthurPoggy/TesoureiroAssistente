// Validações de campos obrigatórios reaproveitadas entre as rotas críticas
// (auth, payments, expenses). Mantém a mesma semântica de "falsy" usada
// historicamente nessas rotas (0, '', null, undefined e NaN são inválidos).

// Recebe um mapa { nomeDoCampo: valor } e retorna `message` se algum
// valor for falsy, ou `null` se todos os campos estiverem preenchidos.
const requireFields = (fields, message) => {
  const hasMissing = Object.values(fields).some((value) => !value);
  return hasMissing ? message : null;
};

// Valida que `amount` é um número finito e não-negativo (usado em payments
// e expenses, onde valores negativos ou não numéricos não fazem sentido de
// negócio). Retorna `message` quando inválido, ou `null` quando ok.
const validateNonNegativeAmount = (amount, message) => {
  const numericAmount = Number(amount);
  const isInvalid = Number.isNaN(numericAmount) || numericAmount < 0;
  return isInvalid ? message : null;
};

module.exports = {
  requireFields,
  validateNonNegativeAmount
};
