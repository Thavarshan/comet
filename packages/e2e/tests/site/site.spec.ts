import { expect, test } from '@playwright/test';

/**
 * Test an exported marketing site with the same browser real people use.
 *
 * Source-only tests cannot find a clipped mobile layout, inaccessible focus
 * target, or broken animation control. These tests cover those gaps while
 * making no claim that human visual review is unnecessary.
 */
test('site navigates from home to official desktop downloads', async ({
  page,
}) => {
  const forbiddenRequests: string[] = [];

  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method())) {
      forbiddenRequests.push(request.method() + ' ' + request.url());
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Keep the file.',
  );
  await page.getByRole('link', { name: /Download Comet/ }).click();
  await expect(page).toHaveURL('/download/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Good things',
  );

  const release = page.getByRole('link', { name: /Browse stable releases/ });
  await expect(release).toHaveAttribute(
    'href',
    'https://github.com/Thavarshan/comet/releases/latest',
  );

  expect(forbiddenRequests).toEqual([]);
});

test('the exported pages fit narrow screens without sideways scrolling', async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 820 });

    for (const route of ['/', '/download/']) {
      await page.goto(route);

      const fitsViewport = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );

      expect(
        fitsViewport,
        route + ' caused horizontal overflow at width ' + width,
      ).toBe(true);
    }
  }
});

test('motion can be paused and the browser accessibility setting is honored', async ({
  page,
}) => {
  await page.goto('/');
  const ring = page.locator('.orbit-ring--outer');
  const pause = page.getByRole('button', { name: 'Pause decorative motion' });

  await pause.click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-motion-paused',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Resume decorative motion' }),
  ).toHaveAttribute('aria-pressed', 'true');

  const playState = await ring.evaluate(
    (element) => getComputedStyle(element).animationPlayState,
  );
  expect(playState).toBe('paused');

  await page.getByRole('button', { name: 'Resume decorative motion' }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-motion-paused',
    'false',
  );

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedDuration = await ring.evaluate(
    (element) => getComputedStyle(element).animationDuration,
  );

  expect(parseFloat(reducedDuration)).toBeLessThan(0.01);
});
