import {
  readdir,
  readFile,
  copyFile,
  mkdir,
  writeFile,
  rm,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { targets, validateReleaseTarget } from './release-policy.mjs';
import { artifactManifest } from './artifact-manifest.mjs';

const { version } = JSON.parse(
  await readFile('apps/desktop/package.json', 'utf8'),
);
if (process.env.GITHUB_REF_NAME !== `v${version}`) {
  throw new Error('Release tag must match the desktop version');
}

await rm('release-assets', { recursive: true, force: true });
await mkdir('release-assets', { recursive: true });
const sums = [];
const names = new Set();

async function walk(directory) {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map((entry) =>
        entry.isDirectory()
          ? walk(path.join(directory, entry.name))
          : path.join(directory, entry.name),
      ),
    )
  ).flat();
}

for (const target of targets) {
  const files = await walk(path.join('artifacts', `comet-${target}`));
  const receiptFile = files.find((file) =>
    file.endsWith(`/verification/${target}.json`),
  );
  if (!receiptFile) {
    throw new Error(`Missing verification receipt: ${target}`);
  }

  const receipt = JSON.parse(await readFile(receiptFile, 'utf8'));
  const distributables = files.filter((file) =>
    /\.(exe|deb|rpm|zip|tar\.gz)$/.test(file),
  );
  validateReleaseTarget(receipt, distributables, {
    target,
    version,
    commit: process.env.GITHUB_SHA,
  });

  const actual = await artifactManifest(
    path.join('artifacts', `comet-${target}`, 'make'),
  );
  if (
    JSON.stringify(Object.entries(actual).sort()) !==
    JSON.stringify(Object.entries(receipt.artifacts ?? {}).sort())
  ) {
    throw new Error(`Release artifact digest mismatch: ${target}`);
  }

  for (const file of distributables) {
    const name = `comet-${version}-${target}-${path.basename(file)}`;
    if (names.has(name)) {
      throw new Error(`Duplicate release artifact name: ${name}`);
    }

    names.add(name);
    await copyFile(file, path.join('release-assets', name));
    sums.push(
      `${createHash('sha256')
        .update(await readFile(file))
        .digest('hex')}  ${name}`,
    );
  }
}

await writeFile('release-assets/SHA256SUMS', sums.join('\n') + '\n');
