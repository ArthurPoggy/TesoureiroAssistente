// Util compartilhado pelos hooks de dados (usePayments, useExpenses, useMembers, ...)
// para evitar repetir o padrão `try { await ... } catch (error) { handleError(error); }`
// em cada chamada de API.
//
// Executa `asyncFn`, encaminha qualquer erro para `handleError` e resolve com
// `undefined` nesse caso — o erro nunca é propagado para quem chamou `runRequest`.
export async function runRequest(handleError, asyncFn) {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error);
    return undefined;
  }
}
