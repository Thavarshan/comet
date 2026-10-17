import { copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

// electron-winstaller 5.4.0's installer uses os.arch instead of os.arch().
// Keep that broken dependency script disabled and select the host 7-Zip
// explicitly.
if (process.platform === 'win32') {
  const require = createRequire(
    new URL('../apps/desktop/package.json', import.meta.url),
  );
  const vendor = path.join(
    path.dirname(require.resolve('electron-winstaller/package.json')),
    'vendor',
  );
  for (const extension of ['exe', 'dll']) {
    await copyFile(
      path.join(vendor, `7z-${process.arch}.${extension}`),
      path.join(vendor, `7z.${extension}`),
    );
  }
}
