# Arquitetura de Banco de Dados — Supabase vs. Alternativas

> Avaliação se o Supabase (PostgreSQL gerenciado) segue sendo a melhor escolha para
> produção do TesoureiroAssistente, considerando custo, performance, recursos e escalabilidade.
> Data: 2026-05-26. Caráter: estudo/decisão.

## 1. Situação atual

- **Desenvolvimento:** SQLite (`better-sqlite3`, arquivo local) — zero setup, rápido para testes.
- **Produção:** Supabase (PostgreSQL gerenciado).
- **Camada de acesso:** `server/db/query.js` abstrai SQLite × Postgres; migrations em
  `server/db/migrations.js` (SQLite) e `server/supabase-schema.sql` (Postgres).

**Risco operacional já identificado:** os dois esquemas podem divergir. Durante o trabalho de
tags em projetos, constatou-se que `supabase-schema.sql` estava atrás das migrations SQLite
(faltavam `tags`, `expense_tags`, datas de projeto). Mantê-los em sincronia é o ponto mais
sensível desta arquitetura dual.

## 2. Critérios

Custo (projeto gratuito), facilidade operacional (time pequeno), performance para a carga
real (centenas de membros, milhares de transações/ano), recursos (auth, storage, backups) e
portabilidade (evitar *lock-in*).

## 3. Comparativo

| Opção | Prós | Contras | Veredito |
|-------|------|---------|----------|
| **Supabase (atual)** | Postgres real, free tier generoso, painel, backups, auth/storage opcionais, é só Postgres (baixo lock-in) | Free tier pausa projeto inativo; latência da região | **Manter** |
| **Neon** | Postgres serverless, branching de banco, escala a zero | Sem auth/storage integrados; menos recursos "batteries-included" | Alternativa viável se quiser branching |
| **Railway / Render PG** | Postgres simples, previsível | Sem free tier permanente robusto | Só se sair do free |
| **PlanetScale (MySQL)** | Escala horizontal, branching | MySQL (migraria o dialeto), sem FKs tradicionais | Não recomendado (muda dialeto) |
| **SQLite/LiteFS em prod** | Simples, barato | Difícil em serverless (Vercel) com escrita concorrente | Não recomendado para prod |

## 4. Análise

- **Custo:** Supabase free atende. A única dor é a pausa por inatividade — mitigável com o
  workflow `keep-alive` já presente no repo (`.github/workflows/keep-alive.yml`).
- **Performance:** a carga é pequena; Postgres gerenciado sobra. Não há gargalo de banco previsível.
- **Lock-in:** baixo — é Postgres puro. Migrar para Neon/Render é trocar a connection string + rodar o schema.
- **Recursos:** o projeto usa Supabase só como Postgres (não usa Supabase Auth/Storage); isso
  reforça a portabilidade.

## 5. Conclusão e recomendações

**Decisão:** **manter o Supabase** para produção. É adequado em custo, performance e portabilidade.

Recomendações de melhoria (independem do provedor):

1. **Eliminar o risco de divergência de schema** — fonte única de verdade. Opções:
   - gerar o `supabase-schema.sql` a partir das migrations, **ou**
   - adotar uma ferramenta de migration multi-dialeto, **ou**
   - um teste de CI que falhe se os esquemas divergirem em tabelas/colunas-chave.
2. **Manter o keep-alive** para evitar a pausa do free tier.
3. **Plano de backup/restore** documentado (export periódico).
4. Reavaliar (ex.: Neon com branching) só se o fluxo de desenvolvimento exigir bancos efêmeros por PR.

> Reavaliar a cada salto de escala (especialmente se evoluir para multi-tenant).
