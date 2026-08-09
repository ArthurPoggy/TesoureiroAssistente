import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Verifica que a fonte Inter é carregada localmente via @fontsource (offline-first),
// com os pesos 400/500/600/700 e font-display: swap, em vez de depender apenas do
// fallback system-ui (que é o que acontece hoje, já que nenhum arquivo de fonte é
// efetivamente baixado/importado no projeto).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, '..', '..');
const srcRoot = path.resolve(clientRoot, 'src');

function listSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(full));
    } else if (/\.(jsx?|css)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe('Carregamento da fonte oficial Inter via @fontsource', () => {
  it('declara @fontsource/inter como dependência do client (offline-first, sem CDN)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(clientRoot, 'package.json'), 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps).toHaveProperty('@fontsource/inter');
  });

  it('importa em um ponto central os pesos 400, 500, 600 e 700 de @fontsource/inter', () => {
    const files = listSourceFiles(srcRoot);
    const importRegex = /@fontsource\/inter\/(\d{3})\.css/g;

    const foundWeights = new Set();
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        foundWeights.add(match[1]);
      }
    }

    expect(Array.from(foundWeights).sort()).toEqual(['400', '500', '600', '700']);
  });

  it('os arquivos de fonte baixados pelo @fontsource/inter aplicam font-display: swap', () => {
    const fontsourcePkgDir = path.join(clientRoot, 'node_modules', '@fontsource', 'inter');
    expect(
      fs.existsSync(fontsourcePkgDir),
      '@fontsource/inter precisa estar instalado em node_modules (offline-first, sem depender de CDN em runtime)'
    ).toBe(true);

    for (const weight of ['400', '500', '600', '700']) {
      const cssPath = path.join(fontsourcePkgDir, `${weight}.css`);
      expect(fs.existsSync(cssPath), `${weight}.css deveria existir em @fontsource/inter`).toBe(true);
      const css = fs.readFileSync(cssPath, 'utf-8');
      expect(css).toMatch(/font-display:\s*swap/);
    }
  });

  it('mantém --font-family em variables.css com Inter como fonte primária e system-ui como fallback', () => {
    const variablesCss = fs.readFileSync(
      path.join(srcRoot, 'styles', 'variables.css'),
      'utf-8'
    );
    const match = variablesCss.match(/--font-family:\s*([^;]+);/);
    expect(match, '--font-family deveria estar definida em variables.css').not.toBeNull();
    expect(match[1]).toMatch(/Inter/);
    expect(match[1]).toMatch(/system-ui/);
  });
});
