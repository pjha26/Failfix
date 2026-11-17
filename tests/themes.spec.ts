import { expect, test } from '@playwright/test';

test('theme choices carry across desks and preserve the current edit', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const picker = page.getByRole('combobox', { name: 'Color theme' });
  const html = page.locator('html');
  await expect(picker).toHaveValue('system');
  const light = await html.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).not.toHaveCSS('background-color', light);
  await picker.selectOption('light');
  await expect(html).toHaveCSS('background-color', light);
  await picker.selectOption('dark');
  await page.getByRole('link', { name: /Investigate a build/ }).click();
  await expect(picker).toHaveValue('dark');
  await page.getByRole('link', { name: 'Test desk', exact: true }).click();
  const source = page.getByRole('textbox', { name: 'Source code', exact: true });
  await source.fill('const value = 0;');
  await picker.selectOption('mono');
  await expect(source).toHaveValue('const value = 0;');
  await expect(html).toHaveAttribute('data-theme', 'mono');
  await expect(source).toHaveCSS('color', /rgb\((\d+), \1, \1\)/);
  await page.reload();
  await expect(picker).toHaveValue('mono');
  await expect(html).toHaveAttribute('data-theme', 'mono');
  await picker.selectOption('system');
  await expect(html).not.toHaveAttribute('data-theme');
  await expect(html).not.toHaveCSS('background-color', light);
});

test('the theme still switches when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } });
  });
  await page.goto('/workspace?example=zero');
  const picker = page.getByRole('combobox', { name: 'Color theme' });
  await picker.selectOption('mono');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mono');
  await expect(page.locator('.diff-add').first()).toHaveCSS('border-inline-start-style', 'solid');
  await expect(page.locator('.diff-remove').first()).toHaveCSS('border-inline-start-style', 'dashed');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
