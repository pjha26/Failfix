import { expect, test } from '@playwright/test';
import { examples } from '../lib/examples';

test('a user-supplied proposal becomes a patch without any model call', async ({
  page,
}) => {
  let modelCalls = 0;
  await page.route('**/api/analyze', (route) => {
    modelCalls++;
    return route.abort();
  });
  await page.goto('/workspace');
  await page.getByRole('button', { name: /Zero is a value/ }).click();
  await page.getByRole('button', { name: 'Prepare debugging prompt' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Debugging prompt', exact: true }),
  ).toHaveValue(/retryCount/);
  await page
    .getByRole('textbox', { name: /Proposal JSON/ })
    .fill(JSON.stringify(examples[0].analysis));
  await page.getByRole('button', { name: 'Validate proposal' }).click();
  await expect(
    page.getByText('User-supplied proposal · validated structure'),
  ).toBeVisible();
  await expect(page.getByLabel('Proposed unified patch')).toContainText(
    'return value ?? 3;',
  );
  await expect(page.getByText('Tests have not been run here')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Download patch' }),
  ).toBeEnabled();
  expect(modelCalls).toBe(0);
  await page.getByRole('textbox', { name: /Proposal JSON/ }).fill('{}');
  await expect(
    page.getByRole('button', { name: 'Download patch' }),
  ).toBeDisabled();
});

test('invalid proposals preserve the input without producing a patch', async ({
  page,
}) => {
  await page.goto('/workspace');
  await page.getByRole('button', { name: /Zero is a value/ }).click();
  await page
    .getByRole('textbox', { name: /Proposal JSON/ })
    .fill(
      JSON.stringify({
        ...examples[0].analysis,
        edits: [{ original: 'absent', replacement: 'changed' }],
      }),
    );
  await page.getByRole('button', { name: 'Validate proposal' }).click();
  await expect(
    page.getByRole('alert', { name: 'Analysis error' }),
  ).toContainText('failed validation');
  await expect(
    page.getByRole('button', { name: 'Download patch' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('textbox', { name: 'Source code', exact: true }),
  ).toHaveValue(examples[0].input.source.text);
});

test('input tabs support keyboard navigation and reject invalid local files', async ({
  page,
}) => {
  await page.goto('/workspace');
  await page.getByRole('tab', { name: 'Source code' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Existing test' })).toBeFocused();
  await expect(
    page.getByRole('textbox', { name: 'Existing test code' }),
  ).toBeVisible();
  await page.keyboard.press('End');
  await expect(
    page.getByRole('tab', { name: 'Failure output' }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Source code' })).toBeFocused();
  await page
    .getByLabel('Open source file')
    .setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not TypeScript'),
    });
  await expect(
    page.getByRole('alert', { name: 'Analysis error' }),
  ).toContainText('Choose a .ts text file');
  await page
    .getByLabel('Open source file')
    .setInputFiles({
      name: 'valid.ts',
      mimeType: 'text/plain',
      buffer: Buffer.from('export const number = 1;'),
    });
  await expect(
    page.getByRole('textbox', { name: 'Source code', exact: true }),
  ).toHaveValue('export const number = 1;');
});
