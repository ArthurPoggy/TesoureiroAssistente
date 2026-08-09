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
| `--color-gray-400` | `#5b6b80` | Texto desabilitado, placeholder, texto light (`--color-text-light`) |
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
| `error` | `#e02424` | `#fee2e2` | `#991b1b` |
| `warning` | `#fb923c` | `#fff7ed` | `#9a3412` |
| `info` | `#38bdf8` | `#e0f2fe` | `#0369a1` |

> `--color-error` foi escurecido de `#ef4444` para `#e02424` porque o token também é usado
> diretamente como cor de texto (ex.: botão de remover tag em `projects.css`), e o tom
> original não atingia 4.5:1 sobre `--color-bg-secondary`. Ver seção [Contraste WCAG AA](#contraste-wcag-aa--evidência).

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
| 1º (ouro) | `--color-rank-gold` (`#b45309`) | `--color-rank-gold-bg` (`#fffbeb`) |
| 2º (prata) | `--color-rank-silver` (`#5b6b80`) | `--color-rank-silver-bg` (`#f8fafc`) |
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

### Hierarquia de títulos aplicada

Mapeamento efetivo entre elemento e tokens, para manter a hierarquia consistente em toda a aplicação:

| Elemento | `font-size` | `font-weight` | `line-height` |
|----------|-------------|----------------|----------------|
| `h1` (`header h1`, `.login-card h1`) | `--font-size-2xl` | `--font-weight-bold` | `--line-height-tight` |
| `h2` (`.panel-header h2`, `.modal-header h2`) | `--font-size-xl` | `--font-weight-bold` | `--line-height-tight` |
| `h3` (`.panel-note h3`, `.goal-header h3`, `.history-content h3`, `.member-project-check h3`, `.member-detail-header h3`) | `--font-size-lg` | `--font-weight-bold` | `--line-height-tight` |
| `body` / corpo de texto | `--font-size-base` | `--font-weight-normal` | `--line-height-base` (mínimo 1.5) |
| Labels e captions (`.member-status-badge`, `.extrato-card-label`) | `--font-size-xs`/`--font-size-sm` | `--font-weight-medium` ou `--font-weight-semibold` | — |

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

### Contraste WCAG AA — evidência

Cálculo de razão de contraste (fórmula da relative luminance do WCAG 2.1) para cada par
texto/fundo efetivamente usado no app. Cobertura automatizada em
[`client/src/test/contraste-cores.test.jsx`](../client/src/test/contraste-cores.test.jsx),
rodada a cada `npm test` no client.

| Par (texto / fundo) | Razão | Mínimo exigido | Resultado |
|---|---|---|---|
| `--color-text-primary` / `--color-bg-secondary` | 14.76:1 | 4.5:1 | ✅ |
| `--color-text-primary` / `--color-bg-primary` | 13.47:1 | 4.5:1 | ✅ |
| `--color-gray-600` (texto secundário) / `--color-bg-secondary` | 7.58:1 | 4.5:1 | ✅ |
| `--color-gray-500` (texto muted) / `--color-bg-secondary` | 4.76:1 | 4.5:1 | ✅ |
| `--color-gray-400` (`--color-text-light`, usado no footer) / `--color-bg-secondary` | 5.44:1 | 4.5:1 | ✅ |
| `--color-gray-400` (`--color-text-light`) / `--color-bg-primary` | 4.97:1 | 4.5:1 | ✅ |
| `--color-primary` (usado como texto/link) / `--color-bg-secondary` | 5.17:1 | 4.5:1 | ✅ |
| `--color-success-text` / `--color-success-bg` | 6.49:1 | 4.5:1 | ✅ |
| `--color-error-text` / `--color-error-bg` | 6.80:1 | 4.5:1 | ✅ |
| `--color-warning-text` / `--color-warning-bg` | 6.88:1 | 4.5:1 | ✅ |
| `--color-info-text` / `--color-info-bg` | 5.17:1 | 4.5:1 | ✅ |
| `--color-error` (usado como texto, botão remover tag) / `--color-bg-secondary` | 4.72:1 | 4.5:1 | ✅ |
| `--color-rank-gold` / `--color-rank-gold-bg` (badge/medalha, texto grande) | 4.84:1 | 3:1 | ✅ |

Três tokens foram ajustados nesta revisão porque não atingiam o mínimo com o tom original:

| Token | Antes | Depois | Motivo |
|---|---|---|---|
| `--color-gray-400` | `#94a3b8` (2.56:1 sobre branco) | `#5b6b80` (5.44:1) | Também usado como `--color-text-light`, cor de texto real no footer e em labels de formulário — precisava do mesmo piso de 4.5:1 dos demais tokens de texto. |
| `--color-error` | `#ef4444` (3.76:1 sobre branco) | `#e02424` (4.72:1) | Usado diretamente como `color` (não só background) no botão de remover integrante (`.member-tag-remove`). |
| `--color-rank-gold` | `#f59e0b` (2.07:1 sobre `--color-rank-gold-bg`) | `#b45309` (4.84:1) | Borda/fundo do card de 1º lugar no ranking não atingia nem o piso de 3:1 para elementos grandes. |

---

## Pendências futuras

- Logotipo SVG (versões clara e escura) e favicon — entrega separada após aprovação dos co-fundadores ([referência no card #22](https://trello.com/c/yRwAazqy/22)).
- Modo escuro (dark mode) — tokens já preparados para suportar via override em `[data-theme="dark"]`.
- Componentes de UI (botão, input, badge) extraídos como componentes React reutilizáveis em `client/src/components/ui/`.
