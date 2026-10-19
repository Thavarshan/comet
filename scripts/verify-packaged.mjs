import { readBundledModule } from './lib/packaged-code.mjs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { packagePaths } from './lib/package-paths.mjs';

const { resources, target, executable } = packagePaths();
const allowed = new Set([
  'electron',
  'electron/main',
  'electron/renderer',
  'electron/common',
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);
for (const name of ['main', 'preload', 'image-worker']) {
  const code = readBundledModule(path.join(resources, 'app.asar'), name);
  for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
    if (!allowed.has(match[1])) {
      throw new Error(`Unbundled ${name} dependency: ${match[1]}`);
    }
  }
}

const bin = path.join(resources, 'bin');
const hashes = JSON.parse(
  await readFile(path.join(bin, 'staged-sha256.json'), 'utf8'),
);
const signed = process.env.COMET_EXPECT_SIGNED === 'true';

function verifySignature(filename) {
  if (process.platform === 'darwin') {
    if (!process.env.COMET_EXPECTED_TEAM_ID) {
      throw new Error('Expected Apple signing team is required');
    }

    execFileSync('codesign', ['--verify', '--strict', filename], {
      stdio: 'pipe',
    });
    const description = spawnSync(
      'codesign',
      ['-dv', '--verbose=4', filename],
      {
        encoding: 'utf8',
      },
    );
    if (
      description.status !== 0 ||
      !description.stderr
        .split('\n')
        .includes(`TeamIdentifier=${process.env.COMET_EXPECTED_TEAM_ID}`)
    ) {
      throw new Error('Unexpected Apple signing team');
    }
  } else if (process.platform === 'win32') {
    if (!process.env.COMET_EXPECTED_SIGNER_THUMBPRINT) {
      throw new Error('Expected Windows signing certificate is required');
    }

    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '$signature = Get-AuthenticodeSignature -LiteralPath $env:COMET_VERIFY_PATH; if ($signature.Status -ne "Valid" -or $signature.SignerCertificate.Thumbprint -ne $env:COMET_EXPECTED_SIGNER_THUMBPRINT) { exit 1 }',
      ],
      { env: { ...process.env, COMET_VERIFY_PATH: filename }, stdio: 'pipe' },
    );
  }
}

if (signed && process.platform !== 'linux') {
  verifySignature(executable);
  if (process.platform === 'darwin') {
    execFileSync(
      'codesign',
      ['--verify', '--deep', '--strict', path.resolve(resources, '../..')],
      {
        stdio: 'pipe',
      },
    );
  }
}

const suffix = process.platform === 'win32' ? '.exe' : '';
for (const tool of ['ffmpeg', 'ffprobe']) {
  const filename = tool + suffix;
  const expected = hashes[filename];
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) {
    throw new Error(`Missing source digest: ${filename}`);
  }

  const binary = path.join(bin, filename);
  const actual = createHash('sha256')
    .update(await readFile(binary))
    .digest('hex');
  if (actual !== expected) {
    // Authenticode/codesign legitimately change executable bytes. Source bytes
    // were
    // checked before signing; require the expected cryptographic signer
    // afterwards.
    if (!signed || process.platform === 'linux') {
      throw new Error(`Packaged checksum mismatch: ${filename}`);
    }

    verifySignature(binary);
  }

  const configuration = execFileSync(binary, ['-buildconf'], {
    encoding: 'utf8',
  });
  if (configuration.includes('--enable-nonfree')) {
    throw new Error('Non-redistributable native tool cannot be packaged');
  }

  const version = execFileSync(binary, ['-version'], {
    encoding: 'utf8',
    timeout: 15000,
  }).split('\n')[0];
  console.log(`${target}: ${version}`);
}

console.log('Packaged imports and native resources verified');
