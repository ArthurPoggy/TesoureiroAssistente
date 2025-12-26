## Google Drive (upload de arquivos)

### Opcao A (Service Account + Shared Drive - Workspace)

1. No Google Cloud Console, crie um projeto (ou use um existente).
2. Ative a **Google Drive API** nesse projeto.
3. Crie um **Service Account** e gere uma **chave JSON**.
4. Pegue o email do Service Account (ex: `nome@projeto.iam.gserviceaccount.com`).
5. Abra a pasta do Drive e compartilhe com esse email com permissao de **Editor**.
6. Configure as variaveis de ambiente:

```
GOOGLE_DRIVE_FOLDER_ID=1PkF3uJF1s_q9bCgmoFUIuWByGzKRnHYD
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"..."}
```

Alternativa (se preferir separar):

```
GOOGLE_CLIENT_EMAIL=nome@projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n
```

> Observacao: em ambientes como Vercel, quebras de linha no `private_key` devem ser substituidas por `\\n`.
> Se nao definir `GOOGLE_DRIVE_FOLDER_ID`, o sistema usa por padrao o ID acima.

### Opcao B (OAuth - Gmail pessoal)

1. No Google Cloud Console, abra **APIs & Services** e habilite **Google Drive API**.
2. Configure a tela de consentimento em **OAuth consent screen**:
   - Tipo: **External**
   - Adicione seu email como **Test user**.
3. Crie um **OAuth Client ID**:
   - Tipo: **Web application**
   - Authorized redirect URI: `https://developers.google.com/oauthplayground`
4. Acesse o **OAuth Playground**: https://developers.google.com/oauthplayground
   - Clique na engrenagem e marque **Use your own OAuth credentials**.
   - Cole o **Client ID** e **Client Secret**.
   - Em Step 1, selecione o escopo: `https://www.googleapis.com/auth/drive`.
   - Clique **Authorize APIs** e escolha sua conta.
   - Em Step 2, clique **Exchange authorization code for tokens**.
   - Copie o **refresh_token**.
5. Configure as variaveis de ambiente:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
GOOGLE_DRIVE_FOLDER_ID=<ID da sua pasta no Drive pessoal>
```

### Observacoes

- Upload de arquivos so funciona para o tesoureiro (admin).
- Listagem de arquivos funciona para todos os usuarios autenticados.
- Limite recomendado por envio: 4 MB (limite comum em ambientes serverless).
