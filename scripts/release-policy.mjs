/** All native targets must supply independently verified artifacts. */
export const targets = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64',
];

/** Reject stale receipts, unsigned releases, and incomplete maker outputs. */
export function validateReleaseTarget(receipt, files, expected) {
  for (const field of ['target', 'version', 'commit']) {
    if (receipt[field] !== expected[field]) {
      throw new Error(`Verification ${field} mismatch: ${expected.target}`);
    }
  }

  const needsSignature = !expected.target.startsWith('linux');
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
