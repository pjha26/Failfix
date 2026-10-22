import { expect, test } from '@playwright/test';
import { examples } from '../lib/examples';

test('landing preview changes cases and reveals the reviewed fix', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'A failing test',
  );
  await page.getByRole('button', { name: 'Reveal the reviewed fix' }).click();
  await expect(page.getByLabel('Reviewed example source')).toContainText(
    'return value ?? 3;',
  );
  await page.getByRole('button', { name: 'Array bounds' }).click();
  await expect(page.getByLabel('Buggy example source')).toContainText(
    'items[items.length]',
  );
  await expect(
    page.getByRole('button', { name: 'Array bounds' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Reveal the reviewed fix' }).click();
  await expect(page.getByLabel('Reviewed example source')).toContainText(
    'items[items.length - 1]',
  );
});

test('example links open the right complete walkthrough without calling analysis', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/analyze', (route) => {
    calls++;
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('link', { name: /CASE \/ 003/ }).click();
  await expect(page).toHaveURL(/\/workspace\?example=mutation/);
  await expect(
    page.getByText('Saved example · hand-authored walkthrough'),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Source code', exact: true }),
  ).toHaveValue(examples[2].input.source.text);
  await expect(
    page.getByRole('button', { name: 'Download patch' }),
  ).toBeEnabled();
  expect(calls).toBe(0);
});

test('FAQ, primary navigation, and responsive layout work', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page
    .locator('summary')
    .filter({ hasText: 'Can I try it without an API key?' })
    .click();
  await expect(
    page.getByText(/The three saved walkthroughs let you explore/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('link', { name: 'Open workspace', exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(
    page.getByRole('heading', { name: 'The failure', exact: true }),
  ).toBeVisible();
});

test('unknown example identifiers fall back to a blank workspace', async ({
  page,
}) => {
  await page.goto('/workspace?example=not-a-real-case');
  await expect(
    page.getByRole('textbox', { name: 'Source code', exact: true }),
  ).toHaveValue('');
  await expect(
    page.getByText('Saved example · hand-authored walkthrough'),
  ).toHaveCount(0);
});
