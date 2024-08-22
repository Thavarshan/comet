import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { PublisherGithub } from '@electron-forge/publisher-github';
import packageJson from './package.json';
import path from 'node:path';

const { version } = packageJson;
const iconDir = path.resolve(__dirname, 'src', 'assets', 'images', 'icons');

const commonLinuxConfig = {
  categories: ['Video', 'Utility'],
  mimeType: ['x-scheme-handler/comet'],
};

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Comet',
    executableName: 'comet',
    icon: 'src/assets/images/icons/icon',
    appBundleId: 'com.thavarshan.comet',
    appCategoryType: 'public.app-category.video',
    asar: {
      unpack: "**/node_modules/ffmpeg-static/**"
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: (arch: string) => ({
        name: 'Comet',
        authors: 'Jerome Thayananthajothy',
        exe: 'Comet.exe',
        noMsi: true,
        setupExe: `comet-${version}-win32-${arch}-setup.exe`,
        setupIcon: path.resolve(iconDir, 'setup-icon.ico'),
      }),
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {
        name: 'Comet'
      },
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: commonLinuxConfig,
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: commonLinuxConfig,
    }
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be
      // Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration,
      // it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry`
          // in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ]
};

export default config;
