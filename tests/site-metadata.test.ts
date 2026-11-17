import { afterEach, expect, it, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { pageMetadata, publicOrigin } from '@/lib/site-metadata';

afterEach(() => vi.unstubAllEnvs());

it('uses the public domain for sharing and canonicalizes case links to the test desk', () => {
  vi.stubEnv('APP_ORIGIN', 'https://failfix.example/');
  const page = pageMetadata('/workspace', 'Test desk', 'Debug failing tests');
  expect(String(page.alternates?.canonical)).toBe('https://failfix.example/workspace');
  expect(page.openGraph?.images).toEqual([expect.objectContaining({ url: 'https://failfix.example/failfix-share.png' })]);
  expect(sitemap().map(entry => entry.url)).toEqual([
    'https://failfix.example/', 'https://failfix.example/deployments', 'https://failfix.example/workspace',
  ]);
  expect(robots().sitemap).toBe('https://failfix.example/sitemap.xml');
});

it('keeps local builds out of the index and supports the Render public URL', () => {
  vi.stubEnv('APP_ORIGIN', '');
  vi.stubEnv('RENDER_EXTERNAL_URL', '');
  expect(sitemap()).toEqual([]);
  expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' });
  for (const value of ['localhost:3000', 'invalid', 'https://localhost', 'https://example.com/debug']) {
    expect(publicOrigin(value)).toBeUndefined();
  }
  vi.stubEnv('RENDER_EXTERNAL_URL', 'https://failfix.example');
  expect(publicOrigin()).toBe('https://failfix.example');
});
