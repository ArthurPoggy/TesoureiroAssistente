import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Garante que a escala tipográfica definida em variables.css (--font-size-*,
// --font-weight-*, --line-height-*) é de fato aplicada aos componentes:
// títulos (h1/h2/h3) usam os tokens de tamanho/peso/altura de linha, o corpo
// de texto usa altura de linha >= 1.5 via token, e não há font-size/line-height
// soltos (hard-coded) fora de variables.css.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '..');
const stylesDir = path.join(srcRoot, 'styles');

function listCssFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listCssFiles(full));
    } else if (entry.name.endsWith('.css')) {
      results.push(full);
    }
  }
  return results;
}

function readAllCss() {
  return listCssFiles(stylesDir)
    .filter((file) => path.basename(file) !== 'variables.css')
    .map((file) => ({ file, content: fs.readFileSync(file, 'utf-8') }));
}

// Extrai o bloco de declarações de um seletor simples (ex.: "h1", "body") em um CSS.
function extractRuleBlocks(css, selectorRegex) {
  const blocks = [];
  const ruleStart = new RegExp(selectorRegex.source, 'g');
  let match;
  while ((match = ruleStart.exec(css)) !== null) {
    const openBrace = css.indexOf('{', match.index);
    if (openBrace === -1) continue;
    const closeBrace = css.indexOf('}', openBrace);
    if (closeBrace === -1) continue;
    blocks.push(css.slice(openBrace + 1, closeBrace));
  }
  return blocks;
}

describe('Escala tipográfica aplicada via tokens de variables.css', () => {
  const allCss = readAllCss();
  const fullCss = allCss.map((f) => f.content).join('\n');

  it('define estilos para h1, h2 e h3 usando var(--font-size-*) e var(--font-weight-bold)', () => {
    for (const tag of ['h1', 'h2', 'h3']) {
      const blocks = extractRuleBlocks(fullCss, new RegExp(`(^|[^.\\w-])${tag}\\s*(,|\\{)`));
      expect(
        blocks.length,
        `deveria existir ao menos uma regra de estilo para "${tag}" em client/src/styles`
      ).toBeGreaterThan(0);

      const combined = blocks.join('\n');
      expect(
        combined,
        `${tag} deveria definir font-size usando um token var(--font-size-*)`
      ).toMatch(/font-size:\s*var\(--font-size-/);
      expect(
        combined,
        `${tag} deveria usar peso de destaque via var(--font-weight-bold)`
      ).toMatch(/font-weight:\s*var\(--font-weight-bold\)/);
    }
  });

  it('define a altura de linha do corpo de texto (body) via token com valor mínimo de 1.5', () => {
    const bodyBlocks = extractRuleBlocks(fullCss, /(^|[^.\w-])body\s*\{/);
    expect(bodyBlocks.length, 'deveria existir uma regra "body" em client/src/styles').toBeGreaterThan(0);

    const combined = bodyBlocks.join('\n');
    const varMatch = combined.match(/line-height:\s*var\(--line-height-([a-z]+)\)/);
    expect(
      varMatch,
      'body deveria usar line-height a partir de um token var(--line-height-*), não um valor solto'
    ).not.toBeNull();

    if (varMatch) {
      // base = 1.5, relaxed = 1.65 — ambos atendem o mínimo de 1.5 exigido para o corpo.
      expect(['base', 'relaxed']).toContain(varMatch[1]);
    }
  });

  it('não possui font-size ou line-height com valores numéricos soltos fora de variables.css', () => {
    const offenders = [];
    for (const { file, content } of allCss) {
      const regex = /(font-size|line-height)\s*:\s*(?!var\()[0-9.]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const line = content.slice(0, match.index).split('\n').length;
        offenders.push(`${path.relative(srcRoot, file)}:${line} -> ${match[0]}`);
      }
    }

    expect(
      offenders,
      `Encontrados valores hard-coded de font-size/line-height fora de variables.css:\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
