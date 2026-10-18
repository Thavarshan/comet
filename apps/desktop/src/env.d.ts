import type { DesktopBridge } from '@comet/contracts';

declare global {
  interface Window {
    comet: DesktopBridge<File>;
  }
}

export {};
