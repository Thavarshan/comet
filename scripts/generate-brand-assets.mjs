import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  mkdtemp,
  rm,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(
  new URL('../packages/e2e/package.json', import.meta.url),
);
const { chromium } = require('@playwright/test');
const root = new URL('../', import.meta.url);
const iconDirectory = new URL('assets/icons/', root);
const temporary = await mkdtemp(path.join(tmpdir(), 'honeymelon-icons-'));
const iconset = path.join(temporary, 'Honeymelon.iconset');
await mkdir(iconset);
await mkdir(iconDirectory, { recursive: true });
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  const logo = await readFile(new URL('assets/logo.svg', root), 'utf8');
  const images = [];
  for (const size of [16, 24, 32, 48, 64, 128, 256, 512, 1024]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      '<body style="margin:0">' +
        logo.replace(
          'width="64" height="64"',
          `width="${size}" height="${size}"`,
        ),
    );
    const bytes = await page.screenshot({ omitBackground: true });
    images.push({ size, bytes });
    await writeFile(path.join(temporary, `${size}.png`), bytes);
  }

  for (const [name, size] of [
    ['icon.png', 512],
    ['icon-256.png', 256],
  ]) {
    await copyFile(
      path.join(temporary, `${size}.png`),
      new URL(name, iconDirectory),
    );
  }

  const entries = images.filter(({ size }) => size <= 256);
  const header = Buffer.alloc(6 + entries.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  entries.forEach(({ size, bytes }, index) => {
    const at = 6 + index * 16;
    header[at] = size === 256 ? 0 : size;
    header[at + 1] = header[at];
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(bytes.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += bytes.length;
  });
  const ico = Buffer.concat([header, ...entries.map(({ bytes }) => bytes)]);
  for (const name of [
    'icon.ico',
    'icon@2x.ico',
    'setup-icon.ico',
    'setup-icon@2x.ico',
  ]) {
    await writeFile(new URL(name, iconDirectory), ico);
  }

  if (process.platform === 'darwin') {
    for (const size of [16, 32, 128, 256, 512]) {
      await copyFile(
        path.join(temporary, `${size}.png`),
        path.join(iconset, `icon_${size}x${size}.png`),
      );
      await copyFile(
        path.join(temporary, `${size * 2}.png`),
        path.join(iconset, `icon_${size}x${size}@2x.png`),
      );
    }

    const output = new URL('icon.icns', iconDirectory);
    execFileSync('iconutil', ['-c', 'icns', '-o', output.pathname, iconset]);
    await copyFile(output, new URL('icon@2x.icns', iconDirectory));
  }

  await page.setViewportSize({ width: 1200, height: 630 });
  const social = await readFile(
    new URL('apps/site/public/og-honeymelon.svg', root),
    'utf8',
  );
  await page.setContent('<body style="margin:0">' + social);
  await page.screenshot({
    path: new URL('apps/site/public/og-honeymelon.png', root).pathname,
  });
} finally {
  await browser.close();
  await rm(temporary, { recursive: true, force: true });
}

console.log('Generated Honeymelon PNG, ICO, social and macOS icon assets.');
