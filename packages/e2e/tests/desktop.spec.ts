import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { launchDesktop, type DesktopSession } from '../src/desktop.js';
import { selectDesktopFiles } from '../src/upload.js';
import { nativePaths } from '../src/paths.js';
import { ConverterPage } from '../src/converter-page.js';
import { createSeedMedia, verifyMedia, mediaDigest } from '../src/media.js';
import { defaultPreferences, mediaTypes } from '@honeymelon/contracts';

const { ffmpegPath: ffmpeg, ffprobePath: ffprobe } = nativePaths;

function native(args: string[]) {
  return execFileSync(ffmpeg, ['-nostdin', '-v', 'error', ...args], {
    timeout: 20000,
  });
}

test('isolated desktop converts video, audio and images, cancels a batch, and persists settings', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'honeymelon-e2e-'));
  const profile = path.join(directory, 'profile');
  const output = path.join(directory, 'output');
  const fixtures = path.join(directory, 'fixtures');
  await Promise.all([mkdir(profile), mkdir(output), mkdir(fixtures)]);
  const preferences = { ...defaultPreferences(output), legacyImported: true };
  await writeFile(
    path.join(profile, 'preferences-v1.json'),
    JSON.stringify(preferences),
  );
  const audio = path.join(fixtures, 'sample ü.wav');
  const video = path.join(fixtures, 'sample ü.mp4');
  const image = path.join(fixtures, 'picture ü.png');
  const large = path.join(fixtures, 'cancel me.mp4');
  native(['-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '0.5', audio]);
  native([
    '-f',
    'lavfi',
    '-i',
    'color=c=blue:s=176x144:r=25',
    '-t',
    '0.5',
    '-c:v',
    'libx264',
    video,
  ]);
  native([
    '-f',
    'lavfi',
    '-i',
    'color=c=blue:s=16x16',
    '-frames:v',
    '1',
    image,
  ]);
  native([
    '-f',
    'lavfi',
    '-i',
    'testsrc2=s=1920x1080:r=30',
    '-t',
    '8',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    large,
  ]);
  let session: DesktopSession | undefined;
  try {
    session = await launchDesktop(profile, directory);
    const { page } = session;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.getByRole('button', { name: 'Output settings' }).click();
    const inspector = page.getByRole('dialog');
    await expect(
      inspector.getByRole('combobox', { name: 'Task' }),
    ).toBeFocused();
    await inspector.getByRole('button', { name: 'Advanced options' }).click();
    // Establish geometry after the dialog's entrance zoom has settled.
    await inspector.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      );
    });
    const viewport = inspector.locator('[data-slot="scroll-area-viewport"]');
    const heading = inspector.getByRole('heading');
    const headerBefore = await heading.boundingBox();
    await expect(inspector).toHaveCSS('overflow-y', 'hidden');
    await expect(heading).toHaveCount(1);
    // Keyboard focus scrolls the last field into the Radix viewport.
    await inspector.getByRole('switch', { name: 'Include audio' }).focus();
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    expect(await heading.boundingBox()).toEqual(headerBefore);
    await expect(
      inspector.getByRole('button', { name: 'Dismiss' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Output settings' }),
    ).toBeFocused();
    for (const [media, fixture] of [
      ['Video', video],
      ['Audio', audio],
      ['Image', image],
    ] as const) {
      const converter = new ConverterPage(page, selectDesktopFiles);
      await converter.selectMedia(media);
      await converter.addFiles([fixture!]);
      await converter.convert();
      await converter.expectComplete();
    }

    const reply = await page.evaluate(() => window.honeymelon.getSnapshot());
    if (!reply.ok) {
      throw new Error(reply.error.message);
    }

    expect(reply.value.jobs).toHaveLength(3);
    for (const job of reply.value.jobs) {
      expect(job.state).toBe('succeeded');
      const metadata = JSON.parse(
        execFileSync(
          ffprobe,
          ['-v', 'error', '-show_streams', '-of', 'json', job.outputPath!],
          {
            encoding: 'utf8',
            timeout: 10000,
          },
        ),
      );
      expect(metadata.streams.length).toBeGreaterThan(0);
    }

    await page.getByRole('tab', { name: 'Video' }).click();
    const panel = page.getByRole('tabpanel');
    await selectDesktopFiles(page, [large, video]);
    await panel.getByRole('button', { name: 'Convert', exact: true }).click();
    await panel
      .getByRole('button', { name: 'Cancel batch', exact: true })
      .click();
    await expect(panel.getByText('Canceled', { exact: true })).toHaveCount(2);
    expect(
      (await readdir(output)).some((name) => name.startsWith('.honeymelon-')),
    ).toBe(false);
    const titlebar = page.locator('.desktop-titlebar');
    const title = page.getByRole('heading', {
      name: 'Honeymelon',
      exact: true,
    });
    const barBounds = await titlebar.boundingBox();
    const titleBounds = await title.boundingBox();
    expect(barBounds).not.toBeNull();
    expect(titleBounds).not.toBeNull();
    expect(
      Math.abs(
        titleBounds!.x +
          titleBounds!.width / 2 -
          (barBounds!.x + barBounds!.width / 2),
      ),
    ).toBeLessThanOrEqual(1);
    await expect(titlebar).toHaveCSS('-webkit-app-region', 'drag');
    if (process.env.HONEYMELON_SCREENSHOT) {
      await page.screenshot({ path: process.env.HONEYMELON_SCREENSHOT });
    }

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('combobox', { name: 'Appearance' }).click();
    await page.getByRole('option', { name: 'Dark', exact: true }).click();
    if (!(await page.getByLabel('Language', { exact: true }).isVisible())) {
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
    }

    await page.getByRole('combobox', { name: 'Language', exact: true }).click();
    await page.getByRole('option', { name: 'Español' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tab', { name: 'Vídeo' })).toBeVisible();
    await expect
      .poll(
        async () =>
          JSON.parse(
            await readFile(path.join(profile, 'preferences-v1.json'), 'utf8'),
          ).locale,
      )
      .toBe('es');
    expect(errors).toEqual([]);
    await session.close();
    session = undefined;
    session = await launchDesktop(profile, directory);
    await expect(
      session.page.getByRole('tab', { name: 'Vídeo' }),
    ).toBeVisible();
    await expect(session.page.locator('html')).toHaveClass(/dark/);
    const restarted = await session.page.evaluate(() =>
      window.honeymelon.getSnapshot(),
    );
    expect(restarted.ok && restarted.value.jobs).toEqual([]);
  } finally {
    await session?.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('imports a legacy packaged profile while retaining application identity and file origin', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'honeymelon-legacy-'));
  const profile = path.join(directory, 'profile');
  await mkdir(profile);
  let session: DesktopSession | undefined;
  try {
    session = await launchDesktop(profile, directory);
    await session.page.evaluate(() => {
      localStorage.setItem('locale', 'es');
      localStorage.setItem('color-mode', 'dark');
      localStorage.setItem('converter-unused-random-id', '{"running":true}');
    });
    await session.close();
    session = undefined;
    await rm(path.join(profile, 'preferences-v1.json'));
    session = await launchDesktop(profile, directory);
    await expect(
      session.page.getByRole('tab', { name: 'Vídeo' }),
    ).toBeVisible();
    await expect(session.page.locator('html')).toHaveClass(/dark/);
    expect(session.page.url()).toContain(
      '/.vite/renderer/main_window/index.html',
    );
    const preferences = JSON.parse(
      await readFile(path.join(profile, 'preferences-v1.json'), 'utf8'),
    );
    expect(preferences.locale).toBe('es');
    expect(preferences.theme).toBe('dark');
    expect(preferences.legacyImported).toBe(true);
    const queue = await session.page.evaluate(() =>
      window.honeymelon.getSnapshot(),
    );
    expect(queue.ok && queue.value.jobs).toEqual([]);
  } finally {
    await session?.close();
    await rm(directory, { recursive: true, force: true });
  }
});

for (const media of mediaTypes) {
  test(`desktop converts every available ${media} output through the UI`, async () => {
    test.setTimeout(180000);
    const directory = await mkdtemp(
      path.join(tmpdir(), 'honeymelon-ui-formats-'),
    );
    let session: DesktopSession | undefined;
    try {
      const profile = path.join(directory, 'profile');
      const output = path.join(directory, 'output');
      await Promise.all([mkdir(profile), mkdir(output)]);
      const seeds = await createSeedMedia(
        path.join(directory, 'fixtures'),
        nativePaths,
      );
      const original = await mediaDigest(seeds[media]);
      await writeFile(
        path.join(profile, 'preferences-v1.json'),
        JSON.stringify({
          ...defaultPreferences(output),
          legacyImported: true,
        }),
      );
      session = await launchDesktop(profile, directory);
      const { page } = session;
      const environment = await page.evaluate(() =>
        window.honeymelon.getEnvironment(),
      );
      if (!environment.ok) {
        throw new Error(environment.error.message);
      }

      const converter = new ConverterPage(page, selectDesktopFiles);
      await converter.selectMedia(
        { video: 'Video', audio: 'Audio', image: 'Image' }[media],
      );
      for (const capability of environment.value.capabilities[media]) {
        await test.step(capability.format, async () => {
          if (!capability.available) {
            await converter.panel
              .getByRole('combobox', { name: 'Output format' })
              .click();
            await page
              .getByRole('combobox', { name: 'Search formats' })
              .fill(capability.format);
            await expect(
              page.getByRole('option', {
                name: new RegExp(`^${capability.format.toUpperCase()}`),
              }),
            ).toHaveAttribute('aria-disabled', 'true');
            await page.keyboard.press('Escape');

            return;
          }

          await converter.selectFormat(capability.format);
          await converter.addFiles([seeds[media]]);
          await converter.convert();
          await converter.expectComplete();
          const reply = await page.evaluate(() =>
            window.honeymelon.getSnapshot(),
          );
          if (!reply.ok) {
            throw new Error(reply.error.message);
          }

          const completed = reply.value.jobs.at(-1);
          expect(completed?.state).toBe('succeeded');
          expect(completed?.outputFormat).toBe(capability.format);
          expect(completed?.outputPath).toBeTruthy();
          await verifyMedia(nativePaths, completed!.outputPath!, media);
          await converter.panel
            .getByRole('button', { name: 'Clear', exact: true })
            .click();
        });
      }

      expect(await mediaDigest(seeds[media])).toBe(original);
    } finally {
      await session?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
}
