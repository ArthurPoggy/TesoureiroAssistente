## Uso com Supabase

1. Crie um projeto no [Supabase](https://supabase.com) e habilite o banco Postgres padrão.
2. No painel do Supabase, abra **SQL Editor → Create new query**, copie o conteúdo de `server/supabase-schema.sql` e execute para criar as tabelas.
3. Copie a string de conexão do banco (`Project Settings → Database → Connection string → URI`). Ela deve se parecer com:
   ```
   postgresql://postgres:<SENHA>@db.<hash>.supabase.co:5432/postgres
   ```
4. Configure a variável `SUPABASE_DB_URL`:
   - **Local**: crie um arquivo `.env` na pasta `server` com `SUPABASE_DB_URL=<sua-string>`.
   - **Vercel**: em *Project → Settings → Environment Variables*, adicione `SUPABASE_DB_URL` com o mesmo valor.
5. SSL já vem habilitado no Supabase. Só altere se estiver usando um proxy diferente (`SUPABASE_DB_SSL=false` desabilita).
6. Rode `npm install --prefix server` para instalar a dependência `pg` e suba o backend normalmente (`npm run dev` ou deploy na Vercel). Quando `SUPABASE_DB_URL` estiver definido, o backend ignora o SQLite local e usa o Postgres remoto automaticamente.

> ⚠️ O Supabase não compartilha arquivos gerados na pasta `data`. O SQLite só continua existindo para desenvolvimento offline; produção deve usar o Postgres.
