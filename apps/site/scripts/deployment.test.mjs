import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyDeployment } from './verify-deployment.mjs';
import { publicRoutes } from '../src/lib/metadata.ts';
import {
  deploymentPolicy,
  previewHeaders,
  requireSuccessfulChecks,
} from './deployment-policy.mjs';

test('preview indexing headers preserve the single global security block', () => {
  const headers =
    '/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n' +
    "  Content-Security-Policy: connect-src 'self'\n\n" +
    '/_next/static/*\n  Cache-Control: public, max-age=31536000, immutable\n';
  for (const input of [headers, headers.replaceAll('\n', '\r\n')]) {
    const result = previewHeaders(input);
    assert.equal(result.match(/^\/\*$/gm)?.length, 1);
    assert.ok(result.startsWith('/*\n  X-Robots-Tag: noindex, nofollow\n'));
    assert.ok(result.includes('X-Content-Type-Options: nosniff'));
    assert.ok(result.includes('X-Frame-Options: DENY'));
    assert.ok(result.includes("Content-Security-Policy: connect-src 'self'"));
    assert.ok(result.includes('max-age=31536000, immutable'));
    assert.equal(previewHeaders(result), result);
  }
  assert.throws(() => previewHeaders('/_next/static/*\n'), /global static/);
});

/** Simulate public HTTP responses, including the conditional cache boundary. */
function publicSite(target, broken = '') {
  return async (url, options) => {
    const { pathname, origin } = new URL(url);
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': broken === 'security' ? 'SAMEORIGIN' : 'DENY',
      'Content-Security-Policy': "connect-src 'self'",
      'X-Robots-Tag': target === 'preview' ? 'noindex' : 'index',
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    };
    if (pathname === '/deployment.json') {
      return Response.json({
        environment: target,
        canonicalOrigin: target === 'production' ? origin : null,
        revision: broken === 'revision' ? 'b'.repeat(40) : 'a'.repeat(40),
      });
    }

    if (pathname === '/_next/static/chunks/fixture.js') {
      if (options.headers?.['If-None-Match']) {
        return new Response(null, { status: 304 });
      }

      return new Response('/* fixture */', {
        headers: {
          ETag: '"fixture"',
          'Cache-Control':
            broken === 'cache'
              ? 'no-store'
              : 'public, max-age=31536000, immutable',
        },
      });
    }

    if (pathname === '/robots.txt') {
      return new Response(
        target === 'production'
          ? `Sitemap: ${origin}/sitemap.xml`
          : 'Disallow: /',
      );
    }

    if (pathname === '/sitemap.xml') {
      return new Response(
        target === 'production'
          ? `<loc>${origin}/download/</loc>`
          : '<urlset/>',
      );
    }

    if (['/downloads', '/download.html', '/download'].includes(pathname)) {
      return new Response(null, {
        status: 301,
        headers: { Location: broken === 'redirect' ? '/wrong/' : '/download/' },
      });
    }

    if (pathname === '/releases.html') {
      return new Response(null, {
        status: 301,
        headers: { Location: '/releases/' },
      });
    }

    if (!publicRoutes.includes(pathname)) {
      return new Response('Wrong orbit.', { status: 404 });
    }

    const metadata =
      target === 'production'
        ? `<link rel="canonical" href="${origin}${pathname}"><meta name="robots" content="index">`
        : '<meta name="robots" content="noindex">';

    return new Response(
      `${metadata}<script src="/_next/static/chunks/fixture.js"></script>`,
      { headers },
    );
  };
}

test('live verifier exercises both indexing modes and conditional caching', async () => {
  for (const target of ['preview', 'production']) {
    await verifyDeployment(
      'https://site.example',
      target,
      'a'.repeat(40),
      publicSite(target),
    );
  }
});

test('live verifier rejects broken security, cache, redirects and revisions', async () => {
  for (const broken of ['security', 'cache', 'redirect', 'revision']) {
    await assert.rejects(() =>
      verifyDeployment(
        'https://site.example',
        'production',
        'a'.repeat(40),
        publicSite('production', broken),
      ),
    );
  }
});

const input = {
  event: 'workflow_dispatch',
  ref: 'refs/heads/main',
  repository: 'Thavarshan/comet',
  sha: 'a'.repeat(40),
  target: 'preview',
  operation: 'deploy',
  previewUrl: 'https://comet-site-preview.fixture.workers.dev',
  productionUrl: 'https://comet-site.fixture.workers.dev',
};

test('only deliberate trusted-main deployment inputs are accepted', () => {
  assert.equal(deploymentPolicy(input).canonicalOrigin, '');
  assert.equal(
    deploymentPolicy({ ...input, target: 'production' }).canonicalOrigin,
    input.productionUrl,
  );
  for (const change of [
    { event: 'pull_request' },
    { ref: 'refs/heads/feature' },
    { repository: 'fork/comet' },
    { target: 'other' },
    { previewUrl: '' },
    { previewUrl: 'https://comet.example' },
    { previewUrl: input.productionUrl },
    { previewUrl: 'http://localhost' },
    { sha: 'main' },
  ]) {
    assert.throws(() => deploymentPolicy({ ...input, ...change }));
  }
});

test('rollback requires a specific version and never a shell fragment', () => {
  assert.throws(() =>
    deploymentPolicy({ ...input, operation: 'rollback', version: 'latest' }),
  );
  assert.throws(() =>
    deploymentPolicy({ ...input, operation: 'rollback', version: '--help' }),
  );
  assert.equal(
    deploymentPolicy({
      ...input,
      operation: 'rollback',
      version: '12345678-abcd-abcd-abcd-123456789abc',
    }).version,
    '12345678-abcd-abcd-abcd-123456789abc',
  );
});

test('a green workflow cannot hide a failed independent CodeQL check', () => {
  const checks = [
    { name: 'required', status: 'completed', conclusion: 'success' },
    {
      name: 'verify / security / codeql',
      status: 'completed',
      conclusion: 'success',
    },
    { name: 'CodeQL', status: 'completed', conclusion: 'success' },
  ];
  assert.doesNotThrow(() => requireSuccessfulChecks(checks));
  assert.doesNotThrow(() => requireSuccessfulChecks(checks.slice(0, 2)));
  assert.throws(() => requireSuccessfulChecks(checks.slice(0, 1)), /codeql/);
  assert.throws(
    () =>
      requireSuccessfulChecks([
        checks[0],
        checks[1],
        { ...checks[2], conclusion: 'failure' },
      ]),
    /CodeQL/,
  );
  assert.throws(
    () =>
      requireSuccessfulChecks([
        ...checks,
        { name: 'other', conclusion: 'failure' },
      ]),
    /unsuccessful/,
  );
});
