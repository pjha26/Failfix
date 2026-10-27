import { expect, test } from '@playwright/test';
import { examples } from '../lib/examples';

test('the animated landing opens a real test case from its case files', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Build failed.',
  );
  const scene = await page.locator('.build-signal').boundingBox();
  const graphic = await page.locator('.signal-map').boundingBox();
  expect(scene).not.toBeNull();
  expect(graphic!.x).toBeCloseTo(scene!.x, 0);
  await page.getByRole('link', { name: /Zero is a value/ }).click();
  await expect(page).toHaveURL(/\/workspace\?example=zero/);
  await expect(
    page.getByRole('textbox', { name: 'Source code', exact: true }),
  ).toHaveValue(examples[0].input.source.text);
  await expect(page.getByText('Tests have not been run here')).toBeVisible();
});

test('case-file links open complete walkthroughs without calling analysis', async ({
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

test('landing navigation is keyboard accessible and fits the viewport', async ({
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

test('scroll chapters change the preview and motion can be paused', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const chapters = page.getByRole('navigation', {
    name: 'Investigation chapters',
  });
  await chapters.getByRole('button', { name: 'Add the context' }).click();
  await expect(
    page.getByLabel('Illustrative investigation preview'),
  ).toContainText('"dependencies"');
  await chapters.getByRole('button', { name: 'Review the change' }).click();
  await expect(
    page.getByLabel('Illustrative investigation preview'),
  ).toContainText('next build');
  await expect(
    chapters.getByRole('button', { name: 'Review the change' }),
  ).toHaveAttribute('aria-current', 'step');
  const pause = page.getByRole('button', { name: 'Pause animations' });
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.story-site')).toHaveClass(/motion-muted/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('reduced-motion preferences preserve readable content and working build navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Pause animations' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Pause animations' }),
  ).toContainText('Reduced motion');
  const firstReveal = page.locator('[data-reveal]').first();
  await expect(firstReveal).toHaveCSS('opacity', '1');
  await page
    .getByRole('link', { name: 'Investigate a build', exact: false })
    .click();
  await expect(page).toHaveURL(/\/deployments$/);
  await expect(
    page.getByRole('heading', { name: 'Find the break in your build.' }),
  ).toBeVisible();
});

test('the server-rendered landing remains readable without JavaScript', async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport || { width: 1280, height: 720 },
  });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3006/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Build failed.',
    );
    await expect(page.locator('[data-reveal]').first()).toHaveCSS(
      'opacity',
      '1',
    );
    await expect(page.locator('.assembly-card')).toHaveCount(3);
    await expect(page.locator('.evidence-sticky')).toHaveCSS(
      'position',
      'relative',
    );
    await expect(
      page.getByRole('link', { name: /Zero is a value/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
