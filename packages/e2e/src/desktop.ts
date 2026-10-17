import { chromium, type Browser, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { desktopDirectory } from './paths.js';

/** An isolated Electron process with an attached Playwright page. */
export interface DesktopSession {
  browser: Browser;
  page: Page;
  child: ChildProcess;
  close(): Promise<void>;
}

/** Launch desktop with a temporary profile and await renderer readiness. */
export async function launchDesktop(
  profile: string,
  workingDirectory: string,
): Promise<DesktopSession> {
  const appDirectory = desktopDirectory;
  const executable =
    process.env.COMET_EXECUTABLE ??
    (createRequire(path.join(desktopDirectory, 'package.json'))(
      'electron',
    ) as string);
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    COMET_TEST_USER_DATA: profile,
  };
  delete environment.ELECTRON_RUN_AS_NODE;
  const child = spawn(
    executable,
    [
      ...(process.env.COMET_EXECUTABLE ? [] : [appDirectory]),
      '--remote-debugging-port=0',
    ],
    {
      cwd: workingDirectory,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let logs = '';
  const endpoint = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `Electron did not start: ${logs
            .split('\n')
            .map((line) => line.slice(0, 500))
            .join('\n')}`,
        ),
      );
    }, 20000);
    const onData = (data: Buffer) => {
      logs = (logs + data.toString()).slice(-16000);
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(logs);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]!);
      }
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `Electron exited ${code}: ${logs
            .split('\n')
            .map((line) => line.slice(0, 500))
            .join('\n')}`,
        ),
      );
    });
  });
  const browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0]!;
  const page = context.pages()[0] ?? (await context.waitForEvent('page'));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      logs += '\nRenderer: ' + message.text();
    }
  });
  page.on('pageerror', (error) => {
    logs += '\nPage error: ' + error.message;
  });
  page.on('requestfailed', (request) => {
    logs +=
      '\nRequest failed: ' + request.url() + ' ' + request.failure()?.errorText;
  });
  try {
    await page.getByRole('tablist').waitFor({ timeout: 10000 });
  } catch (error) {
    console.error(
      logs
        .split('\n')
        .map((line) => line.slice(0, 500))
        .join('\n'),
    );
    console.error(
      await page
        .locator('body')
        .innerText({ timeout: 1000 })
        .catch(() => 'No renderer document'),
    );
    await browser.close();
    child.kill('SIGTERM');
    throw error;
  }

  return {
    browser,
    page,
    child,
    close: async () => {
      const running = child.exitCode === null && child.signalCode === null;
      const exited = running
        ? new Promise<void>((resolve) => child.once('exit', () => resolve()))
        : Promise.resolve();

      // Closing the window lets Chromium flush its profile. On Windows,
      // child.kill('SIGTERM') forcibly terminates Electron before that happens.
      await page.close({ runBeforeUnload: true });
      await browser.close();
      if (running) {
        // macOS keeps the application alive after its last window closes.
        if (process.platform !== 'win32') {
          child.kill('SIGTERM');
        }

        const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
        await exited;
        clearTimeout(timer);
      }
    },
  };
}
