import { test, expect, request as playwrightRequest } from '@playwright/test';

// A API roda em porta separada do dev server do Vite (baseURL do playwright.config.js).
const API_BASE_URL = 'http://localhost:4000';

// Credenciais do usuário de teste (seed de dev): sobrescrevíveis via env para
// não deixar segredo em texto plano no código (ver server/routes/seed.js,
// que usa SEED_TEST_PASSWORD com o mesmo fallback local).
const DIRETOR_EMAIL = process.env.E2E_DIRETOR_EMAIL || 'diretor_teste@clan.com';
const DIRETOR_PASSWORD = process.env.E2E_DIRETOR_PASSWORD || 'test123';

// Ano "no futuro", isolado de outros specs que também usam anos futuros
// (ex.: payments-pagination.spec.js usa 2098/2099).
const YEAR_TEST = 2077;
const RECORDS_PER_PAGE = 10; // menor opção real de "Por página" no PaymentsPanel
const TOTAL_RECORDS = 12; // página 1 cheia (10) + página 2 "curta" (2)

// Membro de teste ("Viewer Teste") sem nenhum pagamento pré-existente no
// banco de desenvolvimento e não usado por nenhum outro spec — filtrar por
// ele isola completamente os registros criados aqui, mesmo quando os specs
// rodam em paralelo (evita interferência de dados reais ou de outros testes
// que usam o membro "Diretor Teste").
const TEST_MEMBER_ID = 14;

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

test.describe('Altura da tabela de pagamentos ao paginar (sem colapso/reflow)', () => {
  let apiContext;
  let token;
  const createdPaymentIds = [];

  test.beforeAll(async () => {
    apiContext = await playwrightRequest.newContext({ baseURL: API_BASE_URL });

    const loginRes = await apiContext.post('/api/login', {
      data: { email: DIRETOR_EMAIL, password: DIRETOR_PASSWORD }
    });
    expect(loginRes.ok(), 'login do usuário de teste (diretor_teste) deve funcionar').toBeTruthy();
    const loginBody = await loginRes.json();
    token = loginBody.token;

    // 12 registros no mesmo ano futuro para o membro de teste isolado: com
    // "Por página" = 10, a página 1 fica cheia (10 linhas) e a página 2 fica
    // "curta" (2 linhas) — cenário real de última página parcial, onde o
    // colapso de altura é perceptível.
    for (let month = 1; month <= TOTAL_RECORDS; month += 1) {
      const id = await createPayment(apiContext, token, {
        memberId: TEST_MEMBER_ID,
        month,
        year: YEAR_TEST,
        amount: 10,
        paid: true,
        paidAt: `${YEAR_TEST}-01-05`
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

  test('altura do wrapper da tabela não colapsa ao ir de uma página cheia para uma página curta', async ({
    page
  }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email').fill(DIRETOR_EMAIL);
    await page.getByPlaceholder('Senha').fill(DIRETOR_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    const panel = page.locator('.panel', { has: page.getByRole('heading', { name: 'Pagamentos mensais' }) });
    const wrapper = panel.locator('.table-wrapper');
    await expect(wrapper).toBeVisible();

    // Filtra por membro para isolar os 12 registros criados no teste (o
    // usuário de teste não tem outros pagamentos), evitando que dados reais
    // de outros membros/anos interfiram na contagem esperada por página.
    const memberFilterSelect = panel.locator('.table-toolbar-filters select').first();
    const memberFilterResponse = page.waitForResponse(
      (res) => res.url().includes('/api/payments') && res.request().method() === 'GET'
    );
    await memberFilterSelect.selectOption(String(TEST_MEMBER_ID));
    await memberFilterResponse;

    const pageSizeSelect = panel.locator('.table-toolbar-pagesize select');
    const pageSizeResponse = page.waitForResponse(
      (res) => res.url().includes('/api/payments') && res.request().method() === 'GET'
    );
    await pageSizeSelect.selectOption(String(RECORDS_PER_PAGE));
    await pageSizeResponse;

    // Página 1: cheia (10 registros do nosso ano de teste).
    await expect(panel.locator('tbody tr').first().locator('td').nth(1)).toContainText(`/${YEAR_TEST}`);
    await expect(panel.locator('tbody tr')).toHaveCount(RECORDS_PER_PAGE);
    // Garante que não há requisição de pagamentos ainda pendente antes de medir/navegar.
    await expect(wrapper).not.toHaveClass(/table-wrapper--loading/);

    const fullPageBox = await wrapper.boundingBox();
    expect(fullPageBox, 'wrapper da tabela deveria ter bounding box mensurável na página cheia').toBeTruthy();
    const fullPageHeight = fullPageBox.height;

    // Navega para a página 2 (curta: só 2 registros restantes do nosso ano).
    const nextPageResponse = page.waitForResponse(
      (res) => res.url().includes('/api/payments') && res.request().method() === 'GET'
    );
    await panel.getByRole('button', { name: 'Próxima' }).click();
    await nextPageResponse;
    await expect(wrapper).not.toHaveClass(/table-wrapper--loading/);
    await expect(panel.locator('tbody tr').first().locator('td').nth(1)).toContainText(`/${YEAR_TEST}`);
    await expect(panel.locator('tbody tr')).toHaveCount(TOTAL_RECORDS - RECORDS_PER_PAGE);

    const shortPageBox = await wrapper.boundingBox();
    expect(shortPageBox, 'wrapper da tabela deveria ter bounding box mensurável na página curta').toBeTruthy();
    const shortPageHeight = shortPageBox.height;

    // A altura mínima reservada (baseada na página anterior, cheia) deve
    // impedir que o wrapper colapse visivelmente para caber só 2 linhas: a
    // altura da página curta deve permanecer próxima da altura da página
    // cheia (tolerância pequena para bordas/arredondamento), não proporcional
    // ao número de linhas (o que indicaria colapso/reflow perceptível).
    expect(
      shortPageHeight,
      `altura do wrapper colapsou ao trocar de página: página cheia (10 linhas) = ${fullPageHeight}px, ` +
        `página curta (2 linhas) = ${shortPageHeight}px — esperava-se altura mínima reservada próxima de ${fullPageHeight}px`
    ).toBeGreaterThanOrEqual(fullPageHeight - 8);
  });
});
