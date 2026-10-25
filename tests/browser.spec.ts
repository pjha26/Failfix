import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { examples } from '../lib/examples';
import { buildArtifacts } from '../lib/patch';

test('a saved walkthrough exports applicable changes and invalidates stale results', async ({
  page,
}) => {
  await page.goto('/workspace');
  await page.getByRole('button', { name: /Zero is a value/ }).click();
  await page.getByRole('button', { name: 'Open saved walkthrough' }).click();
  await expect(
    page.getByText('Saved example · hand-authored walkthrough'),
  ).toBeVisible();
  await expect(page.getByText('Tests have not been run here')).toBeVisible();
  await page.getByRole('tab', { name: 'Regression test', exact: true }).click();
  await expect(page.getByLabel('Proposed regression test')).toContainText(
    'toBe(0)',
  );
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download patch' }).click();
  const downloaded = await pending;
  const path = await downloaded.path();
  expect(path).toBeTruthy();
  const bytes = await readFile(path!, 'utf8');
  expect(bytes).toBe(
    buildArtifacts(examples[0].input, examples[0].analysis).artifacts!.patch,
  );
  await page.getByRole('button', { name: /source L2/ }).click();
  await expect(page.getByRole('tab', { name: 'Source code' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page
    .getByRole('textbox', { name: 'Source code', exact: true })
    .fill('export const changed = true;');
  await expect(page.getByText(/Inputs changed. Reanalyze/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Download patch' }),
  ).toBeDisabled();
});

test('a successful live-response flow is rendered without a saved-example label', async ({
  page,
}) => {
  await page.route('**/api/analyze', (route) =>
    route.fulfill({
      json: {
        ...buildArtifacts(examples[0].input, examples[0].analysis),
        requestId: 'browser-mocked-response',
        durationMs: 1234,
      },
    }),
  );
  await page.goto('/workspace');
  await page.getByRole('button', { name: /Zero is a value/ }).click();
  await page.getByRole('button', { name: 'Analyze failure' }).click();
  await expect(
    page.getByText('Patch matches the supplied source', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('Saved example · hand-authored walkthrough'),
  ).toHaveCount(0);
  await expect(page.getByLabel('Proposed unified patch')).toContainText(
    'return value ?? 3;',
  );
});

test('provider errors preserve input and provide a recovery message', async ({
  page,
}) => {
  await page.route('**/api/analyze', (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: 'Groq is busy. Please try later.',
        requestId: 'test-error',
      },
    }),
  );
  await page.goto('/workspace');
  await page.getByRole('button', { name: /Zero is a value/ }).click();
  await page.getByRole('button', { name: 'Analyze failure' }).click();
  await expect(
    page.getByRole('alert', { name: 'Analysis error' }),
  ).toContainText('Groq is busy');
  await expect(
    page.getByRole('textbox', { name: 'Source code', exact: true }),
  ).toHaveValue(examples[0].input.source.text);
  await expect(
    page.getByRole('button', { name: 'Analyze failure' }),
  ).toBeEnabled();
});

test('missing context shows questions without downloads', async ({ page }) => {
  const analysis = {
    ...examples[0].analysis,
    status: 'needs_context',
    edits: [],
    regressionTest: null,
    questions: ['What should a missing input return?'],
  };
  await page.route('**/api/analyze', (route) =>
    route.fulfill({
      json: { analysis, artifacts: null, requestId: 'context', durationMs: 50 },
    }),
  );
  await page.goto('/workspace');
  await page.getByRole('button', { name: /Zero is a value/ }).click();
  await page.getByRole('button', { name: 'Analyze failure' }).click();
  await expect(
    page.getByText('What should a missing input return?'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Download patch' }),
  ).toHaveCount(0);
});

test('the workspace fits the viewport and is reachable by keyboard', async ({
  page,
}) => {
  await page.goto('/workspace');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'FailFix home' })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: /hidden side effect/ }).click();
  await page.getByRole('button', { name: 'Open saved walkthrough' }).click();
  await expect(page.getByText('PROPOSED FIX', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
