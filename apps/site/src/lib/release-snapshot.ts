import type { ReleaseManifest } from '@honeymelon/contracts';
import snapshot from '../data/releases.json';
import { validateManifest } from './releases';

/** A broken or missing first snapshot must never create an unsafe CTA. */
export function releaseSnapshot(): ReleaseManifest {
  try {
    return validateManifest(snapshot);
  } catch {
    return {
      schemaVersion: 1,
      verifiedAt: new Date(0).toISOString(),
      refreshFailed: true,
      releases: [],
    };
  }
}
