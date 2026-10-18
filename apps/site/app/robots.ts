import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '../src/lib/metadata';

export const dynamic = 'force-static';

/** Preview exports are deliberately excluded from search indexing. */
export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  return origin
    ? {
        rules: { userAgent: '*', allow: '/' },
        sitemap: new URL('/sitemap.xml', origin).href,
      }
    : { rules: { userAgent: '*', disallow: '/' } };
}
