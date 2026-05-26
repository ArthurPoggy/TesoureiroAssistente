import { test, expect } from '@playwright/test';

test('carrega a tela de login com os elementos principais', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Tesoureiro Assistente' })).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Senha')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});
