import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesDir = path.resolve(__dirname, '../src/styles');

/**
 * Hardening preventivo: o wrapper da tabela de pagamentos mensais
 * (.table-wrapper, usado por PaymentsPanel) passa a declarar um z-index
 * explícito via token de variables.css (--z-base), eliminando a ausência
 * de valor explícito (equivalente a "auto") que antes existia em
 * tables.css e evitando qualquer número mágico solto.
 *
 * Três investigações independentes confirmaram que não há sobreposição
 * real hoje entre o wrapper da tabela e .member-detail-panel (irmãos em
 * fluxo de bloco normal, sem position/z-index/margem negativa capaz de
 * gerar overlap). Este teste nasce verde e serve como guarda de
 * regressão: garante que a camada do wrapper da tabela permaneça sempre
 * numericamente menor ou igual à camada do painel de detalhe do membro,
 * travando contra uma futura inversão acidental de empilhamento (ex.: se
 * alguém adicionar um z-index maior ao wrapper sem querer).
 */
test.describe('z-index padronizado via token (.table-wrapper da tabela de pagamentos)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html>
        <body>
          <div class="table-wrapper">
            <table><tbody><tr><td>linha</td></tr></tbody></table>
          </div>
          <div class="member-detail-panel">painel de detalhe do membro</div>
        </body>
      </html>`);
    await page.addStyleTag({ path: path.join(stylesDir, 'variables.css') });
    await page.addStyleTag({ path: path.join(stylesDir, 'tables.css') });
    await page.addStyleTag({ path: path.join(stylesDir, 'members.css') });
  });

  test('.table-wrapper usa o token --z-base (nenhum valor numérico solto)', async ({ page }) => {
    const { wrapperZIndex, baseToken } = await page.evaluate(() => {
      const wrapper = document.querySelector('.table-wrapper');
      return {
        wrapperZIndex: getComputedStyle(wrapper).zIndex,
        baseToken: getComputedStyle(document.documentElement).getPropertyValue('--z-base').trim()
      };
    });

    expect(baseToken).toBe('1');
    expect(wrapperZIndex).toBe(baseToken);
  });

  test('guarda de regressão: o wrapper da tabela de pagamentos fica numericamente <= ao painel de detalhe do membro', async ({ page }) => {
    const { wrapperZIndex, panelZIndex } = await page.evaluate(() => {
      const wrapper = document.querySelector('.table-wrapper');
      const panel = document.querySelector('.member-detail-panel');
      return {
        wrapperZIndex: Number(getComputedStyle(wrapper).zIndex),
        panelZIndex: Number(getComputedStyle(panel).zIndex)
      };
    });

    expect(wrapperZIndex).toBeLessThanOrEqual(panelZIndex);
  });
});
