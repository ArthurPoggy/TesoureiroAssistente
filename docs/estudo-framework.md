# Estudo de Frameworks — Escalabilidade e Otimização

> Avaliação comparativa do stack atual (Express 5 + React 19/Vite) frente a alternativas,
> para embasar decisões de evolução do TesoureiroAssistente.
> Data: 2026-05-26. Caráter: estudo/decisão — não implica migração imediata.

## 1. Stack atual

- **Backend:** Express 5 (JavaScript), banco dual SQLite (dev) / Postgres-Supabase (prod), JWT.
- **Frontend:** React 19 + Vite, hooks por feature, `App.jsx` orquestrando os painéis.
- **Deploy:** Vercel (serverless) — daí restrições como o limite de ~4MB por upload.

**Pontos fortes:** simplicidade, baixo custo, time pequeno produtivo, sem build complexo.
**Limitações sentidas:** `App.jsx` monolítico (sem rotas), backend sem camada de validação/ORM,
acoplamento de saldo em `settings`, ausência de SSR/SEO (irrelevante por ser app interno).

## 2. Critérios de avaliação

Escalabilidade, performance, ecossistema/manutenção, curva de aprendizado, custo e
adequação ao perfil (app interno de um clã escoteiro, time pequeno, gratuito).

## 3. Backend — comparativo

| Opção | Prós | Contras | Veredito |
|-------|------|---------|----------|
| **Express 5 (atual)** | Simples, onipresente, já dominado | Sem estrutura imposta, validação manual | **Manter** no curto prazo |
| **Fastify** | ~2x throughput, schema/validação nativa (JSON Schema), plugins | Migração de rotas/middleware | Avaliar se latência virar gargalo |
| **NestJS** | Arquitetura modular (DI, módulos), TypeScript, ótimo para crescer | Curva alta, *boilerplate*, overkill para o tamanho atual | Só se o time crescer muito |

**Recomendação backend:** permanecer em **Express 5**. Ganhos de performance de Fastify/Nest
não compensam o custo de migração para a escala atual (centenas de registros, não milhões).
Priorizar melhorias incrementais: camada de validação (ex.: `zod`), e desacoplar o saldo.

## 4. Frontend — comparativo

| Opção | Prós | Contras | Veredito |
|-------|------|---------|----------|
| **React 19 + Vite (atual)** | Rápido, simples, HMR excelente | Sem roteamento (resolvido pelo card de rotas) | **Manter** |
| **Next.js** | SSR/SSG, file-based routing, otimizações | SSR desnecessário (app interno autenticado), acopla a deploy | Não recomendado agora |
| **Remix/TanStack** | Boas práticas de data loading | Migração custosa, sem ganho claro | Não recomendado |

**Recomendação frontend:** permanecer em **React + Vite**. A dor real (navegação por scroll único)
resolve-se com `react-router` (card de roteamento), sem trocar de framework.

## 5. Banco de dados

Coberto em detalhe em [`arquitetura-bd.md`](arquitetura-bd.md). Resumo: Supabase/Postgres
continua adequado; o ponto de atenção é manter `supabase-schema.sql` em sincronia com as migrations.

## 6. Conclusão e roadmap incremental

**Decisão:** **não migrar de framework** agora. O stack atual atende à escala e ao orçamento (gratuito).
Os problemas percebidos são de **arquitetura interna**, não de tecnologia, e se resolvem com:

1. Roteamento no frontend (`react-router`) — já planejado.
2. Camada de validação no backend (`zod`/`joi`) — reduz validação manual e melhora segurança.
3. Desacoplar saldo materializado de `settings` (evento de transação).
4. Reavaliar Fastify **apenas** se métricas de latência indicarem gargalo real.

> Reavaliar este estudo a cada salto relevante de escala (ex.: multi-tenant / múltiplos grupos).
