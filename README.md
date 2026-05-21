# Tesoureiro Assistente

## Pré-requisitos
- Node.js 18+ instalado tanto no Windows quanto no WSL, dependendo de onde você pretende rodar.
- Dependências instaladas em cada projeto:
  1. `cd server && npm install`
  2. `cd client && npm install`
  3. (Opcional, mas recomendado para usar o comando unificado) `cd .. && npm install`

## Rodando tudo em um único terminal
Depois de instalar as dependências, basta ficar na raiz do repositório e executar:

```bash
npm run dev
```

Esse script usa `concurrently` para levantar backend (`server`) e frontend (`client`) ao mesmo tempo no mesmo terminal. Os logs das duas aplicações aparecem juntos, com prefixos diferentes.

### Scripts úteis adicionais
- `npm run dev:server` – roda apenas o backend a partir da raiz.
- `npm run dev:client` – roda apenas o frontend a partir da raiz.
