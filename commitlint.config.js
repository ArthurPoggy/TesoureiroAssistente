/**
 * Configuração do commitlint — TesoureiroAssistente
 *
 * Convenção: Conventional Commits adaptado, mensagens em português.
 * Documentação completa: docs/commit-guide.md
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'refactor',
        'style',
        'perf',
        'test',
        'chore',
        'build',
        'ci',
        'security',
        'revert',
      ],
    ],
    // Permitir início em minúscula ou maiúscula (português aceita ambos).
    'subject-case': [0],
    'header-max-length': [2, 'always', 72],
    // Permitir corpo vazio (sem descrição adicional).
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
  },
};
