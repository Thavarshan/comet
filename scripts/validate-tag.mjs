import { readFile } from 'node:fs/promises';

const { version } = JSON.parse(
  await readFile('apps/desktop/package.json', 'utf8'),
);
if (process.env.GITHUB_REF_NAME !== `v${version}`) {
  throw new Error('Release tag must match the desktop version');
}
