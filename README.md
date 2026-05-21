# TesoureiroAssistente

Sistema fullstack de tesouraria para clã escoteiro. Permite gestão de membros, registro de pagamentos mensais, despesas, eventos, projetos, metas, extrato financeiro e relatórios em PDF/CSV.

## Stack

- **Backend**: Node.js + Express 5, JWT, banco dual SQLite (dev) / Postgres Supabase (prod)
- **Frontend**: React 19 + Vite 7
- **Integrações**: Google Drive (Service Account ou OAuth) para anexos
- **Deploy**: Vercel (serverless)

## Pré-requisitos

- Node.js 18 ou superior
- npm

## Instalação

Instale as dependências de cada workspace e o orquestrador da raiz:

```bash
cd server && npm install
cd ../client && npm install
cd .. && npm install
```

## Rodando em desenvolvimento

A partir da raiz do projeto, suba backend e frontend simultaneamente:

```bash
npm run dev
```

O script usa `concurrently` para levantar os dois serviços no mesmo terminal com prefixos diferenciados.

### Scripts disponíveis na raiz

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Sobe backend e frontend juntos |
| `npm run dev:server` | Apenas backend (porta 4000) |
| `npm run dev:client` | Apenas frontend (porta 5173) |

### Scripts do `server/`

| Script | Descrição |
|--------|-----------|
| `npm run dev` | nodemon em `index.js` |
| `npm start` | node `index.js` |
| `npm test` | Jest (`--runInBand`) |

### Scripts do `client/`

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Vite dev server |
| `npm run build` | Build de produção em `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Servidor estático do build |

## Estrutura do repositório

```
TesoureiroAssistente/
├── api/                  # Entrypoint serverless da Vercel
├── client/               # Frontend React + Vite
│   ├── public/
│   └── src/
│       ├── components/   # Componentes organizados por domínio
│       ├── contexts/     # AuthContext
│       ├── hooks/        # Hooks por feature (useMembers, usePayments, ...)
│       └── services/     # Cliente HTTP
├── server/               # Backend Express
│   ├── config/           # Config de env
│   ├── data/             # SQLite local (dev)
│   ├── db/               # Conexão, migrations, autoSeed
│   ├── middleware/       # Auth, upload
│   ├── routes/           # Rotas por domínio
│   ├── tests/            # Jest
│   └── utils/            # Auth, roles, settings, google-drive
├── docs/                 # Documentação do projeto
│   ├── assets/           # Imagens e mídias
│   ├── prd.md            # Requisitos funcionais
│   ├── google-drive.md   # Setup da integração Drive
│   ├── supabase.md       # Setup do Postgres em produção
│   └── test-credentials.md # Perfis de teste e matriz de permissões
├── package.json          # Orquestrador (concurrently)
└── vercel.json           # Config de deploy
```

## Documentação

- **[Requisitos do produto](docs/prd.md)** — RFs e funcionalidades planejadas
- **[Configuração do Google Drive](docs/google-drive.md)** — Service Account ou OAuth para upload de anexos
- **[Configuração do Supabase](docs/supabase.md)** — Postgres remoto em produção
- **[Credenciais de teste](docs/test-credentials.md)** — Perfis pré-configurados e matriz de permissões

## Variáveis de ambiente

Crie um arquivo `server/.env` com as variáveis aplicáveis:

```
# Auth
JWT_SECRET=<segredo>
ADMIN_EMAIL=<email do admin global>
ADMIN_PASSWORD=<senha do admin global>

# Banco (opcional — sem isso, usa SQLite local)
SUPABASE_DB_URL=postgresql://...

# Google Drive (escolha um dos modos)
GOOGLE_SERVICE_ACCOUNT_JSON={...}
# ou
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
GOOGLE_DRIVE_FOLDER_ID=...
```

## Licença

Ver arquivo [LICENSE](LICENSE).
