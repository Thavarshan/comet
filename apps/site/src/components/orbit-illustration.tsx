import type { ReactElement } from 'react';

/**
 * Draw the site's signature visual without a canvas, third-party library,
 * remote image, or any conversion functionality.
 *
 * Think of each ring as a track around a planet. CSS rotates the rings and
 * moves the file labels at different speeds. All motion is decorative; the
 * surrounding page provides the real feature descriptions.
 *
 * An accessible text alternative describes the meaning of the illustration,
 * while aria-hidden keeps the many decorative pieces out of screen readers.
 */
export function OrbitIllustration(): ReactElement {
  return (
    <div
      className="orbit-visual"
      role="img"
      aria-label={
        'Illustration of a local media file changing format. ' +
        'This is artwork, not a working web converter.'
      }
    >
      <div className="orbit-stage" aria-hidden="true">
        <div className="orbit-grid" />
        <div className="orbit-ring orbit-ring--outer" />
        <div className="orbit-ring orbit-ring--middle" />
        <div className="orbit-ring orbit-ring--inner" />

        <div className="orbit-satellite orbit-satellite--one" />
        <div className="orbit-satellite orbit-satellite--two" />
        <div className="orbit-satellite orbit-satellite--three" />

        <div className="orbit-core">
          <div className="orbit-core__glow" />
          <span className="orbit-core__mark">C</span>
          <span className="orbit-core__caption">COMET ENGINE</span>
        </div>

        <div className="orbit-file orbit-file--source">
          <span className="orbit-file__label">01 / SOURCE</span>
          <strong>clip.mov</strong>
          <small>ON YOUR DEVICE</small>
        </div>
        <div className="orbit-file orbit-file--output">
          <span className="orbit-file__label">02 / OUTPUT</span>
          <strong>clip.mp4</strong>
          <small>STILL YOURS</small>
        </div>

        <div className="orbit-status">
          <span className="orbit-status__dot" />
          ZERO UPLOADS
        </div>
        <div className="orbit-crosshair orbit-crosshair--top" />
        <div className="orbit-crosshair orbit-crosshair--bottom" />
      </div>
      <p className="orbit-caption" aria-hidden="true">
        FIG 01 <span>—</span> YOUR MEDIA STAYS IN YOUR ORBIT
      </p>
    </div>
  );
}
