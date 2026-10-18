import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
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
  '404.html',
  'robots.txt',
  '_headers',
  'logo.svg',
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
assert.ok(landing.includes('Pause decorative motion'));
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
assert.ok(headers.includes('Content-Security-Policy:'));
assert.ok(headers.includes("frame-ancestors 'none'"));
assert.ok(!landing.includes('/_next/image?'), 'No runtime image optimizer');

console.log('Comet site static pages and release links verified');
