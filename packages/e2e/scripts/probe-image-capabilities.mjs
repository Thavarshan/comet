import { chromium, firefox, webkit } from '@playwright/test';
import { arch, platform } from 'node:os';

// This is an architecture spike, not a claim about Safari/iOS or large files.
// Install the pinned browsers first; see ADR 0001 for the command.
const results = [];
for (const [name, launcher] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await launcher.launch();
  try {
    const page = await browser.newPage();
    await page.route('**/*', (route) => route.abort());
    const capabilities = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 8;
      canvas.height = 8;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas 2D is unavailable');
      }

      context.fillStyle = '#eb7b37';
      context.fillRect(0, 0, 8, 8);
      const formats = [];
      for (const requested of [
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/avif',
      ]) {
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, requested, 0.8),
        );
        if (!blob) {
          throw new Error(`No output for ${requested}`);
        }

        const image = await createImageBitmap(blob);
        const signature = Array.from(
          new Uint8Array(await blob.arrayBuffer()).slice(0, 12),
        );
        const header = String.fromCharCode(...signature);
        const validSignature =
          (blob.type === 'image/png' &&
            signature.slice(0, 4).join() === '137,80,78,71') ||
          (blob.type === 'image/jpeg' &&
            signature.slice(0, 3).join() === '255,216,255') ||
          (blob.type === 'image/webp' &&
            header.startsWith('RIFF') &&
            header.endsWith('WEBP')) ||
          (blob.type === 'image/avif' && header.slice(4, 12) === 'ftypavif');
        if (!validSignature || image.width !== 8 || image.height !== 8) {
          throw new Error(`Invalid encoded image: ${requested}`);
        }

        formats.push({
          requested,
          actual: blob.type,
          supported: blob.type === requested,
          bytes: blob.size,
          width: image.width,
          height: image.height,
          signature,
        });
        image.close();
      }

      return {
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        crossOriginIsolated: globalThis.crossOriginIsolated,
        sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        formats,
      };
    });
    results.push({ name, version: browser.version(), ...capabilities });
  } finally {
    await browser.close();
  }
}

console.log(
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      platform: platform(),
      arch: arch(),
      fixture: 'generated 8 × 8 opaque canvas; network requests blocked',
      results,
    },
    null,
    2,
  ),
);
