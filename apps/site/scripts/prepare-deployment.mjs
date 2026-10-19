import { readFile, writeFile } from 'node:fs/promises';
import { getSiteOrigin } from '../src/lib/metadata.ts';

const target = process.argv[2];
const revision = process.argv[3];
if (
  !['preview', 'production'].includes(target) ||
  !/^[a-f0-9]{40}$/.test(revision ?? '')
) {
  throw new Error('Prepare deployment with a target and exact source revision');
}

const origin = getSiteOrigin();
if ((target === 'production') !== Boolean(origin)) {
  throw new Error('Only production builds may configure a canonical origin');
}

const output = new URL('../out/', import.meta.url);
const headersFile = new URL('_headers', output);
const headers = await readFile(headersFile, 'utf8');
if (target === 'preview') {
  await writeFile(
    headersFile,
    headers + '\n/*\n  X-Robots-Tag: noindex, nofollow\n',
  );
}

await writeFile(
  new URL('deployment.json', output),
  JSON.stringify(
    { environment: target, revision, canonicalOrigin: origin?.origin ?? null },
    null,
    2,
  ) + '\n',
);
console.log(`Prepared static ${target} deployment for ${revision}`);
