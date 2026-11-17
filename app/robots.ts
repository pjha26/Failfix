import type { MetadataRoute } from 'next';
import { publicOrigin } from '@/lib/site-metadata';

export default function robots(): MetadataRoute.Robots {
  const origin = publicOrigin();
  return origin
    ? { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: origin + '/sitemap.xml' }
    : { rules: { userAgent: '*', disallow: '/' } };
}
