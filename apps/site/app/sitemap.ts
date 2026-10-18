import type { MetadataRoute } from 'next';
import { getSiteOrigin, publicRoutes } from '../src/lib/metadata';

export const dynamic = 'force-static';

/** Include only real pages at the configured deployment's canonical origin. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();

  return origin
    ? publicRoutes.map((route) => ({ url: new URL(route, origin).href }))
    : [];
}
