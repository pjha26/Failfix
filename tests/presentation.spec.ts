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

test('evidence cards assemble with scroll and reverse without trapping navigation', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const scene = page.locator('.evidence-sequence');
  await expect(page.locator('.story-site')).toHaveClass(/motion-ready/);
  const top = await scene.evaluate(
    (el) => el.getBoundingClientRect().top + scrollY,
  );
  await page.evaluate(
    (y) => scrollTo({ top: y - innerHeight, behavior: 'instant' }),
    top,
  );
  const progress = () =>
    scene.evaluate((el) =>
      Number((el as HTMLElement).style.getPropertyValue('--scene-progress')),
    );
  await expect.poll(progress).toBe(0);
  const card = page.locator('.assembly-error');
  const before = await card.evaluate((el) => getComputedStyle(el).transform);
  await page.evaluate(
    (y) => scrollTo({ top: y + 450, behavior: 'instant' }),
    top,
  );
  await expect.poll(progress).toBeGreaterThan(0.5);
  if (testInfo.project.name === 'desktop') {
    await expect
      .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe(before);
    await expect(page.locator('.evidence-sticky')).toHaveCSS(
      'position',
      'sticky',
    );
  } else {
    await expect(card).toHaveCSS('transform', 'none');
    await expect(page.locator('.evidence-sticky')).toHaveCSS(
      'position',
      'relative',
    );
  }
  await page.evaluate(
    (y) => scrollTo({ top: y - innerHeight, behavior: 'instant' }),
    top,
  );
  await expect.poll(progress).toBe(0);
  await page.getByRole('button', { name: 'Pause animations' }).click();
  await expect(card).toHaveCSS('transform', 'none');
  await expect(page.locator('.evidence-sticky')).toHaveCSS(
    'position',
    'relative',
  );
  expect(
    await scene.evaluate((el) =>
      (el as HTMLElement).style.getPropertyValue('--scene-progress'),
    ),
  ).toBe('');
  await page
    .getByRole('link', { name: 'Investigate a build', exact: false })
    .click();
  await expect(page).toHaveURL(/\/deployments$/);
});

test('reduced motion keeps the new scenes flat, readable, and within the viewport', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.assembly-card')).toHaveCount(3);
  for (const card of await page.locator('.assembly-card').all()) {
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS('transform', 'none');
  }
  await expect(page.locator('.evidence-sticky')).toHaveCSS(
    'position',
    'relative',
  );
  await expect(page.locator('.scroll-ink')).toHaveCSS(
    '-webkit-text-fill-color',
    await page.locator('.review-principle').evaluate((el) => getComputedStyle(el).color),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('phosphor monitors keep their overlays noninteractive and stop scanning when motion is paused', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const monitor = page.locator('.glass-body.crt-screen');
  await expect(page.locator('.crt-screen')).toHaveCount(2);
  await expect(page.locator('.story-site')).toHaveClass(/motion-ready/);
  const scan = () =>
    monitor.evaluate((el) => getComputedStyle(el, '::after').animationName);
  await expect.poll(scan).toBe('phosphor-scan');
  expect(
    await monitor.evaluate(
      (el) => getComputedStyle(el, '::before').pointerEvents,
    ),
  ).toBe('none');
  expect(
    await monitor.evaluate(
      (el) => getComputedStyle(el, '::after').pointerEvents,
    ),
  ).toBe('none');
  await page
    .getByRole('button', { name: 'Add the context', exact: false })
    .click();
  await expect(
    page.getByLabel('Illustrative investigation preview'),
  ).toContainText('"dependencies"');
  await page.getByRole('button', { name: 'Pause animations' }).click();
  await expect.poll(scan).toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(scan).toBe('none');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
