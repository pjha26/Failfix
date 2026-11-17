import type { MetadataRoute } from 'next';
import { publicOrigin, publicPaths } from '@/lib/site-metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicOrigin();
  return origin ? publicPaths.map((path) => ({ url: new URL(path, origin).href })) : [];
}
