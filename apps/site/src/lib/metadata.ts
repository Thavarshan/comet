import type { Metadata } from 'next';

/** Every indexable route is listed once for metadata and sitemap coverage. */
export const publicRoutes = [
  '/',
  '/download/',
  '/features/',
  '/docs/',
  '/privacy/',
  '/releases/',
  '/license/',
] as const;

/** A route must correspond to an exported page, never a planned product. */
export type PublicRoute = (typeof publicRoutes)[number];

/**
 * Only an explicitly configured HTTPS origin may become a canonical URL.
 * Preview builds stay unindexed. A malformed deployment setting fails early
 * instead of silently publishing localhost or a guessed production address.
 */
export function getSiteOrigin(
  value: string | undefined = process.env.COMET_SITE_URL,
): URL | undefined {
  if (!value) {
    return undefined;
  }

  const url = new URL(value);

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('COMET_SITE_URL must be an HTTPS origin without a path.');
  }

  return url;
}

/**
 * Keep page titles, descriptions and social previews in agreement.
 * This runs at build time; visitors do not make API calls for metadata.
 */
export function pageMetadata(
  route: PublicRoute,
  title: string,
  description: string,
): Metadata {
  const origin = getSiteOrigin();
  const url = origin ? new URL(route, origin) : undefined;
  const images = origin
    ? [
        {
          url: new URL('/og-comet.png', origin).href,
          width: 1200,
          height: 630,
          alt: 'Comet — local video, audio and image conversion',
        },
      ]
    : [];

  return {
    title,
    description,
    robots: { index: Boolean(origin), follow: true },
    ...(origin ? { metadataBase: origin } : {}),
    ...(url ? { alternates: { canonical: url.href } } : {}),
    openGraph: {
      title,
      description,
      siteName: 'Comet',
      type: 'website',
      locale: 'en_US',
      ...(url ? { url: url.href } : {}),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((image) => image.url),
    },
  };
}
