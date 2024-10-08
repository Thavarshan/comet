import { Media } from '@/types/media';
import { ColorMode } from '@/types/theme';
import { VideoFormat } from '@/enum/video-format';
import { AudioFormat } from '@/enum/audio-format';
import { ImageFormat } from '@/enum/image-format';

export {}; // Make this a module

declare global {
  // This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Vite
  // plugin that tells the Electron app where to look for the Vite-bundled app code (depending on
  // whether you're running in development or production).
  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
  const MAIN_WINDOW_VITE_NAME: string;

  namespace NodeJS {
    interface Process {
      // Used for hot reload after preload scripts.
      viteDevServers: Record<string, import('vite').ViteDevServer>;
    }
  }

  type VitePluginConfig = ConstructorParameters<typeof import('@electron-forge/plugin-vite').VitePlugin>[0];

  interface VitePluginRuntimeKeys {
    VITE_DEV_SERVER_URL: `${string}_VITE_DEV_SERVER_URL`;
    VITE_NAME: `${string}_VITE_NAME`;
  }

  interface Window {
    electron: {
      arch: string;
      platform: NodeJS.Platform;
      selectDirectory: () => Promise<string | undefined>;
      getSystemTheme: () => ColorMode;
      getDesktopPath: () => Promise<string>;
      getFilePath: (file: File) => string;
      cancelConversion: () => Promise<unknown>;
      cancelItemConversion: (id: number | string) => Promise<unknown>;
      convertMedia: (
        id: string,
        filePath: string,
        outputFormat: VideoFormat | AudioFormat | ImageFormat,
        saveDirectory: string,
        mediaType: Media,
      ) => Promise<string>;
      send: (channel: string, ...args: unknown[]) => void;
      on: (channel: string, callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }

  let __DEV__: boolean;
}

declare module 'vite' {
  interface ConfigEnv<K extends keyof VitePluginConfig = keyof VitePluginConfig> {
    root: string;
    forgeConfig: VitePluginConfig;
    forgeConfigSelf: VitePluginConfig[K][number];
  }
}

declare module 'ffmpeg-probe' {
  interface FFProbeResult {
    streams: Array<{
      codec_name: string;
      codec_type: string;
      width?: number;
      height?: number;
      [key: string]: unknown;
    }>;
    format: {
      filename: string;
      nb_streams: number;
      nb_programs: number;
      format_name: string;
      format_long_name: string;
      start_time: string;
      duration: string;
      size: string;
      bit_rate: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  function ffprobe(filePath: string): Promise<FFProbeResult>;

  export = ffprobe;
}
