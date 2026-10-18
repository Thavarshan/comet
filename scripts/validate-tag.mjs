import { readFile, appendFile } from 'node:fs/promises';
import { releaseRequiresSigning } from './release-policy.mjs';

const { version } = JSON.parse(
  await readFile('apps/desktop/package.json', 'utf8'),
);
if (process.env.GITHUB_REF_NAME !== `v${version}`) {
  throw new Error('Release tag must match the desktop version');
}

if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `signing=${releaseRequiresSigning(version)}\n`,
  );
}
