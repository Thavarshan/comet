import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateReleaseTarget } from './release-policy.mjs';

const expected = { target: 'linux-x64', version: '3.0.0', commit: 'abc123' };
const receipt = { ...expected, result: 'passed', signed: true };
const files = ['comet.deb', 'comet.rpm', 'comet.tar.gz'];

test('release requires complete native verification and all Linux formats', () => {
  assert.doesNotThrow(() => validateReleaseTarget(receipt, files, expected));
  for (const field of ['target', 'version', 'commit', 'result']) {
    assert.throws(() =>
      validateReleaseTarget(
        { ...receipt, [field]: 'invalid' },
        files,
        expected,
      ),
    );
  }

  for (const missing of files) {
    assert.throws(() =>
      validateReleaseTarget(
        receipt,
        files.filter((file) => file !== missing),
        expected,
      ),
    );
  }
});

test('Windows requires both installer and portable ZIP', () => {
  const windows = { ...expected, target: 'win32-arm64' };
  assert.throws(() =>
    validateReleaseTarget(
      { ...receipt, ...windows, signed: false },
      ['setup.exe', 'portable.zip'],
      windows,
    ),
  );
  assert.throws(() =>
    validateReleaseTarget({ ...receipt, ...windows }, ['setup.exe'], windows),
  );
  assert.doesNotThrow(() =>
    validateReleaseTarget(
      { ...receipt, ...windows },
      ['setup.exe', 'portable.zip'],
      windows,
    ),
  );
});
