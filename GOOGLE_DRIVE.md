## Google Drive (upload de arquivos)

### Passo a passo (Service Account)

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

### Observacoes

- Upload de arquivos so funciona para o tesoureiro (admin).
- Listagem de arquivos funciona para todos os usuarios autenticados.
- Limite recomendado por envio: 4 MB (limite comum em ambientes serverless).
