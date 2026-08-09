import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Valida contraste WCAG AA (4.5:1 para texto normal, 3:1 para texto grande) nos pares
// texto/fundo definidos em variables.css que são efetivamente usados no sistema:
// texto primário/secundário/muted/light sobre bg-primary/bg-secondary, cores de status
// (foreground sobre bg) e badges/ranking. Também cobre tokens usados diretamente como
// `color` de texto em outros arquivos CSS (ex.: --color-text-light no footer,
// --color-error no botão de remover tag), não apenas as variantes "-text" já pensadas
// para foreground.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesDir = path.resolve(__dirname, '..', 'styles');

function readCss(file) {
  return fs.readFileSync(path.join(stylesDir, file), 'utf-8');
}

function extractVar(css, name) {
  // Captura apenas declarações --nome: #hex; (ignora referências var(--nome))
  const regex = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`);
  const match = css.match(regex);
  return match ? match[1] : null;
}

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const num = parseInt(h.slice(0, 6), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const [hi, lo] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (hi + 0.05) / (lo + 0.05);
}

const variablesCss = readCss('variables.css');

const tokens = {
  textPrimary: extractVar(variablesCss, 'color-text-primary'),
  textSecondary: extractVar(variablesCss, 'color-gray-600'),
  textMuted: extractVar(variablesCss, 'color-gray-500'),
  textLight: extractVar(variablesCss, 'color-gray-400'),
  primary: extractVar(variablesCss, 'color-primary'),
  bgSecondary: extractVar(variablesCss, 'color-bg-secondary'),
  grayGray100: extractVar(variablesCss, 'color-gray-100'), // usado por --color-bg-primary
  success: extractVar(variablesCss, 'color-success'),
  successText: extractVar(variablesCss, 'color-success-text'),
  successBg: extractVar(variablesCss, 'color-success-bg'),
  error: extractVar(variablesCss, 'color-error'),
  errorText: extractVar(variablesCss, 'color-error-text'),
  errorBg: extractVar(variablesCss, 'color-error-bg'),
  warning: extractVar(variablesCss, 'color-warning'),
  warningText: extractVar(variablesCss, 'color-warning-text'),
  warningBg: extractVar(variablesCss, 'color-warning-bg'),
  info: extractVar(variablesCss, 'color-info'),
  infoText: extractVar(variablesCss, 'color-info-text'),
  infoBg: extractVar(variablesCss, 'color-info-bg'),
  rankGold: extractVar(variablesCss, 'color-rank-gold'),
  rankGoldBg: extractVar(variablesCss, 'color-rank-gold-bg'),
};

describe('Tokens de cor essenciais existem em variables.css', () => {
  it('todos os tokens usados nas checagens de contraste estão definidos como cor hex', () => {
    for (const [name, value] of Object.entries(tokens)) {
      expect(value, `token ${name} não encontrado ou não é hex em variables.css`).not.toBeNull();
    }
  });
});

describe('Contraste WCAG AA — texto sobre fundos (mínimo 4.5:1 para texto normal)', () => {
  const bgPrimary = () => tokens.grayGray100; // alias de --color-bg-primary
  const bgSecondary = () => tokens.bgSecondary;

  it('texto primário sobre bg-secondary (branco) atende >= 4.5:1', () => {
    expect(contrastRatio(tokens.textPrimary, bgSecondary())).toBeGreaterThanOrEqual(4.5);
  });

  it('texto primário sobre bg-primary atende >= 4.5:1', () => {
    expect(contrastRatio(tokens.textPrimary, bgPrimary())).toBeGreaterThanOrEqual(4.5);
  });

  it('texto secundário (gray-600) sobre bg-secondary atende >= 4.5:1', () => {
    expect(contrastRatio(tokens.textSecondary, bgSecondary())).toBeGreaterThanOrEqual(4.5);
  });

  it('texto muted (gray-500) sobre bg-secondary atende >= 4.5:1', () => {
    expect(contrastRatio(tokens.textMuted, bgSecondary())).toBeGreaterThanOrEqual(4.5);
  });

  // client/src/styles/base.css usa --color-text-light (gray-400) como cor de texto real
  // em `footer .credits` (font-size 0.85rem / 13.6px, peso 500 — não se qualifica como
  // "texto grande" pelos critérios do WCAG, que exigem >= 18.66px em negrito ou >= 24px).
  it('texto light (gray-400), usado como texto no footer, atende >= 4.5:1 sobre bg-secondary', () => {
    expect(contrastRatio(tokens.textLight, bgSecondary())).toBeGreaterThanOrEqual(4.5);
  });

  it('texto light (gray-400), usado como texto no footer, atende >= 4.5:1 sobre bg-primary', () => {
    expect(contrastRatio(tokens.textLight, bgPrimary())).toBeGreaterThanOrEqual(4.5);
  });

  it('cor primária (--color-primary) usada como texto/link sobre bg-secondary atende >= 4.5:1', () => {
    expect(contrastRatio(tokens.primary, bgSecondary())).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Contraste WCAG AA — status (foreground "-text" sobre "-bg", pensados para badges)', () => {
  it('success-text sobre success-bg atende >= 4.5:1', () => {
    expect(contrastRatio(tokens.successText, tokens.successBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('error-text sobre error-bg atende >= 4.5:1', () => {
    expect(contrastRatio(tokens.errorText, tokens.errorBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('warning-text sobre warning-bg atende >= 4.5:1', () => {
    expect(contrastRatio(tokens.warningText, tokens.warningBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('info-text sobre info-bg atende >= 4.5:1', () => {
    expect(contrastRatio(tokens.infoText, tokens.infoBg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Contraste WCAG AA — cores de status "cruas" usadas diretamente como texto no app', () => {
  // client/src/styles/projects.css define `.member-tag-remove { color: var(--color-error); }`
  // sobre fundo branco (bg-secondary) — não é a variante "-text" pensada para foreground.
  it('--color-error usado como texto (botão remover tag) atende >= 4.5:1 sobre bg-secondary', () => {
    expect(contrastRatio(tokens.error, tokens.bgSecondary)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Contraste WCAG AA — ranking/badges (mínimo 3:1 para elementos grandes/decorativos com texto grande)', () => {
  it('rank-gold sobre rank-gold-bg atende >= 3:1', () => {
    expect(contrastRatio(tokens.rankGold, tokens.rankGoldBg)).toBeGreaterThanOrEqual(3);
  });
});
