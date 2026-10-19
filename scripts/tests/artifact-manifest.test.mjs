import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { artifactManifest } from '../lib/artifact-manifest.mjs';

test('artifact receipts detect changed bytes and refuse symbolic links', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'comet-artifacts-'));
  try {
    await mkdir(path.join(directory, 'portable'));
    const file = path.join(directory, 'portable/comet.zip');
    await writeFile(file, 'verified build');
    const original = await artifactManifest(directory);
    assert.match(original['portable/comet.zip'], /^[a-f0-9]{64}$/);
    await writeFile(file, 'replaced build');
    assert.notDeepEqual(await artifactManifest(directory), original);
    // Junctions exercise this rule without Windows symlink elevation.
    await symlink(directory, path.join(directory, 'alias'), 'junction');
    await assert.rejects(artifactManifest(directory), /regular files/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
