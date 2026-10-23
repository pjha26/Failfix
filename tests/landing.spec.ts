import { expect, test } from '@playwright/test';
import { examples } from '../lib/examples';

test('the getting-started document explains the review loop and opens its case', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Every failure',
  );
  await expect(
    page.getByText('START_HERE.md', { exact: false }).last(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Follow the evidence' }).click();
  await expect(page).toHaveURL(/\/workspace\?example=zero/);
  await expect(
    page.getByRole('textbox', { name: 'Source code', exact: true }),
  ).toHaveValue(examples[0].input.source.text);
  await expect(page.getByText('Tests have not been run here')).toBeVisible();
});

test('explorer links open complete walkthroughs without calling analysis', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/analyze', (route) => {
    calls++;
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('link', { name: /The hidden side effect/ }).click();
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

test('getting-started navigation is keyboard accessible and fits the viewport', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page
    .locator('summary')
    .filter({ hasText: 'Can I use this without an API key?' })
    .click();
  await expect(
    page.getByText(/Explore the three saved walkthroughs/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('link', { name: 'Open workspace', exact: false })
    .filter({ hasText: 'Open workspace' })
    .click();
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

test('the case explorer and output console preserve edits across layout changes', async ({
  page,
}) => {
  await page.goto('/workspace');
  await page.getByRole('button', { name: /Zero is a value/ }).click();
  const editor = page.getByRole('textbox', {
    name: 'Source code',
    exact: true,
  });
  const changed = examples[0].input.source.text + '\n// local note';
  await editor.fill(changed);
  await page.getByRole('button', { name: 'Toggle case explorer' }).click();
  await expect(page.getByLabel('Case explorer', { exact: true })).toBeHidden();
  await expect(editor).toHaveValue(changed);
  await page.getByRole('button', { name: 'Edit failure output' }).click();
  await page
    .getByRole('textbox', { name: 'Failure output', exact: true })
    .fill('AssertionError: expected 3 to be 0');
  await page.getByRole('tab', { name: 'Source code', exact: true }).click();
  await expect(editor).toHaveValue(changed);
  await expect(page.getByLabel('Failure console preview')).toHaveText(
    'AssertionError: expected 3 to be 0',
  );
  await page.getByRole('button', { name: 'Toggle case explorer' }).click();
  await expect(page.getByLabel('Case explorer', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
