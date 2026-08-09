import { test, expect, request as playwrightRequest } from '@playwright/test';

// A API roda em porta separada do dev server do Vite (baseURL do playwright.config.js).
// OBS: o APIRequestContext resolve paths que começam com "/" a partir da raiz
// do baseURL (como `new URL(path, baseURL)`), então o baseURL fica só a origem
// e cada chamada usa o prefixo "/api" explicitamente.
const API_BASE_URL = 'http://localhost:4000';

// Credenciais do usuário de teste (seed de dev). A senha NÃO tem fallback
// literal no código (evita alertas de "segredo hardcoded" em scanners como o
// GitGuardian): exporte E2E_DIRETOR_PASSWORD com o mesmo valor configurado em
// SEED_TEST_PASSWORD (ver server/routes/seed.js) antes de rodar `npm run test:e2e`.
const DIRETOR_EMAIL = process.env.E2E_DIRETOR_EMAIL || 'diretor_teste@clan.com';
const DIRETOR_PASSWORD = process.env.E2E_DIRETOR_PASSWORD;
if (!DIRETOR_PASSWORD) {
  throw new Error(
    'E2E_DIRETOR_PASSWORD não definida: exporte a senha do usuário de teste antes de rodar os specs de e2e.'
  );
}

// Anos "no futuro" garantem que nossos registros de teste fiquem sempre nas
// primeiras páginas (ORDER BY year DESC, month DESC), sem interferir/depender
// dos dados reais já existentes no banco de desenvolvimento.
const YEAR_PAGE_1 = 2099;
const YEAR_PAGE_2 = 2098;
const RECORDS_PER_PAGE = 10; // menor opção real de "Por página" no PaymentsPanel
const LONG_GOAL_TITLE_HINT = 'Equipamentos de Transmissão';

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

async function createPayment(apiContext, token, payload) {
  const res = await apiContext.post('/api/payments', {
    headers: authHeaders(token),
    data: payload
  });
  expect(res.ok(), `POST /payments deveria funcionar para ${JSON.stringify(payload)}`).toBeTruthy();
  const body = await res.json();
  return body.payment.id;
}

/**
 * Lê, para a página atualmente renderizada, a largura (bounding box) de cada
 * célula do cabeçalho e de cada linha do corpo, além da contagem de colunas
 * por linha. Serve para comparar a "forma" da tabela entre páginas.
 */
async function readTableShape(table) {
  const headerCells = table.locator('thead th');
  const headerCount = await headerCells.count();
  const headerWidths = [];
  for (let i = 0; i < headerCount; i += 1) {
    const box = await headerCells.nth(i).boundingBox();
    headerWidths.push(box ? Math.round(box.width) : null);
  }

  const rows = table.locator('tbody tr');
  const rowCount = await rows.count();
  const rowsShape = [];
  for (let r = 0; r < rowCount; r += 1) {
    const cells = rows.nth(r).locator('td');
    const cellCount = await cells.count();
    const widths = [];
    for (let c = 0; c < cellCount; c += 1) {
      const box = await cells.nth(c).boundingBox();
      widths.push(box ? Math.round(box.width) : null);
    }
    rowsShape.push({ cellCount, widths });
  }

  return { headerCount, headerWidths, rowsShape };
}

test.describe('Paginação da tabela de pagamentos mensais', () => {
  let apiContext;
  let token;
  let memberId;
  let goalId;
  const createdPaymentIds = [];

  test.beforeAll(async () => {
    apiContext = await playwrightRequest.newContext({ baseURL: API_BASE_URL });

    const loginRes = await apiContext.post('/api/login', {
      data: { email: DIRETOR_EMAIL, password: DIRETOR_PASSWORD }
    });
    expect(loginRes.ok(), 'login do usuário de teste (diretor_teste) deve funcionar').toBeTruthy();
    const loginBody = await loginRes.json();
    token = loginBody.token;
    memberId = loginBody.memberId;

    const goalsRes = await apiContext.get('/api/goals', { headers: authHeaders(token) });
    expect(goalsRes.ok()).toBeTruthy();
    const goalsBody = await goalsRes.json();
    const longGoal =
      goalsBody.goals.find((g) => g.title === LONG_GOAL_TITLE_HINT) ||
      [...goalsBody.goals].sort((a, b) => b.title.length - a.title.length)[0];
    expect(longGoal, 'é necessário ao menos uma meta cadastrada para o teste').toBeTruthy();
    goalId = longGoal.id;

    // Página 1: registros "enxutos" — sem meta, valor curto.
    for (let month = 1; month <= RECORDS_PER_PAGE; month += 1) {
      const id = await createPayment(apiContext, token, {
        memberId,
        month,
        year: YEAR_PAGE_1,
        amount: 10,
        paid: true,
        paidAt: `${YEAR_PAGE_1}-01-05`
      });
      createdPaymentIds.push(id);
    }

    // Página 2: registros "largos" — meta com título longo e valor alto,
    // que naturalmente exigem colunas mais largas que a página 1.
    for (let month = 1; month <= RECORDS_PER_PAGE; month += 1) {
      const id = await createPayment(apiContext, token, {
        memberId,
        month,
        year: YEAR_PAGE_2,
        amount: 1234567,
        paid: true,
        paidAt: `${YEAR_PAGE_2}-01-05`,
        goalId
      });
      createdPaymentIds.push(id);
    }
  });

  test.afterAll(async () => {
    if (!apiContext) return;
    for (const id of createdPaymentIds) {
      await apiContext.delete(`/api/payments/${id}`, { headers: authHeaders(token) });
    }
    await apiContext.dispose();
  });

  test('estrutura e largura das colunas permanecem consistentes ao trocar de página e de tamanho de página', async ({
    page
  }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email').fill(DIRETOR_EMAIL);
    await page.getByPlaceholder('Senha').fill(DIRETOR_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    const panel = page.locator('.panel', { has: page.getByRole('heading', { name: 'Pagamentos mensais' }) });
    const table = panel.locator('table');
    await expect(table).toBeVisible();

    // Usa o controle real de "Por página" (onPageSizeChange) para fixar 10 por página.
    const pageSizeSelect = panel.locator('.table-toolbar-pagesize select');
    await pageSizeSelect.selectOption(String(RECORDS_PER_PAGE));

    // Espera a página 1 carregar exatamente os registros "enxutos" (ano 2099).
    await expect(panel.locator('tbody tr').first().locator('td').nth(1)).toContainText(`/${YEAR_PAGE_1}`);
    await expect(panel.locator('tbody tr')).toHaveCount(RECORDS_PER_PAGE);

    const page1Shape = await readTableShape(table);

    // Navega para a página 2 usando o controle real de paginação (onPageChange).
    await panel.getByRole('button', { name: 'Próxima' }).click();
    await expect(panel.locator('tbody tr').first().locator('td').nth(1)).toContainText(`/${YEAR_PAGE_2}`);
    await expect(panel.locator('tbody tr')).toHaveCount(RECORDS_PER_PAGE);

    const page2Shape = await readTableShape(table);

    // 1) O número de colunas do cabeçalho deve ser o mesmo nas duas páginas.
    expect(page2Shape.headerCount, 'quantidade de colunas do cabeçalho deve ser igual entre páginas').toBe(
      page1Shape.headerCount
    );

    // 2) Toda linha deve ter o mesmo número de células que o cabeçalho, em
    //    ambas as páginas (nenhuma linha "perdendo" a coluna Ações).
    for (const row of [...page1Shape.rowsShape, ...page2Shape.rowsShape]) {
      expect(row.cellCount).toBe(page1Shape.headerCount);
    }

    // 3) A largura de cada coluna do cabeçalho deve permanecer estável ao
    //    trocar de página — a tabela não deve "pular"/redimensionar colunas
    //    apenas porque o conteúdo da página mudou.
    expect(
      page2Shape.headerWidths,
      `larguras do cabeçalho mudaram entre páginas: página 1 = ${JSON.stringify(
        page1Shape.headerWidths
      )}, página 2 = ${JSON.stringify(page2Shape.headerWidths)}`
    ).toEqual(page1Shape.headerWidths);

    // 4) As larguras das células de cada linha devem bater com as larguras
    //    do cabeçalho correspondente, em ambas as páginas.
    for (const row of [...page1Shape.rowsShape, ...page2Shape.rowsShape]) {
      expect(row.widths).toEqual(page1Shape.headerWidths);
    }
  });
});
