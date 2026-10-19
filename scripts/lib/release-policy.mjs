import path from 'node:path';

/** All native targets must supply independently verified artifacts. */
export const targets = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64',
];

/** Reject a tag that does not describe the desktop version being shipped. */
export function validateReleaseTag(version, tag) {
  if (tag !== `v${version}`) {
    throw new Error('Release tag must match the desktop version');
  }
}

/** Only this explicitly approved beta may ship without release signatures. */
export function releaseRequiresSigning(version) {
  return version !== '3.0.0-beta.1';
}

/** Reject stale receipts, missing signatures, and incomplete outputs. */
export function validateReleaseTarget(receipt, files, expected) {
  for (const field of ['target', 'version', 'commit']) {
    if (receipt[field] !== expected[field]) {
      throw new Error(`Verification ${field} mismatch: ${expected.target}`);
    }
  }

  const needsSignature =
    releaseRequiresSigning(expected.version) &&
    !expected.target.startsWith('linux');
  if (
    receipt.result !== 'passed' ||
    (needsSignature && receipt.signed !== true)
  ) {
    throw new Error(`Release verification incomplete: ${expected.target}`);
  }

  const extensions = expected.target.startsWith('linux')
    ? ['.deb', '.rpm', '.tar.gz']
    : expected.target.startsWith('win32')
      ? ['.exe', '.zip']
      : ['.zip'];
  for (const extension of extensions) {
    if (!files.some((file) => file.endsWith(extension))) {
      throw new Error(`Missing ${extension} for ${expected.target}`);
    }
  }
}

/** Match GitHub's download-safe asset alphabet before generating checksums. */
export function releaseAssetName(version, target, filename) {
  const basename = path.basename(filename).replace(/[^A-Za-z0-9._-]/g, '.');

  return `comet-${version}-${target}-${basename}`;
}
