#!/bin/bash
# Evita deploys desnecessarios na Vercel quando o commit so altera arquivos
# que nao afetam o build (docs, testes, workflows de CI). Isso preserva a
# cota diaria de deploys do plano gratuito, reduzindo o risco de
# "Deployment rate limited" em sequencias de commits pequenos na mesma PR.
#
# Codigo de saida 0 = pula o deploy; qualquer outro valor = segue com o build.

set -e

CHANGED_FILES=$(git diff --name-only HEAD^ HEAD)

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ - Sem informacao de diff, seguindo com o build por seguranca"
  exit 1
fi

DEPLOYABLE_FILES=$(echo "$CHANGED_FILES" | grep -Ev '\.md$|^docs/|^\.github/|(^|/)__tests__/|\.test\.[jt]sx?$|\.spec\.[jt]sx?$' || true)

if [ -z "$DEPLOYABLE_FILES" ]; then
  echo "🛑 - Build cancelado - apenas arquivos de docs/testes/CI foram alterados"
  exit 0
fi

echo "✅ - Build necessario - arquivos que afetam o deploy foram alterados"
exit 1
