import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('site deploy is static-only with a proper 404 response', async () => {
  const wrangler = await readFile(
    new URL('../wrangler.toml', import.meta.url),
    'utf8',
  );
  assert.match(wrangler, /directory = "\.\/out"/);
  assert.match(wrangler, /not_found_handling = "404-page"/);
  assert.doesNotMatch(wrangler, /^main\s*=/m);
});

test('static security headers prohibit framing and media permissions', async () => {
  const headers = await readFile(
    new URL('../public/_headers', import.meta.url),
    'utf8',
  );
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /camera=\(\)/);
  assert.match(headers, /connect-src 'self'/);
});
