import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesDir = path.resolve(__dirname, '../src/styles');

/**
 * Hardening preventivo: padroniza o z-index de .member-detail-panel e do
 * overlay de carregamento da tabela de pagamentos (.table-loading-overlay)
 * usando os tokens de client/src/styles/variables.css, garantindo que o
 * painel de detalhe do membro fique acima do fluxo normal de conteúdo
 * (--z-base) e abaixo de overlays de UI (--z-sticky), sem números soltos.
 *
 * Não reproduz um bug de sobreposição (nenhuma das três investigações
 * anteriores encontrou overlap real entre os dois elementos, que são
 * irmãos em fluxo de bloco normal). Este teste nasce verde e serve como
 * guarda de regressão: se algum dia o token for trocado por um valor
 * numérico solto, ou a ordem de empilhamento for invertida, o teste falha.
 */
test.describe('z-index padronizado via tokens (member-detail-panel x tabela de pagamentos)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html>
        <body>
          <div class="member-detail-panel">painel de detalhe do membro</div>
          <div class="table-wrapper table-wrapper--loading">
            <table><tbody><tr><td>linha</td></tr></tbody></table>
            <div class="table-loading-overlay">carregando...</div>
          </div>
        </body>
      </html>`);
    await page.addStyleTag({ path: path.join(stylesDir, 'variables.css') });
    await page.addStyleTag({ path: path.join(stylesDir, 'members.css') });
    await page.addStyleTag({ path: path.join(stylesDir, 'tables.css') });
  });

  test('.member-detail-panel usa o token --z-base (nenhum valor numérico solto)', async ({ page }) => {
    const { panelZIndex, baseToken } = await page.evaluate(() => {
      const panel = document.querySelector('.member-detail-panel');
      return {
        panelZIndex: getComputedStyle(panel).zIndex,
        baseToken: getComputedStyle(document.documentElement).getPropertyValue('--z-base').trim()
      };
    });

    expect(baseToken).toBe('1');
    expect(panelZIndex).toBe(baseToken);
  });

  test('.table-loading-overlay usa o token --z-sticky', async ({ page }) => {
    const { overlayZIndex, stickyToken } = await page.evaluate(() => {
      const overlay = document.querySelector('.table-loading-overlay');
      return {
        overlayZIndex: getComputedStyle(overlay).zIndex,
        stickyToken: getComputedStyle(document.documentElement).getPropertyValue('--z-sticky').trim()
      };
    });

    expect(stickyToken).toBe('200');
    expect(overlayZIndex).toBe(stickyToken);
  });

  test('guarda de regressão: o painel do membro fica abaixo dos overlays de UI da tabela', async ({ page }) => {
    const { panelZIndex, overlayZIndex } = await page.evaluate(() => {
      const panel = document.querySelector('.member-detail-panel');
      const overlay = document.querySelector('.table-loading-overlay');
      return {
        panelZIndex: Number(getComputedStyle(panel).zIndex),
        overlayZIndex: Number(getComputedStyle(overlay).zIndex)
      };
    });

    expect(panelZIndex).toBeLessThan(overlayZIndex);
  });
});
