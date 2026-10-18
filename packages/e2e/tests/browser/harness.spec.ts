import { test, expect } from '@playwright/test';
import path from 'node:path';

test('shared converter boots without credentials, native bridge or source uploads', async ({
  page,
  baseURL,
}) => {
  const violations: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (
      new URL(request.url()).origin !== new URL(baseURL!).origin ||
      !['GET', 'HEAD'].includes(request.method())
    ) {
      violations.push(request.method() + ' ' + new URL(request.url()).pathname);
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Image' })).toBeVisible();
  expect(await page.evaluate(() => 'comet' in window)).toBe(false);
  await page
    .getByLabel('Add files', { exact: true })
    .setInputFiles(path.resolve('fixtures/images/rgb.png'));
  await expect(page.getByText('rgb.png', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Convert', exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 360, height: 740 });
  for (const dark of [false, true]) {
    await page.evaluate(
      (value) => document.documentElement.classList.toggle('dark', value),
      dark,
    );
    await page.getByRole('button', { name: 'Output settings' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      );
    });
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
  expect(violations).toEqual([]);
});
