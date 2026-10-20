import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { defaultPreferences } from '@honeymelon/contracts';
import { launchDesktop } from '../packages/e2e/dist/desktop.js';
import { selectDesktopFiles } from '../packages/e2e/dist/upload.js';
import { ConverterPage } from '../packages/e2e/dist/converter-page.js';

const root = new URL('../', import.meta.url);
const temporary = await mkdtemp(path.join(tmpdir(), 'honeymelon-shots-'));
const output = path.join(temporary, 'Converted media');
await mkdir(output);
const ffmpeg = new URL(
  `apps/desktop/.cache/bin/${process.platform}-${process.arch}/ffmpeg`,
  root,
).pathname;
const files = ['Coastal walk.mp4', 'Studio recording.mp4'].map((name) =>
  path.join(temporary, name),
);
for (const filename of files) {
  execFileSync(ffmpeg, [
    '-nostdin',
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'testsrc2=s=320x180:r=24',
    '-t',
    '1',
    '-c:v',
    'libx264',
    filename,
  ]);
}

try {
  for (const theme of ['light', 'dark']) {
    const profile = path.join(temporary, theme);
    await mkdir(profile);
    await writeFile(
      path.join(profile, 'preferences-v1.json'),
      JSON.stringify({
        ...defaultPreferences(output),
        theme,
        legacyImported: true,
      }),
    );
    const session = await launchDesktop(profile, temporary);
    try {
      const { page } = session;
      const capture = async (name) => {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: new URL(`assets/screenshots/${name}.png`, root).pathname,
          animations: 'disabled',
        });
      };

      if (theme === 'light') {
        await capture('desktop-empty');
      }

      const converter = new ConverterPage(page, selectDesktopFiles);
      await converter.addFiles(files);
      if (theme === 'light') {
        await converter.convert();
        await page.getByText('Complete', { exact: true }).first().waitFor();
        await page.getByText('Complete', { exact: true }).nth(1).waitFor();
      }

      await capture(`desktop-${theme}`);
      if (theme === 'dark') {
        await page.getByRole('button', { name: 'Output settings' }).click();
        await page.getByRole('dialog').waitFor();
        await capture('output-settings');
      }
    } finally {
      await session.close();
    }
  }

  for (const name of ['desktop-light', 'desktop-dark', 'output-settings']) {
    execFileSync(ffmpeg, [
      '-nostdin',
      '-v',
      'error',
      '-y',
      '-i',
      new URL(`assets/screenshots/${name}.png`, root).pathname,
      '-vf',
      'scale=1000:-1',
      '-c:v',
      'libwebp',
      '-quality',
      '82',
      '-frames:v',
      '1',
      new URL(`apps/site/public/screenshots/${name}.webp`, root).pathname,
    ]);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
