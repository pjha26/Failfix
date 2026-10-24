import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { applyPatch } from 'diff';

test('a build failure produces a real no-key patch and invalidates exports after edits', async ({
  page,
}) => {
  let providerCalls = 0;
  await page.route('**/api/analyze', (route) => {
    providerCalls++;
    return route.abort();
  });
  await page.goto('/deployments');
  await page
    .getByRole('button', { name: 'Try a build-failure example' })
    .click();
  const original = await page
    .getByRole('textbox', { name: 'Configuration', exact: false })
    .inputValue();
  await page.getByRole('button', { name: 'Investigate build' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'The requested build script is missing',
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Proposed build patch')).toContainText(
    '"build": "next build"',
  );
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download build patch' }).click();
  const download = await pending;
  const patch = await readFile((await download.path())!, 'utf8');
  const fixed = applyPatch(original, patch);
  expect(fixed).not.toBe(false);
  expect(JSON.parse(fixed as string).scripts.build).toBe('next build');
  await page.getByRole('button', { name: /LOG L2/ }).click();
  await expect(
    page.getByRole('textbox', { name: 'Failing build output' }),
  ).toBeFocused();
  await page
    .getByRole('textbox', { name: 'Failing build output' })
    .fill('Build changed');
  await expect(
    page.getByText('Build context changed.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Download build patch' }),
  ).toBeDisabled();
  expect(providerCalls).toBe(0);
});

test('public import renders pinned configuration and run metadata while preserving pasted logs', async ({
  page,
}) => {
  const ids: number[] = [];
  await page.route('**/api/github/import', (route) => {
    const request = route.request().postDataJSON();
    ids.push(request.runId || 1);
    return route.fulfill({
      json: {
        snapshot: {
          repository: 'owner/storefront',
          url: 'https://github.com/owner/storefront',
          sha: 'a'.repeat(40),
          files: [
            {
              path: 'package.json',
              text: '{"name":"storefront","scripts":{"build":"next build"}}',
            },
          ],
          runs: [
            {
              id: 1,
              name: 'Deploy',
              sha: 'a'.repeat(40),
              branch: 'main',
              path: '.github/workflows/deploy.yml',
              url: 'https://github.com/owner/storefront/actions/runs/1',
              createdAt: '2026-10-24',
            },
            {
              id: 2,
              name: 'Preview',
              sha: 'b'.repeat(40),
              branch: 'preview',
              path: '.github/workflows/deploy.yml',
              url: 'https://github.com/owner/storefront/actions/runs/2',
              createdAt: '2026-10-24',
            },
          ],
          selectedRunId: request.runId || 1,
          failedSteps: ['Build → npm run build'],
          warnings: ['Run metadata is not the build log.'],
        },
      },
    });
  });
  await page.goto('/deployments');
  await page
    .getByRole('textbox', { name: 'Failing build output' })
    .fill('My original build error');
  await page
    .getByRole('textbox', { name: 'GitHub repository' })
    .fill('https://github.com/owner/storefront');
  await page.getByRole('button', { name: 'Import public repo' }).click();
  await expect(page.getByLabel('Imported repository context')).toContainText(
    'owner/storefront',
  );
  await expect(
    page.getByRole('textbox', { name: 'Configuration', exact: false }),
  ).toHaveValue(/storefront/);
  await expect(
    page.getByRole('textbox', { name: 'Failing build output' }),
  ).toHaveValue('My original build error');
  await page
    .getByRole('combobox', { name: 'Failed workflow run' })
    .selectOption('2');
  await expect(
    page.getByRole('combobox', { name: 'Failed workflow run' }),
  ).toHaveValue('2');
  expect(ids).toEqual([1, 2]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('unknown failures ask for context and import errors retain input', async ({
  page,
}) => {
  await page.route('**/api/github/import', (route) =>
    route.fulfill({
      status: 429,
      json: { error: 'GitHub public allowance exhausted. Paste logs instead.' },
    }),
  );
  await page.goto('/deployments');
  const log = page.getByRole('textbox', { name: 'Failing build output' });
  await log.fill('Process exited with code 1.');
  await page.getByRole('button', { name: 'Investigate build' }).click();
  await expect(
    page.getByRole('heading', { name: 'More context is needed.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Download build patch' }),
  ).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'GitHub repository' })
    .fill('owner/repo');
  await page.getByRole('button', { name: 'Import public repo' }).click();
  await expect(
    page.getByRole('alert', { name: 'Build investigation error' }),
  ).toContainText('allowance exhausted');
  await expect(log).toHaveValue('Process exited with code 1.');
});
