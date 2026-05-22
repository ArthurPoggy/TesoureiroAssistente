# Identidade visual — TesoureiroAssistente

Guia do design system mínimo do projeto. Todos os tokens visuais estão centralizados em [`client/src/styles/variables.css`](../client/src/styles/variables.css) e devem ser consumidos via `var(--token)` nos demais arquivos CSS.

## Princípios

1. **Tudo via tokens.** Cores, espaçamentos, tipografia e bordas vivem em `variables.css`. Cor hexadecimal solta em outro arquivo é regressão.
2. **Identidade neutra e acessível.** Cores escolhidas atendem contraste WCAG AA mínimo (4.5:1 para texto normal).
3. **Hierarquia clara.** Escala tipográfica e espaçamento seguem progressão consistente, sem valores arbitrários.
4. **Acessível antes de bonito.** Foco visível, estados desabilitados claros, áreas de toque generosas.

---

## Paleta de cores

### Primária — marca

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-primary` | `#2563eb` | Botões primários, links, foco |
| `--color-primary-dark` | `#1d4ed8` | Hover de botão primário |
| `--color-primary-light` | `#3b82f6` | Acentos secundários |
| `--color-primary-bg` | `#eff6ff` | Fundo destacado, highlight |
| `--color-primary-border` | `#cbd5f5` | Borda de elemento destacado |

### Neutra — escala de cinzas

| Token | Hex | Uso típico |
|-------|-----|------------|
| `--color-gray-50` | `#f8fafc` | Fundo de painel sutil |
| `--color-gray-100` | `#f1f5f9` | Fundo da página |
| `--color-gray-200` | `#e2e8f0` | Bordas leves, divisores |
| `--color-gray-300` | `#cbd5f5` | Bordas padrão |
| `--color-gray-400` | `#94a3b8` | Texto desabilitado, placeholder |
| `--color-gray-500` | `#64748b` | Texto auxiliar |
| `--color-gray-600` | `#475569` | Texto secundário |
| `--color-gray-700` | `#334155` | Texto sobre fundo claro |
| `--color-gray-800` | `#1e293b` | Gradiente escuro |
| `--color-gray-900` | `#0f172a` | Fundo escuro de destaque |

### Status — semânticas

Cada status tem 5 variações: foreground (`--color-X`), variante escura (`--color-X-dark`), fundo (`--color-X-bg`), borda (`--color-X-border`) e texto sobre fundo (`--color-X-text`).

| Status | foreground | bg | text |
|--------|------------|-----|------|
| `success` | `#22c55e` | `#dcfce7` | `#166534` |
| `error` | `#ef4444` | `#fee2e2` | `#991b1b` |
| `warning` | `#fb923c` | `#fff7ed` | `#9a3412` |
| `info` | `#38bdf8` | `#e0f2fe` | `#0369a1` |

**Exemplo de pill de sucesso:**

```css
.badge-success {
  background: var(--color-success-bg);
  color: var(--color-success-text);
  border: 1px solid var(--color-success-border);
}
```

### Ranking — medalhas

| Posição | foreground | bg |
|---------|------------|-----|
| 1º (ouro) | `--color-rank-gold` (`#f59e0b`) | `--color-rank-gold-bg` (`#fffbeb`) |
| 2º (prata) | `--color-rank-silver` (`#94a3b8`) | `--color-rank-silver-bg` (`#f8fafc`) |
| 3º (bronze) | `--color-rank-bronze` (`#f97316`) | `--color-rank-bronze-bg` (`#fff7ed`) |

### Gradientes

| Token | Composição | Uso |
|-------|-----------|-----|
| `--gradient-stat-card` | `gray-900 → gray-800` (135°) | Cards de KPI no dashboard |
| `--gradient-progress` | `primary → info` (90°) | Barras de progresso de metas |

---

## Tipografia

Família: **Inter** (com fallback para system-ui). Monoespaçada para código: **JetBrains Mono**.

### Escala de tamanhos

| Token | Tamanho | Uso |
|-------|---------|-----|
| `--font-size-xs` | `0.75rem` (12px) | Caption, meta info, badges pequenos |
| `--font-size-sm` | `0.85rem` (13.6px) | Labels de formulário, texto auxiliar |
| `--font-size-base` | `1rem` (16px) | Corpo padrão |
| `--font-size-md` | `1.125rem` (18px) | Destaque inline |
| `--font-size-lg` | `1.25rem` (20px) | h3, valores de KPI |
| `--font-size-xl` | `1.5rem` (24px) | h2, seções |
| `--font-size-2xl` | `2rem` (32px) | h1, título de página |

### Pesos

| Token | Valor |
|-------|-------|
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

### Altura de linha

| Token | Valor | Uso |
|-------|-------|-----|
| `--line-height-tight` | `1.25` | Títulos |
| `--line-height-base` | `1.5` | Corpo |
| `--line-height-relaxed` | `1.65` | Parágrafos longos, leitura confortável |

---

## Espaçamento

Escala em múltiplos de `0.25rem` (4px).

| Token | Valor |
|-------|-------|
| `--spacing-xs` | `0.25rem` (4px) |
| `--spacing-sm` | `0.5rem` (8px) |
| `--spacing-md` | `0.75rem` (12px) |
| `--spacing-lg` | `1rem` (16px) |
| `--spacing-xl` | `1.5rem` (24px) |
| `--spacing-2xl` | `2rem` (32px) |
| `--spacing-3xl` | `3rem` (48px) |

Use sempre tokens. Valor arbitrário (`12px`, `padding: 0.65rem`) só em ajuste fino justificado.

---

## Border radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `0.5rem` | Inputs |
| `--radius-md` | `0.6rem` | Botões |
| `--radius-lg` | `0.75rem` | Cards, painéis |
| `--radius-xl` | `1rem` | Modais |
| `--radius-full` | `999px` | Pills, avatars |

---

## Sombras

| Token | Uso |
|-------|-----|
| `--shadow-sm` | Card padrão em repouso |
| `--shadow-md` | Card em hover |
| `--shadow-lg` | Modal, dropdown elevado |
| `--shadow-focus-ring` | Anel de foco em inputs e botões |

---

## Z-index

Camadas pré-definidas para evitar guerra de `z-index` no codebase.

| Token | Valor | Uso |
|-------|-------|-----|
| `--z-base` | `1` | Elementos posicionados padrão |
| `--z-dropdown` | `100` | Dropdowns e popovers |
| `--z-sticky` | `200` | Headers/colunas sticky |
| `--z-overlay` | `800` | Backdrop de modal |
| `--z-modal` | `1000` | Modais |
| `--z-toast` | `1100` | Toasts (acima do modal) |

---

## Transições

| Token | Duração | Uso |
|-------|---------|-----|
| `--transition-fast` | `150ms ease` | Estados interativos (hover, focus) |
| `--transition-base` | `200ms ease` | Padrão geral |
| `--transition-slow` | `300ms ease` | Animações maiores (progress bar) |

---

## Padrões de aplicação

### Botão primário

```css
button {
  background: var(--color-primary);
  color: var(--color-text-white);
  padding: 0.6rem 1rem;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  transition: background var(--transition-fast);
}

button:hover { background: var(--color-primary-dark); }
```

### Input com foco

```css
input:focus {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-focus-ring);
  outline: none;
}
```

### Badge de status

```css
.badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.badge--success {
  background: var(--color-success-bg);
  color: var(--color-success-text);
  border: 1px solid var(--color-success-border);
}
```

---

## Acessibilidade

- **Contraste WCAG AA:** todas as combinações de texto/fundo na paleta foram escolhidas para atingir no mínimo 4.5:1 para texto normal e 3:1 para texto grande.
- **Foco visível:** todo elemento interativo deve manter foco visível via `--shadow-focus-ring` ou borda em `--color-primary`.
- **Tamanho de toque mínimo:** 44×44px em mobile (usar `--spacing-lg` ou maior em padding).
- **Reduzir movimento:** respeitar `prefers-reduced-motion` em animações maiores.

---

## Pendências futuras

- Logotipo SVG (versões clara e escura) e favicon — entrega separada após aprovação dos co-fundadores ([referência no card #22](https://trello.com/c/yRwAazqy/22)).
- Modo escuro (dark mode) — tokens já preparados para suportar via override em `[data-theme="dark"]`.
- Componentes de UI (botão, input, badge) extraídos como componentes React reutilizáveis em `client/src/components/ui/`.
