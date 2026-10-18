import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

    for (const route of [
      '/',
      '/download/',
      '/features/',
      '/docs/',
      '/privacy/',
      '/releases/',
      '/license/',
    ]) {
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

test('product guidance is navigable and honest about browser availability', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Features' }).click();
  await expect(page).toHaveURL('/features/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('no live browser converter yet')).toBeVisible();

  await page.getByRole('link', { name: 'Docs' }).click();
  await expect(page).toHaveURL('/docs/');
  await expect(
    page.getByRole('heading', { name: 'Getting started with Comet' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL('/privacy/');
  await expect(
    page.getByRole('heading', { name: 'Privacy and limitations' }),
  ).toBeVisible();
});

test('keyboard users can reach the skip link on a content page', async ({
  page,
}) => {
  await page.goto('/privacy/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator('main')).toBeFocused();
});

/**
 * Audit real exported markup and contrast at desktop and phone sizes.
 */
for (const width of [390, 1280]) {
  test(
    'public routes pass WCAG A/AA checks at width ' + width,
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        '/',
        '/download/',
        '/features/',
        '/docs/',
        '/privacy/',
        '/releases/',
        '/license/',
      ]) {
        await page.goto(route);
        const audit = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const label = route === '/' ? 'home' : route.replaceAll('/', '');

        await testInfo.attach(label + '-axe.json', {
          body: JSON.stringify(audit, null, 2),
          contentType: 'application/json',
        });
        await testInfo.attach(label + '.png', {
          body: await page.screenshot({
            fullPage: true,
            animations: 'disabled',
          }),
          contentType: 'image/png',
        });
        expect(audit.violations, route + ' accessibility violations').toEqual(
          [],
        );
      }
    },
  );
}

/** Search crawlers and visitors must see complete, unique static content. */
test('all routes have metadata, intact local links and reserved image space', async ({
  page,
}) => {
  const titles = new Set<string>();
  for (const route of [
    '/',
    '/download/',
    '/features/',
    '/docs/',
    '/privacy/',
    '/releases/',
    '/license/',
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const title = await page.title();
    expect(titles.has(title), 'Duplicate title on ' + route).toBe(false);
    titles.add(title);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /\S.{30,}/);
    const localLinks = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .filter((href): href is string => Boolean(href)),
      );
    for (const href of new Set(localLinks)) {
      const target = await page.request.get(href.split('#')[0] || '/');
      expect(target.status(), 'Broken link ' + href + ' on ' + route).toBe(200);
    }

    for (const image of await page.locator('img').all()) {
      await expect(image).toHaveAttribute('alt');
      expect(Number(await image.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(await image.getAttribute('height'))).toBeGreaterThan(0);
    }
  }
});

/**
 * Reading and download navigation remain available without JavaScript.
 */
test('essential content works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('link', { name: 'Docs', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Getting started with Comet' }),
    ).toBeVisible();
    await expect(
      page.getByText('shasum -a 256 PACKAGE', { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

/** Record repeatable lab paint/layout metrics without adding site telemetry. */
test('mobile first paint and layout stay within lab budgets', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const state = { lcp: 0, cls: 0 };
    const host = window as Window & { cometLabVitals?: typeof state };

    host.cometLabVitals = state;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.lcp = entry.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };

        if (!shift.hadRecentInput) {
          state.cls += shift.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const results = [];

  for (const route of ['/', '/features/']) {
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const host = window as Window & {
        cometLabVitals?: { lcp: number; cls: number };
      };

      return (host.cometLabVitals?.lcp ?? 0) > 0;
    });
    const metrics = await page.evaluate(() => {
      const host = window as Window & {
        cometLabVitals?: { lcp: number; cls: number };
      };

      return host.cometLabVitals;
    });

    expect(metrics, 'Missing lab metrics for ' + route).toBeDefined();
    expect(metrics?.lcp, route + ' LCP in milliseconds').toBeLessThan(5000);
    expect(metrics?.cls, route + ' layout shift').toBeLessThanOrEqual(0.1);
    results.push({ route, ...metrics });
  }

  await testInfo.attach('mobile-lab-vitals.json', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
});
