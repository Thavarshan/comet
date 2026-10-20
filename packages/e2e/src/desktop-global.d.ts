import type { DesktopBridge } from '@honeymelon/contracts';

declare global {
  interface Window {
    honeymelon: DesktopBridge<File>;
  }
}
