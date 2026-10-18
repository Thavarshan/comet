import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getSiteOrigin,
  pageMetadata,
  publicRoutes,
} from '../src/lib/metadata.ts';

test('canonical configuration accepts HTTPS origins and rejects URL pollution', () => {
  assert.equal(getSiteOrigin(''), undefined);
  assert.equal(
    getSiteOrigin('https://comet.example').href,
    'https://comet.example/',
  );
  for (const value of [
    'https://localhost',
    'https://127.0.0.1',
    'https://[::1]',
    'http://comet.example',
    'not a URL',
    'https://comet.example/path',
    'https://user:password@comet.example',
    'https://comet.example/?tracking=1',
    'https://comet.example/#fragment',
  ]) {
    assert.throws(() => getSiteOrigin(value), value);
  }
});

test('every real route has its own canonical and matching social metadata', () => {
  const previous = process.env.COMET_SITE_URL;
  try {
    process.env.COMET_SITE_URL = 'https://comet.example';
    for (const route of publicRoutes) {
      const metadata = pageMetadata(
        route,
        'Example title',
        'Example description',
      );
      assert.equal(
        metadata.alternates.canonical,
        'https://comet.example' + route,
      );
      assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
      assert.equal(metadata.openGraph.title, metadata.title);
      assert.equal(metadata.twitter.description, metadata.description);
      assert.equal(metadata.robots.index, true);
      assert.equal(
        metadata.openGraph.images[0].url,
        'https://comet.example/og-comet.png',
      );
    }

    delete process.env.COMET_SITE_URL;
    const preview = pageMetadata('/', 'Preview', 'Not a deployed site');
    assert.equal(preview.robots.index, false);
    assert.equal(preview.alternates, undefined);
    assert.deepEqual(preview.openGraph.images, []);
  } finally {
    if (previous === undefined) {
      delete process.env.COMET_SITE_URL;
    } else {
      process.env.COMET_SITE_URL = previous;
    }
  }
});
