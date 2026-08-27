const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// Normaliza os parâmetros de paginação vindos da query string, garantindo
// page >= 1 e 1 <= pageSize <= MAX_PAGE_SIZE mesmo com entradas ausentes,
// não numéricas ou fora da faixa. Usado por toda rota paginada (payments,
// extrato, ...) para evitar duplicar o mesmo clamp em cada handler.
function parsePagination(page, pageSize) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize) || DEFAULT_PAGE_SIZE));
  const offset = (pageNum - 1) * pageSizeNum;
  return { pageNum, pageSizeNum, offset };
}

module.exports = { parsePagination, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
