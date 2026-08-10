import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Convenção: nenhuma classe CSS referenciada em ExpensesPanel.jsx pode ser
// "órfã" — ou seja, ausente de todo arquivo em client/src/styles. Um
// resíduo desse tipo (ex.: `table-wrapper compact`, onde `compact` nunca
// foi definido em nenhum CSS) é sinal de estilo incompleto/removido e deve
// ser eliminado do JSX, não deixado como classe sem efeito.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesDir = path.resolve(__dirname, '..', 'styles');
const expensesPanelPath = path.resolve(
  __dirname,
  '..',
  'components',
  'expenses',
  'ExpensesPanel.jsx',
);

function collectDefinedClasses(dir) {
  const classes = new Set();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.css')) continue;
    const css = fs.readFileSync(path.join(dir, file), 'utf-8');
    // Captura tokens ".classe" em qualquer posição do arquivo (seletores,
    // inclusive dentro de @media). Não confunde com números decimais em
    // valores (ex.: "0.4rem", "rgba(0,0,0,.1)") porque nesses casos o
    // caractere após o ponto é um dígito, não uma letra/underscore.
    const regex = /\.([a-zA-Z_][\w-]*)/g;
    let match;
    while ((match = regex.exec(css)) !== null) {
      classes.add(match[1]);
    }
  }
  return classes;
}

function extractClassNameTokens(jsx) {
  const tokens = new Set();
  // Cobre className="..." e className={...} (incluindo template literals
  // com interpolação, ex.: `tag-chip${cond ? ' tag-chip--selected' : ''}`).
  const classNameExprRegex = /className=(?:"([^"]*)"|\{([\s\S]*?)\}(?=\s|\/?>))/g;
  let exprMatch;
  while ((exprMatch = classNameExprRegex.exec(jsx)) !== null) {
    const [, plainString, expression] = exprMatch;
    if (plainString !== undefined) {
      plainString.split(/\s+/).filter(Boolean).forEach((token) => tokens.add(token));
      continue;
    }
    // Dentro de className={...}: extrai apenas os literais de string/template,
    // ignorando identificadores de variáveis/condições.
    const literalRegex = /'([^']*)'|"([^"]*)"|`([^`]*)`/g;
    let literalMatch;
    while ((literalMatch = literalRegex.exec(expression)) !== null) {
      const raw = literalMatch[1] ?? literalMatch[2] ?? literalMatch[3] ?? '';
      const withoutInterpolation = raw.replace(/\$\{[^}]*\}/g, ' ');
      withoutInterpolation
        .split(/\s+/)
        .filter(Boolean)
        .forEach((token) => tokens.add(token));
    }
  }
  return tokens;
}

describe('ExpensesPanel.jsx não referencia classes CSS órfãs', () => {
  const definedClasses = collectDefinedClasses(stylesDir);
  const jsx = fs.readFileSync(expensesPanelPath, 'utf-8');
  const usedClasses = extractClassNameTokens(jsx);

  it('encontrou pelo menos uma classe usada no arquivo (sanity check do parser)', () => {
    expect(usedClasses.size).toBeGreaterThan(0);
  });

  it('toda classe usada em className está definida em algum arquivo de client/src/styles', () => {
    const orphanClasses = [...usedClasses].filter((cls) => !definedClasses.has(cls));
    expect(orphanClasses, `classes órfãs (sem CSS correspondente): ${orphanClasses.join(', ')}`).toEqual([]);
  });
});
