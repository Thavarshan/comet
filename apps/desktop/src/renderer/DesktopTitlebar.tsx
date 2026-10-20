import type { ReactElement } from 'react';

/**
 * Center the app name independently of the platform's native window controls.
 * Electron owns dragging and window actions through the CSS drag region.
 */
export function DesktopTitlebar(): ReactElement {
  return (
    <header className="desktop-titlebar">
      <h1 className="desktop-titlebar-name">Honeymelon</h1>
    </header>
  );
}
