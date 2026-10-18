import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validateReleaseTarget,
  releaseRequiresSigning,
} from './release-policy.mjs';

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

test('only the approved beta accepts verified unsigned desktop artifacts', () => {
  for (const target of ['darwin-x64', 'win32-arm64']) {
    const outputs = target.startsWith('win32')
      ? ['setup.exe', 'portable.zip']
      : ['desktop.zip'];
    for (const version of ['3.0.0', '3.0.0-beta.2', '3.0.0-beta.1-extra']) {
      assert.equal(releaseRequiresSigning(version), true);
      const required = { ...expected, target, version };
      assert.throws(() =>
        validateReleaseTarget(
          { ...required, result: 'passed', signed: false },
          outputs,
          required,
        ),
      );
    }

    const beta = { ...expected, target, version: '3.0.0-beta.1' };
    const verified = { ...beta, result: 'passed', signed: false };
    assert.equal(releaseRequiresSigning(beta.version), false);
    assert.doesNotThrow(() => validateReleaseTarget(verified, outputs, beta));
    assert.throws(() =>
      validateReleaseTarget({ ...verified, result: 'failed' }, outputs, beta),
    );
    assert.throws(() => validateReleaseTarget(verified, [], beta));
    assert.throws(() =>
      validateReleaseTarget({ ...verified, commit: 'stale' }, outputs, beta),
    );
  }
});
