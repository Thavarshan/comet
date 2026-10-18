import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { brotliCompressSync } from 'node:zlib';
import path from 'node:path';

/**
 * Fail a production build if its static pages or security files are missing.
 *
 * Next.js exports HTML and assets to out/. Cloudflare can serve these files
 * directly, without executing an application server for each visitor.
 * This check deliberately opens the generated output instead of relying only
 * on TypeScript compiling the original React source.
 */
const output = path.resolve('out');
const required = [
  'index.html',
  'download/index.html',
  'docs/index.html',
  'features/index.html',
  'privacy/index.html',
  'releases/index.html',
  'license/index.html',
  'sitemap.xml',
  '404.html',
  'robots.txt',
  '_headers',
  'logo.svg',
  'og-comet.png',
  'screenshots/desktop-light.webp',
  'screenshots/output-settings.webp',
];

for (const name of required) {
  const asset = path.join(output, name);
  assert((await stat(asset)).isFile(), 'Missing static asset: ' + name);
}

const landing = await readFile(path.join(output, 'index.html'), 'utf8');
const download = await readFile(
  path.join(output, 'download/index.html'),
  'utf8',
);
const notFound = await readFile(path.join(output, '404.html'), 'utf8');
const headers = await readFile(path.join(output, '_headers'), 'utf8');

/*
 * Validate exact known destinations. A substring regex for a GitHub URL can
 * accept malicious lookalike hosts, so we match the full href attribute.
 * Issue #71 will replace the fixed release links with a verified manifest.
 */
assert.ok(
  landing.includes('href="/download/"'),
  'Home page must link to the exported download page',
);
assert.ok(landing.includes('Keep the file.'));
assert.ok(landing.includes('Pause motion'));
assert.ok(
  download.includes(
    'href="https://github.com/Thavarshan/comet/releases/latest"',
  ),
  'Download page must link to the official stable release',
);
assert.ok(
  download.includes(
    'href="https://github.com/Thavarshan/comet/releases/tag/v3.0.0-beta.1"',
  ),
  'Download page must link to the correct published beta',
);
assert.ok(notFound.includes('Wrong orbit.'));
assert.ok(landing.includes('href="/download/"'));
const docs = await readFile(path.join(output, 'docs/index.html'), 'utf8');
const privacy = await readFile(path.join(output, 'privacy/index.html'), 'utf8');
const features = await readFile(
  path.join(output, 'features/index.html'),
  'utf8',
);
assert.ok(docs.includes('Getting started with Comet'));
assert.ok(privacy.includes('Privacy and limitations'));
assert.ok(features.includes('Desktop or browser?'));
assert.ok(features.includes('no live browser converter yet'));
// Social images are emitted only when a canonical deployment is configured.
const origin = process.env.COMET_SITE_URL;
const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
const robots = await readFile(path.join(output, 'robots.txt'), 'utf8');
if (origin) {
  assert.ok(landing.includes('og-comet.png'));
  assert.ok(sitemap.includes(new URL('/features/', origin).href));
  assert.ok(robots.includes(new URL('/sitemap.xml', origin).href));
} else {
  assert.ok(landing.includes('noindex'));
  assert.ok(robots.includes('Disallow: /'));
  assert.ok(!sitemap.includes('<loc>'));
}

assert.ok(docs.includes('not available'));
assert.ok(
  privacy.includes('hosting providers') ||
    privacy.includes('Hosting providers'),
);
assert.ok(headers.includes('Content-Security-Policy:'));
assert.ok(headers.includes("frame-ancestors 'none'"));
assert.ok(!landing.includes('/_next/image?'), 'No runtime image optimizer');

console.log('Comet site static pages and release links verified');

// Fail before deployment if a screenshot or social asset becomes excessive.
for (const asset of [
  'og-comet.png',
  'screenshots/desktop-light.webp',
  'screenshots/output-settings.webp',
]) {
  assert.ok(
    (await stat(path.join(output, asset))).size < 150_000,
    asset + ' exceeds the 150 kB asset budget',
  );
}

// Budget all exported JavaScript, including framework and route chunks.
let javascriptBytes = 0;
for (const asset of await readdir(path.join(output, '_next'), {
  recursive: true,
})) {
  if (asset.endsWith('.js')) {
    const bytes = await readFile(path.join(output, '_next', asset));
    javascriptBytes += brotliCompressSync(bytes).length;
  }
}

assert.ok(
  javascriptBytes < 250_000,
  'Exported JavaScript exceeds 250 kB Brotli',
);
console.log('Exported JavaScript Brotli bytes:', javascriptBytes);
