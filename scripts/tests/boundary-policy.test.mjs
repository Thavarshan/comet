import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  boundaryOwner,
  boundaryViolation,
  sourceImports,
} from '../lib/boundary-policy.mjs';

test('syntax inspection catches side effects and every module import form', () => {
  const source = `
    // import 'node:not-an-import';
    const text = "require('node:also-not-an-import')";
    import 'node:fs';
    export * from '@honeymelon/engine';
    export { readFile } from 'fs/promises';
    const worker = import('node:worker_threads');
    const fs = require('fs');
    import child = require('child_process');
    type Engine = import('@honeymelon/engine').Engine;
    const dynamic = import(prefix + filename);
  `;
  assert.deepEqual(
    sourceImports('sample.ts', source).map((entry) => entry.specifier),
    [
      'node:fs',
      '@honeymelon/engine',
      'fs/promises',
      'node:worker_threads',
      'fs',
      'child_process',
      '@honeymelon/engine',
      null,
    ],
  );
});

test('browser boundaries reject native modules and unsafe workspace edges', () => {
  for (const owner of [
    'contracts',
    'core',
    'converter',
    'browser-engine',
    'web',
    'site',
    'renderer',
    'ui',
  ]) {
    for (const name of [
      'fs',
      'fs/promises',
      'node:fs',
      'electron',
      'electron/main',
      '@honeymelon/engine',
      '@honeymelon/e2e',
      'ffmpeg-static',
      null,
    ]) {
      assert.ok(boundaryViolation(owner, name), `${owner}: ${name}`);
    }
  }

  assert.ok(boundaryViolation('core', 'react'));
  assert.ok(boundaryViolation('engine', 'electron'));
  assert.ok(boundaryViolation('unknown-package', 'zod'));
  assert.equal(boundaryViolation('engine', 'node:fs'), null);
  assert.equal(boundaryViolation('engine', '@honeymelon/core'), null);
  assert.equal(boundaryViolation('converter', '@honeymelon/core'), null);
  assert.equal(boundaryViolation('web', '@honeymelon/browser-engine'), null);
  assert.equal(boundaryViolation('ui', 'react'), null);
  assert.equal(boundaryViolation('ui', '@honeymelon/ui/lib/utils'), null);
});

test('resolved aliases and relative paths cannot cross native boundaries', () => {
  const target = path.resolve('packages/engine/src/index.ts');
  assert.equal(boundaryOwner(target), 'engine');
  assert.equal(
    boundaryOwner(path.resolve('node_modules/react/index.js')),
    undefined,
  );
  assert.ok(boundaryViolation('web', '@native', target));
  assert.ok(
    boundaryViolation('web', '../../../packages/engine/src/index', target),
  );
  assert.ok(
    boundaryViolation(
      'web',
      '../../../scripts/native',
      path.resolve('scripts/native.mjs'),
    ),
  );
  assert.equal(
    boundaryViolation(
      'ui',
      './button.js',
      path.resolve('packages/ui/src/components/button.tsx'),
    ),
    null,
  );
});

test('real checker discovers new workspaces and reports file and line', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'honeymelon-boundary-'));
  try {
    await mkdir(path.join(directory, 'apps/web/src'), { recursive: true });
    await mkdir(path.join(directory, 'packages/engine/src'), {
      recursive: true,
    });
    await writeFile(
      path.join(directory, 'apps/web/src/main.ts'),
      "import 'node:fs';\n",
    );
    const result = spawnSync(
      process.execPath,
      [path.resolve('scripts/check-boundaries.mjs')],
      {
        cwd: directory,
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /apps[/\\]web[/\\]src[/\\]main.ts:1/);
    assert.match(result.stderr, /Node builtin in browser-safe code: node:fs/);

    await writeFile(
      path.join(directory, 'packages/engine/src/index.ts'),
      'export const native = true;',
    );
    await writeFile(
      path.join(directory, 'apps/web/tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@native': ['../../packages/engine/src/index.ts'] },
        },
      }),
    );
    await writeFile(
      path.join(directory, 'apps/web/src/main.ts'),
      "export * from '@native';\n",
    );
    const alias = spawnSync(
      process.execPath,
      [path.resolve('scripts/check-boundaries.mjs')],
      { cwd: directory, encoding: 'utf8' },
    );
    assert.equal(alias.status, 1);
    assert.match(alias.stderr, /web cannot depend on engine: @native/);

    await writeFile(path.join(directory, 'apps/web/src/main.ts'), 'export {};');
    await writeFile(
      path.join(directory, 'apps/web/package.json'),
      JSON.stringify({ dependencies: { '@honeymelon/engine': '*' } }),
    );
    const manifest = spawnSync(
      process.execPath,
      [path.resolve('scripts/check-boundaries.mjs')],
      { cwd: directory, encoding: 'utf8' },
    );
    assert.equal(manifest.status, 1);
    assert.match(manifest.stderr, /package.json: web cannot depend on engine/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
