import { spawn } from 'node:child_process';

const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const child = spawn(
  process.execPath,
  [process.env.npm_execpath, 'exec', '--', 'electron-forge', 'start'],
  {
    stdio: 'inherit',
    env: environment,
  },
);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
