import { writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const required =
  process.platform === 'darwin'
    ? [
        'APPLE_CERTIFICATE_BASE64',
        'APPLE_CERTIFICATE_PASSWORD',
        'APPLE_IDENTITY',
        'APPLE_ID',
        'APPLE_APP_SPECIFIC_PASSWORD',
        'APPLE_TEAM_ID',
      ]
    : process.platform === 'win32'
      ? ['WINDOWS_CERTIFICATE_BASE64', 'WINDOWS_CERTIFICATE_PASSWORD']
      : [];
for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Release signing requires ${name}`);
  }
}

if (process.platform === 'darwin') {
  const filename = path.join(process.env.RUNNER_TEMP, 'comet-signing.p12');
  const keychain = path.join(
    process.env.RUNNER_TEMP,
    'comet-build.keychain-db',
  );
  const password = randomUUID();
  const security = (args) => {
    try {
      execFileSync('security', args, { stdio: 'ignore' });
    } catch {
      throw new Error('Could not configure the signing keychain');
    }
  };

  await writeFile(
    filename,
    Buffer.from(process.env.APPLE_CERTIFICATE_BASE64, 'base64'),
    {
      mode: 0o600,
    },
  );
  try {
    security(['create-keychain', '-p', password, keychain]);
    security(['set-keychain-settings', '-lut', '21600', keychain]);
    security(['unlock-keychain', '-p', password, keychain]);
    security([
      'import',
      filename,
      '-k',
      keychain,
      '-P',
      process.env.APPLE_CERTIFICATE_PASSWORD,
      '-T',
      '/usr/bin/codesign',
    ]);
    security([
      'set-key-partition-list',
      '-S',
      'apple-tool:,apple:',
      '-s',
      '-k',
      password,
      keychain,
    ]);
    security(['list-keychains', '-d', 'user', '-s', keychain]);
  } finally {
    await rm(filename, { force: true });
  }
} else if (process.platform === 'win32') {
  const filename = path.join(process.env.RUNNER_TEMP, 'comet-signing.pfx');
  await writeFile(
    filename,
    Buffer.from(process.env.WINDOWS_CERTIFICATE_BASE64, 'base64'),
    {
      mode: 0o600,
    },
  );
  const thumbprint = execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '$password = ConvertTo-SecureString $env:WINDOWS_CERTIFICATE_PASSWORD -AsPlainText -Force; (Get-PfxData -FilePath $env:WINDOWS_CERTIFICATE_FILE -Password $password).EndEntityCertificates[0].Thumbprint',
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, WINDOWS_CERTIFICATE_FILE: filename },
    },
  ).trim();
  if (!/^[A-Fa-f0-9]{40}$/.test(thumbprint)) {
    throw new Error('Could not identify Windows signing certificate');
  }

  await writeFile(
    process.env.GITHUB_ENV,
    `WINDOWS_CERTIFICATE_FILE=${filename}\nCOMET_EXPECTED_SIGNER_THUMBPRINT=${thumbprint}\n`,
    { flag: 'a' },
  );
}
