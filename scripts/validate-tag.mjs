import { readFile, appendFile } from 'node:fs/promises';
import {
  releaseRequiresSigning,
  validateReleaseTag,
} from './lib/release-policy.mjs';

const { version } = JSON.parse(
  await readFile('apps/desktop/package.json', 'utf8'),
);
validateReleaseTag(version, process.env.GITHUB_REF_NAME);

if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `signing=${releaseRequiresSigning(version)}\n`,
  );
}
