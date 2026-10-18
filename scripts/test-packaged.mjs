import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { packagePaths, root } from './package-paths.mjs';
import { artifactManifest } from './artifact-manifest.mjs';

const { target, directory, relativeExecutable } = packagePaths();
const isolated = await mkdtemp(path.join(tmpdir(), 'comet-packaged-'));
try {
  const application = path.join(isolated, 'application');
  await cp(directory, application, {
    recursive: true,
    verbatimSymlinks: true,
    mode: constants.COPYFILE_FICLONE,
  });
  const executable = path.join(application, relativeExecutable);
  const environment = { ...process.env, COMET_EXECUTABLE: executable };
  delete environment.ELECTRON_RUN_AS_NODE;
  const status = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [process.env.npm_execpath, 'run', 'test:e2e'],
      {
        cwd: root,
        env: environment,
        stdio: 'inherit',
      },
    );
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  if (status !== 0) {
    throw new Error('Isolated packaged smoke tests failed');
  }

  const output = path.join(root, 'apps/desktop/out/verification');
  await mkdir(output, { recursive: true });
  const { version } = JSON.parse(
    await readFile(path.join(root, 'apps/desktop/package.json'), 'utf8'),
  );
  await writeFile(
    path.join(output, `${target}.json`),
    JSON.stringify(
      {
        target,
        version,
        commit: process.env.GITHUB_SHA ?? 'local-working-tree',
        testedAt: new Date().toISOString(),
        result: 'passed',
        signed:
          process.platform !== 'linux' &&
          process.env.COMET_EXPECT_SIGNED === 'true',
        artifacts: await artifactManifest(
          path.join(root, 'apps/desktop/out/make'),
        ),
      },
      null,
      2,
    ),
  );
} finally {
  await rm(isolated, { recursive: true, force: true });
}
