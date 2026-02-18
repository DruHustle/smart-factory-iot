import { expect, test } from '@playwright/test';

test.describe('smart-factory-iot auth smoke', () => {
  test('login/register/forgot routes are reachable', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.getByRole('heading', { name: /smart factory iot/i })).toBeVisible();

    await page.getByRole('button', { name: /forgot password\?/i }).click();
    await expect(page).toHaveURL(/#\/forgot-password/);
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();

    await page.getByRole('button', { name: /back to login/i }).click();
    await expect(page).toHaveURL(/#\/login/);

    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/#\/register/);
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/#\/login/);
  });

  test('demo login reaches dashboard', async ({ page }) => {
    await page.goto('/#/login');

    await page.getByLabel('Email').fill('admin@dev.local');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page.getByRole('heading', { name: /factory dashboard/i })).toBeVisible();
    await expect(page.getByText('Dev Admin')).toBeVisible();
  });
});
