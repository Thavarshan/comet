import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { PublisherGithub } from '@electron-forge/publisher-github';
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/node_modules/ffmpeg-static/**',
    },
    icon: process.platform === 'win32' ? 'src/assets/images/icon/icon.ico' : 'src/assets/images/icon/icon.icns',
    executableName: 'comet',
    extraResource: process.platform === 'win32'
      ? path.resolve(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
      : path.resolve(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg'),
    // Bypassing signing and notarization for now
    // ...(process.platform === 'darwin' && {
    //   osxSign: {},
    //   osxNotarize: {
    //     appleId: process.env.APPLE_ID,
    //     appleIdPassword: process.env.APPLE_ID_PASSWORD,
    //     teamId: process.env.TEAM_ID,
    //   },
    // }),
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      certificateFile: './cert.pfx',
      certificatePassword: process.env.CERTIFICATE_PASSWORD
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({
      options: {
        icon: 'src/assets/images/icon/icon.png',
      }
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
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
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'thavarshan',
        name: 'comet',
      },
      prerelease: true,
    })
  ]
};

export default config;
