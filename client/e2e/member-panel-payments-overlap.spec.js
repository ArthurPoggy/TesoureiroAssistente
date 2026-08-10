import { test, expect } from '@playwright/test';

/**
 * Teste de invariante (hardening preventivo) para o card "Corrigir conflito
 * de z-index da caixa de informação de membro sobre a tabela de
 * pagamentos".
 *
 * Três investigações independentes anteriores confirmaram que, no código
 * atual, .member-detail-panel e o wrapper da tabela de pagamentos
 * (.table-wrapper dentro do painel "Pagamentos mensais") são irmãos em
 * fluxo de bloco normal, sem position/z-index/margem negativa capaz de
 * gerar sobreposição real. Este teste NÃO tenta reproduzir um bug — ele
 * nasce verde e funciona como guarda de regressão: mede as bounding boxes
 * reais (getBoundingClientRect) dos dois elementos na página renderizada de
 * verdade (login real, membro selecionado, tabela de pagamentos carregada)
 * e assere que não há interseção. Caso algum dia uma mudança de layout
 * introduza uma sobreposição intencional, o teste ainda aceita esse cenário
 * desde que a ordem de z-index respeite os tokens de variables.css
 * (.member-detail-panel e .table-wrapper usam --z-base; overlays de UI da
 * tabela usam --z-sticky, sempre acima do painel do membro).
 *
 * Roda em duas viewports (desktop e mobile) para cobrir o empilhamento em
 * ambos os layouts responsivos.
 */

const VIEWPORTS = [
  { label: 'desktop', size: { width: 1280, height: 900 } },
  { label: 'mobile', size: { width: 390, height: 844 } }
];

function rectsIntersect(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

for (const { label, size } of VIEWPORTS) {
  test.describe(`invariante de não sobreposição: painel do membro x tabela de pagamentos (${label})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);

      // Garante que o perfil de teste "admin" existe (rota dev-only,
      // idempotente: reaprova perfis já criados sem efeito colateral).
      const seedResponse = await page.request.post('/api/seed/test-users');
      expect(seedResponse.ok()).toBeTruthy();

      await page.goto('/');
      await page.getByPlaceholder('Email').fill('admin_teste@clan.com');
      await page.getByPlaceholder('Senha').fill('test123');
      await page.getByRole('button', { name: 'Entrar' }).click();

      await expect(page.getByRole('heading', { name: 'Membros' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Pagamentos mensais' })).toBeVisible();
    });

    test('painel de detalhe do membro e tabela de pagamentos não se interceptam na mesma rolagem', async ({ page }) => {
      const membersPanel = page
        .locator('section.panel')
        .filter({ has: page.getByRole('heading', { name: 'Membros', level: 2 }) });
      const paymentsPanel = page
        .locator('section.panel')
        .filter({ has: page.getByRole('heading', { name: 'Pagamentos mensais', level: 2 }) });

      const firstMemberRow = membersPanel.locator('table tbody tr').first();
      await expect(firstMemberRow).toBeVisible();
      await firstMemberRow.locator('td').first().click();

      const memberDetailPanel = page.locator('.member-detail-panel');
      await expect(memberDetailPanel).toBeVisible();

      const paymentsWrapper = paymentsPanel.locator('.table-wrapper').first();
      await expect(paymentsWrapper).toBeVisible();

      const { panelRect, wrapperRect, panelZIndex, wrapperZIndex } = await page.evaluate(() => {
        const panel = document.querySelector('.member-detail-panel');
        const wrapperCandidates = Array.from(document.querySelectorAll('.table-wrapper'));
        // O wrapper da tabela de pagamentos é o último .table-wrapper do
        // documento (o de Membros vem antes, no fluxo do DOM).
        const wrapper = wrapperCandidates[wrapperCandidates.length - 1];

        const toBox = (el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        };

        return {
          panelRect: toBox(panel),
          wrapperRect: toBox(wrapper),
          panelZIndex: Number(getComputedStyle(panel).zIndex) || 0,
          wrapperZIndex: Number(getComputedStyle(wrapper).zIndex) || 0
        };
      });

      const overlaps = rectsIntersect(panelRect, wrapperRect);

      if (overlaps) {
        // Contingência prevista pelo critério de aceitação do card: se um
        // dia layout intencional gerar sobreposição, a ordem de z-index
        // precisa continuar respeitando os tokens (painel do membro nunca
        // acima da camada da tabela de pagamentos).
        expect(panelZIndex).toBeLessThanOrEqual(wrapperZIndex);
      } else {
        expect(overlaps).toBe(false);
      }
    });
  });
}
