import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPackage } from '@electron/asar';
import { readBundledModule } from '../lib/packaged-code.mjs';

test('reads nested bundled modules from a real ASAR using host path rules', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'honeymelon-asar-'));
  try {
    const source = path.join(directory, 'source');
    const build = path.join(source, '.vite', 'build');
    await mkdir(build, { recursive: true });
    const code = 'module.exports = "bundled module";';
    for (const name of ['main', 'preload', 'image-worker']) {
      await writeFile(path.join(build, `${name}.cjs`), code);
    }

    const archive = path.join(directory, 'app.asar');
    await createPackage(source, archive);
    for (const name of ['main', 'preload', 'image-worker']) {
      assert.equal(readBundledModule(archive, name), code);
    }

    assert.throws(() => readBundledModule(archive, 'missing'), /not found/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
