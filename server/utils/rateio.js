// Calcula o rateio de um valor entre participantes, dividindo igualmente e
// distribuindo os centavos restantes (um a um) entre os primeiros membros,
// de modo que a soma das cotas seja exatamente igual ao valor total.
function computeRateio(totalAmount, participantIds = []) {
  const ids = Array.isArray(participantIds) ? participantIds : [];
  const n = ids.length;
  if (n === 0) return [];

  const totalCents = Math.round(Number(totalAmount) * 100);
  if (!Number.isFinite(totalCents) || totalCents < 0) {
    throw new Error('Valor inválido para rateio');
  }

  const baseCents = Math.floor(totalCents / n);
  let remainder = totalCents - baseCents * n;

  return ids.map((memberId) => {
    let cents = baseCents;
    if (remainder > 0) {
      cents += 1;
      remainder -= 1;
    }
    return { memberId, amount: cents / 100 };
  });
}

module.exports = { computeRateio };
