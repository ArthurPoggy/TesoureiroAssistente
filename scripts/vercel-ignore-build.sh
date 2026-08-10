#!/bin/bash
# Evita deploys desnecessarios na Vercel quando o commit so altera arquivos
# que nao afetam o build (docs, testes, workflows de CI). Isso preserva a
# cota diaria de deploys do plano gratuito, reduzindo o risco de
# "Deployment rate limited" em sequencias de commits pequenos na mesma PR.
#
# Codigo de saida 0 = pula o deploy; qualquer outro valor = segue com o build.

set -e

# A Vercel dispara um unico build por push, para o commit HEAD do push, e
# expoe em VERCEL_GIT_PREVIOUS_SHA o commit da ultima vez que este branch
# foi de fato deployado. Usar HEAD^ aqui compararia so o ultimo commit do
# push contra o penultimo: se um push reune varios commits (comum no fluxo
# de TDD deste projeto, teste + implementacao) e o ultimo deles so mexe em
# teste/doc, o diff ficaria vazio e o script pularia o deploy mesmo com
# mudancas de build ainda nao deployadas nos commits anteriores do mesmo
# push. Comparar contra VERCEL_GIT_PREVIOUS_SHA cobre o push inteiro; HEAD^
# fica só como fallback para execucao local, fora do ambiente da Vercel.
BASE_SHA="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

CHANGED_FILES=$(git diff --name-only "$BASE_SHA" HEAD)

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
