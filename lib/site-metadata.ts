import type { Metadata } from 'next';

export const publicPaths = ['/', '/deployments', '/workspace'] as const;
type PublicPath = (typeof publicPaths)[number];

export function publicOrigin(value = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL) {
  if (!value || !URL.canParse(value)) return undefined;
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username || url.password || url.pathname !== '/' || url.search || url.hash
  ) return undefined;
  return url.origin;
}

export function pageMetadata(path: PublicPath, title: string, description: string): Metadata {
  const origin = publicOrigin();
  const url = origin && new URL(path, origin);
  const images = origin ? [{
    url: new URL('/failfix-share.png', origin).href,
    width: 1200,
    height: 630,
    alt: 'FailFix build and test debugger. Trace a failure from log to patch.',
  }] : undefined;

  return {
    title,
    description,
    alternates: url ? { canonical: url } : undefined,
    robots: origin ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: 'website', siteName: 'FailFix', title, description, url, images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}
