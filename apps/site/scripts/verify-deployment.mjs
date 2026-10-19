import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { publicRoutes, getSiteOrigin } from '../src/lib/metadata.ts';

/** Verify routing, indexing, headers and caching on the actual host. */
export async function verifyDeployment(
  origin,
  target,
  revision,
  fetcher = fetch,
  canonicalOrigin = origin,
) {
  const base = new URL(origin);
  const canonicalBase = new URL(canonicalOrigin);
  assert.ok(['preview', 'production'].includes(target));
  if (base.protocol === 'https:') {
    getSiteOrigin(origin);
  } else {
    assert.ok(
      base.protocol === 'http:' &&
        ['127.0.0.1', 'localhost'].includes(base.hostname),
      'Only local verification may use HTTP',
    );
  }

  const request = (pathname, options = {}) =>
    fetcher(new URL(pathname, base), {
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      ...options,
    });
  let homepage;
  for (const route of publicRoutes) {
    const response = await request(route);
    assert.equal(response.status, 200, `Route failed: ${route}`);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.match(response.headers.get('cache-control') ?? '', /max-age=0/);
    assert.match(
      response.headers.get('cache-control') ?? '',
      /must-revalidate/,
    );
    assert.ok(
      response.headers
        .get('content-security-policy')
        ?.includes("connect-src 'self'"),
    );
    const html = await response.text();
    if (target === 'production') {
      assert.doesNotMatch(
        response.headers.get('x-robots-tag') ?? '',
        /noindex/,
      );
      assert.ok(
        html.includes(
          `rel="canonical" href="${new URL(route, canonicalBase).href}"`,
        ),
        `Wrong canonical: ${route}`,
      );
      assert.ok(!/name="robots" content="[^"]*noindex/.test(html));
    } else {
      assert.ok(/name="robots" content="[^"]*noindex/.test(html));
      assert.ok(!html.includes('rel="canonical"'));
      assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
    }

    if (route === '/') {
      homepage = html;
    }
  }

  for (const [source, destination] of [
    ['/downloads', '/download/'],
    ['/download.html', '/download/'],
    ['/releases.html', '/releases/'],
  ]) {
    const response = await request(source);
    assert.equal(response.status, 301, `Redirect failed: ${source}`);
    assert.equal(
      new URL(response.headers.get('location'), base).href,
      new URL(destination, base).href,
    );
  }

  const slash = await request('/download');
  assert.ok([301, 307, 308].includes(slash.status));
  assert.equal(
    new URL(slash.headers.get('location'), base).pathname,
    '/download/',
  );
  const missing = await request('/__comet_missing_page__/');
  assert.equal(missing.status, 404);
  assert.ok((await missing.text()).includes('Wrong orbit.'));
  const robots = await (await request('/robots.txt')).text();
  const sitemap = await (await request('/sitemap.xml')).text();
  if (target === 'production') {
    assert.ok(robots.includes(new URL('/sitemap.xml', canonicalBase).href));
    assert.ok(sitemap.includes(new URL('/download/', canonicalBase).href));
  } else {
    assert.ok(robots.includes('Disallow: /'));
    assert.ok(!sitemap.includes('<loc>'));
  }

  const script = /src="(\/_next\/static\/[^"?]+\.js)"/.exec(homepage)?.[1];
  assert.ok(script, 'No fingerprinted script found');
  const asset = await request(script);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('cache-control') ?? '', /max-age=31536000/);
  assert.match(asset.headers.get('cache-control') ?? '', /immutable/);
  const etag = asset.headers.get('etag');
  assert.ok(etag, 'Static asset must have an ETag');
  await asset.arrayBuffer();
  assert.equal(
    (await request(script, { headers: { 'If-None-Match': etag } })).status,
    304,
  );
  const marker = await (await request('/deployment.json')).json();
  assert.equal(marker.environment, target);
  assert.equal(
    marker.canonicalOrigin,
    target === 'production' ? canonicalBase.origin : null,
  );
  if (revision) {
    assert.equal(
      marker.revision,
      revision,
      'Host serves the wrong source revision',
    );
  }

  console.log(
    `Verified ${target} routes, redirects, security, indexing and cache behavior`,
  );
}

/** Allow edge propagation, but require every live check to pass together. */
export async function verifyPublishedDeployment(
  origin,
  target,
  revision,
  { fetcher = fetch, wait = setTimeout } = {},
) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await verifyDeployment(origin, target, revision, fetcher);

      return;
    } catch (error) {
      if (attempt === 6) {
        throw error;
      }

      console.warn(
        `Live checks pending; retry ${attempt}/5 after edge propagation.`,
      );
      await wait(5000);
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await verifyPublishedDeployment(
    process.argv[2],
    process.argv[3],
    process.argv[4],
  );
}
