import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (name) => readFile(new URL(name, root), 'utf8');

test('all workspace identities and dependencies use Honeymelon', async () => {
  const manifest = JSON.parse(await read('package.json'));
  assert.equal(manifest.name, 'honeymelon-monorepo');
  for (const parent of ['apps', 'packages']) {
    for (const entry of await readdir(new URL(`${parent}/`, root))) {
      const source = await read(`${parent}/${entry}/package.json`);
      const workspace = JSON.parse(source);
      assert.match(workspace.name, /^@honeymelon\//);
      assert.doesNotMatch(source, /@comet\//i);
    }
  }
});

test('desktop, bridge and web metadata share the active identity', async () => {
  for (const filename of [
    'apps/desktop/forge.config.ts',
    'apps/desktop/src/main/index.ts',
    'apps/desktop/src/preload/index.ts',
    'packages/contracts/src/index.ts',
    'apps/site/app/layout.tsx',
  ]) {
    const source = await read(filename);
    assert.match(source, /honeymelon/i, filename);
    assert.doesNotMatch(source, /comet/i, filename);
  }

  assert.match(
    await read('apps/desktop/forge.config.ts'),
    /com\.thavarshan\.honeymelon/,
  );
});

test('shared theme retains official shadcn Neutral defaults', async () => {
  const tokens = await read('packages/ui/src/styles/tokens.css');
  assert.match(tokens, /--radius: 0\.625rem/);
  assert.match(tokens, /--primary: oklch\(0\.205 0 0\)/);
  assert.match(tokens, /--background: oklch\(0\.145 0 0\)/);
  const preset = JSON.parse(await read('packages/ui/src/preset.json'));
  assert.doesNotMatch(JSON.stringify(preset), /b1a0RuGWI|blue|amber/);
});
