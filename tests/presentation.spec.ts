import { expect, test } from '@playwright/test';

test('scroll depth and the signal dial follow the page and stop when paused', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const window = page.locator('.build-glass');
  await expect(page.locator('.story-site')).toHaveClass(/motion-ready/);
  const initial = await window.evaluate((el) => getComputedStyle(el).transform);
  await page.evaluate(() =>
    globalThis.scrollTo({ top: 360, behavior: 'instant' }),
  );
  await expect
    .poll(() => window.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(initial);
  await expect
    .poll(() =>
      page
        .locator('.story-site')
        .evaluate((el) =>
          Number((el as HTMLElement).style.getPropertyValue('--page-progress')),
        ),
    )
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause animations' }).click();
  await expect(window).toHaveCSS('transform', 'none');
  await expect(page.locator('.floating-receipt')).toHaveCSS(
    'transform',
    'none',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(
    page.getByRole('button', { name: 'Pause animations' }),
  ).toBeDisabled();
  await expect(window).toHaveCSS('transform', 'none');
});

test('landing and debugging desks retain readable type at both viewport sizes', async ({
  page,
}) => {
  await page.goto('/');
  const size = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(
    await size('.hero-copy > p:not(.hero-footnote)'),
  ).toBeGreaterThanOrEqual(16);
  expect(await size('.chapter-switcher button')).toBeGreaterThanOrEqual(12);
  expect(await size('.terminal-line')).toBeGreaterThanOrEqual(12);
  for (const route of ['/workspace', '/deployments']) {
    await page.goto(route);
    expect(await size('textarea')).toBeGreaterThanOrEqual(12);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
