import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cobre a subtask "Validar botões, inputs, badges e tabelas com a nova paleta/fonte":
// os pills de status (badges de membro/projeto/extrato) devem consumir os tokens de
// cor definidos em variables.css, nunca uma cor hexadecimal solta na declaração.
// `var(--token, #fallback)` é aceitável (o fallback só entra se o token não existir);
// o que não pode ocorrer é `background: #dcfce7;` fora de um var().

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesDir = path.resolve(__dirname, '..', 'styles');

function readCss(file) {
  return fs.readFileSync(path.join(stylesDir, file), 'utf-8');
}

// Extrai o corpo de todas as regras cujo seletor bate com o regex informado.
function extractRuleBodies(css, selectorPattern) {
  const bodies = [];
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    if (selectorPattern.test(selector)) {
      bodies.push({ selector, body: match[2] });
    }
  }
  return bodies;
}

// Dentro do corpo de uma regra, encontra declarações color/background/border-color
// cujo valor contenha um hex que NÃO esteja dentro de var(...).
function findBareHexDeclarations(body) {
  const withoutVarCalls = body.replace(/var\([^)]*\)/g, '');
  const declRegex = /(color|background(?:-color)?|border(?:-color)?|border(?:-top|-bottom|-left|-right)?)\s*:\s*([^;]+);/g;
  const offenders = [];
  let m;
  while ((m = declRegex.exec(withoutVarCalls)) !== null) {
    const prop = m[1];
    const value = m[2];
    if (/#[0-9a-fA-F]{3,8}/.test(value)) {
      offenders.push(`${prop}: ${value.trim()}`);
    }
  }
  return offenders;
}

const badgeFiles = ['members.css', 'projects.css', 'extrato.css'];
const badgeSelectorPattern = /badge|status-active|status-inactive|pill|tag/i;

describe('Badges/pills consomem tokens de cor (sem hex solto)', () => {
  for (const file of badgeFiles) {
    it(`${file}: regras de badge/status/pill não usam hex fora de var()`, () => {
      const css = readCss(file);
      const rules = extractRuleBodies(css, badgeSelectorPattern);
      expect(rules.length, `nenhuma regra de badge/status/pill encontrada em ${file}`).toBeGreaterThan(0);

      const offenders = [];
      for (const rule of rules) {
        const bare = findBareHexDeclarations(rule.body);
        if (bare.length > 0) {
          offenders.push(`${rule.selector} { ${bare.join(' ')} }`);
        }
      }

      expect(
        offenders,
        `declarações com hex solto (fora de var()) encontradas:\n${offenders.join('\n')}`,
      ).toEqual([]);
    });
  }
});
