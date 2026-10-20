import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { requestAppRestart } from '@electron-forge/core-utils/restart';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseVersion, FuseV1Options } from '@electron/fuses';
import path from 'node:path';
import { existsSync, readFileSync, watch, type FSWatcher } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(directory, '../../assets');
const packageMetadata = JSON.parse(
  readFileSync(path.join(directory, 'package.json'), 'utf8'),
) as {
  version: string;
};
const target =
  process.env.HONEYMELON_TARGET ?? `${process.platform}-${process.arch}`;
const binaryDirectory = path.join(directory, '.cache/bin', target);
let buildWatcher: FSWatcher | undefined;
const signingIdentity = process.env.APPLE_IDENTITY;
const config: ForgeConfig = {
  packagerConfig: {
    name: 'Honeymelon',
    executableName: 'Honeymelon',
    appBundleId: 'com.thavarshan.honeymelon',
    appCategoryType: 'public.app-category.video',
    icon: path.join(assets, 'icons/icon'),
    asar: true,
    ...(process.env.WINDOWS_CERTIFICATE_FILE
      ? {
          windowsSign: {
            certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
            ...(process.env.WINDOWS_CERTIFICATE_PASSWORD
              ? {
                  certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
                }
              : {}),
          },
        }
      : {}),
    extraResource: [
      path.join(directory, '.cache/packaging', target, 'bin'),
      path.join(assets, 'icons/icon.png'),
    ],
    ...(signingIdentity
      ? {
          osxSign: { identity: signingIdentity },
          osxNotarize: {
            appleId: process.env.APPLE_ID!,
            appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD!,
            teamId: process.env.APPLE_TEAM_ID!,
          },
        }
      : {}),
  },
  rebuildConfig: {},
  hooks: {
    postStart: async (_config, child) => {
      // Forge 8's Vite watch builds run in subprocesses. Observe completed
      // output
      // here in the parent process, which owns Forge's restart handler.
      buildWatcher?.close();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const watcher = watch(
        path.join(directory, '.vite/build'),
        (_event, filename) => {
          if (
            !filename ||
            !['main.cjs', 'image-worker.cjs'].includes(filename.toString())
          ) {
            return;
          }

          clearTimeout(timer);
          timer = setTimeout(() => requestAppRestart(), 150);
        },
      );
      buildWatcher = watcher;
      child.once('exit', () => {
        clearTimeout(timer);
        watcher.close();
      });
    },
    generateAssets: async (_config, platform, arch) => {
      if (`${platform}-${arch}` !== target) {
        throw new Error(
          'HONEYMELON_TARGET must match the Forge platform/architecture',
        );
      }

      execFileSync(
        process.execPath,
        [path.resolve(directory, '../../scripts/stage-binaries.mjs')],
        {
          stdio: 'inherit',
        },
      );
      if (!existsSync(binaryDirectory)) {
        throw new Error('Verified binary resources are required');
      }
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'Honeymelon',
        exe: 'Honeymelon.exe',
        setupIcon: path.join(assets, 'icons/setup-icon.ico'),
        setupExe: `honeymelon-${packageMetadata.version}-${target}-setup.exe`,
        noMsi: true,
        ...(process.env.WINDOWS_CERTIFICATE_FILE
          ? {
              certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
              ...(process.env.WINDOWS_CERTIFICATE_PASSWORD
                ? {
                    certificatePassword:
                      process.env.WINDOWS_CERTIFICATE_PASSWORD,
                  }
                : {}),
            }
          : {}),
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
      config: {},
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          name: 'honeymelon',
          productName: 'Honeymelon',
          bin: 'Honeymelon',
          icon: path.join(assets, 'icons/icon.png'),
          categories: ['AudioVideo', 'Utility'],
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {
        options: {
          name: 'honeymelon',
          productName: 'Honeymelon',
          bin: 'Honeymelon',
          icon: path.join(assets, 'icons/icon.png'),
          categories: ['AudioVideo', 'Utility'],
        },
      },
    },
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
        {
          entry: '../../packages/engine/src/image-worker.ts',
          config: 'vite.worker.config.ts',
          target: 'main',
        },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
      hotRestart: false,
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
