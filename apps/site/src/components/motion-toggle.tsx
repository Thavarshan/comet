'use client';

import { useState, type ReactElement } from 'react';

/**
 * Give visitors a manual pause button for the site's decorative animations.
 *
 * Browser preferences are still respected automatically in CSS through
 * prefers-reduced-motion. This control is an additional choice for people
 * who want to stop movement while reading.
 *
 * No preferences are uploaded, tracked, or persisted: this value lives only
 * in the current page session. The HTML attribute is consumed by our CSS.
 */
export function MotionToggle(): ReactElement {
  const [paused, setPaused] = useState<boolean>(false);

  /**
   * Update the button and the document together.
   *
   * This handler runs only when clicked; accessing document here is safe in
   * an otherwise statically rendered Next.js application.
   */
  function toggleMotion(): void {
    const nextPaused: boolean = !paused;

    document.documentElement.dataset.motionPaused = String(nextPaused);
    setPaused(nextPaused);
  }

  return (
    <button
      aria-label={paused ? 'Resume decorative motion' : 'Pause decorative motion'}
      aria-pressed={paused}
      className="motion-toggle"
      onClick={toggleMotion}
      type="button"
    >
      <span className="motion-toggle__symbol" aria-hidden="true">
        {paused ? '▶' : 'Ⅱ'}
      </span>
      <span>{paused ? 'Resume motion' : 'Pause motion'}</span>
    </button>
  );
}
