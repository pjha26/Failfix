import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyPatch } from 'diff';
import { inspectDeployment } from '../lib/deployment-analysis';
import { importPublicRepository, parseRepository } from '../lib/github-public';
import { POST as review } from '../app/api/deployments/analyze/route';
import { POST as importRepo } from '../app/api/github/import/route';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const packageText =
  JSON.stringify(
    {
      name: 'storefront',
      scripts: { dev: 'next dev' },
      dependencies: { next: '16.0.0' },
    },
    null,
    2,
  ) + '\n';
const context = {
  log: '> npm run build\nnpm error Missing script: "build"\nProcess exited with code 1',
  files: [{ path: 'package.json', text: packageText }],
};
const sha = 'a'.repeat(40);
const run = {
  id: 42,
  name: 'Deploy',
  head_sha: sha,
  head_branch: 'main',
  path: '.github/workflows/deploy.yml',
  created_at: '2026-10-24T01:00:00Z',
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const req = (
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Request('http://localhost' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

describe('deployment signature review', () => {
  it('builds an applicable missing-script patch without making model or network calls', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const result = inspectDeployment(context);
    expect(result.findings[0].evidence).toEqual([
      { line: 2, text: 'npm error Missing script: "build"' },
    ]);
    expect(result.patch).not.toBeNull();
    expect(applyPatch(packageText, result.patch!.diff)).toBe(
      result.patch!.after,
    );
    expect(JSON.parse(result.patch!.after).scripts).toEqual({
      dev: 'next dev',
      build: 'next build',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('preserves existing scripts and declines unsupported, ambiguous, or invalid package context', () => {
    for (const text of [
      JSON.stringify({
        scripts: { build: 'custom' },
        dependencies: { next: '16' },
      }),
      JSON.stringify({ dependencies: { vite: '7' } }),
      JSON.stringify({ dependencies: { next: '16' }, workspaces: ['apps/*'] }),
      'invalid JSON',
      'null',
      '[]',
    ]) {
      const result = inspectDeployment({
        ...context,
        files: [{ path: 'package.json', text }],
      });
      expect(result.patch).toBeNull();
      expect(result.findings[0].id).toBe('missing-build');
    }
  });
  it('preserves CRLF and produces a readable patch for a package with no scripts', () => {
    const text = '{\r\n\t"dependencies": { "next": "16" }\r\n}\r\n';
    const result = inspectDeployment({
      ...context,
      files: [{ path: 'package.json', text }],
    });
    expect(result.patch!.after).toContain('\r\n\t"scripts"');
    expect(applyPatch(text, result.patch!.diff)).toBe(result.patch!.after);
  });
  it.each([
    [
      'lockfile',
      'npm ci can only install packages when package.json and package-lock.json are in sync',
    ],
    [
      'node-version',
      'You are using Node.js 18. Node.js version >=20 is required.',
    ],
    ['environment', 'Environment variable not found: DATABASE_URL'],
    ['module-resolution', "Module not found: Can't resolve './Header'"],
    ['typecheck', 'Type error: Type string is not assignable to number'],
    [
      'memory',
      'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
    ],
  ])('matches the %s signature without fabricating a patch', (id, log) => {
    const result = inspectDeployment({ log, files: [] });
    expect(result.findings.some((finding) => finding.id === id)).toBe(true);
    expect(result.patch).toBeNull();
  });
  it('asks for context when all that is known is a failed status or unknown error', () => {
    const result = inspectDeployment({
      log: 'Job build failed at step Deploy. Exit code 1.',
      files: [],
    });
    expect(result).toMatchObject({
      status: 'needs_context',
      findings: [],
      patch: null,
    });
  });
});

describe('audit regressions: deployment evidence and script matching', () => {
  it('keeps evidence aligned with leading blank and indented log lines', () => {
    const log = '\n\n  npm error Missing script: "build"\n';
    const report = inspectDeployment({ log, files: [] });
    expect(report.findings[0].evidence).toEqual([
      { line: 3, text: '  npm error Missing script: "build"' },
    ]);
  });
  it('bounds the original log bytes and still rejects whitespace-only input', () => {
    expect(() =>
      inspectDeployment({ log: ' '.repeat(32 * 1024) + 'failure', files: [] }),
    ).toThrow();
    expect(() => inspectDeployment({ log: '\n  \n', files: [] })).toThrow();
  });
  it.each(['build:prod', 'build-test', 'build_test', 'build2'])(
    'does not propose a build patch for a missing %s script',
    (script) => {
      const report = inspectDeployment({
        ...context,
        log: 'npm error Missing script: "' + script + '"',
      });
      expect(report.patch).toBeNull();
      expect(
        report.findings.some((finding) => finding.id === 'missing-build'),
      ).toBe(false);
    },
  );
});

describe('public GitHub import', () => {
  it.each([
    'pjha26/Failfix',
    'https://github.com/pjha26/Failfix',
    'https://github.com/pjha26/Failfix.git/',
  ])('accepts a repository locator: %s', (locator) => {
    expect(parseRepository(locator).fullName).toBe('pjha26/Failfix');
  });
  it.each([
    'https://github.com.evil.example/a/b',
    'http://127.0.0.1/a/b',
    'https://user:secret@github.com/a/b',
    'https://github.com/a/b?redirect=x',
    'a/../secret',
    'a/..',
    'https://github.com/a/b/tree/main',
    'https://github.com/a/b#token',
  ])('rejects unsafe locators: %s', (locator) => {
    expect(() => parseRepository(locator)).toThrow();
  });
  it('pins configs to the failed run commit, reads bounded allowed files, and exposes failed steps without calling them logs', async () => {
    const requests: string[] = [];
    const fetch = vi.fn(async (url: string, options: RequestInit) => {
      requests.push(url);
      expect(url.startsWith('https://api.github.com/repos/owner/repo')).toBe(
        true,
      );
      expect(options.redirect).toBe('error');
      expect(
        (options.headers as Record<string, string>).Authorization,
      ).toBeUndefined();
      if (url.endsWith('/owner/repo'))
        return json({
          full_name: 'owner/repo',
          private: false,
          default_branch: 'main',
        });
      if (url.includes('/actions/runs?')) return json({ workflow_runs: [run] });
      if (url.includes('/contents/package.json?'))
        return json({
          type: 'file',
          size: packageText.length,
          encoding: 'base64',
          content: Buffer.from(packageText).toString('base64'),
        });
      if (url.includes('/contents/.github/workflows/'))
        return json({
          type: 'file',
          size: 11,
          encoding: 'base64',
          content: Buffer.from('name: Build').toString('base64'),
        });
      if (url.includes('/jobs?'))
        return json({
          jobs: [
            {
              name: 'Build',
              steps: [
                { name: 'Install', conclusion: 'success' },
                { name: 'Build app', conclusion: 'failure' },
              ],
            },
          ],
        });
      return json({ message: 'Not Found' }, 404);
    });
    vi.stubGlobal('fetch', fetch);
    const result = await importPublicRepository('owner/repo');
    expect(result.sha).toBe(sha);
    expect(result.files.map((file) => file.path)).toEqual([
      'package.json',
      '.github/workflows/deploy.yml',
    ]);
    expect(result.failedSteps).toEqual(['Build → Build app']);
    expect(result.warnings.join(' ')).toContain('not the build log');
    expect(
      requests
        .filter((url) => url.includes('/contents/'))
        .every((url) => url.endsWith(`ref=${sha}`)),
    ).toBe(true);
    expect(
      requests.some(
        (url) => url.includes('/logs') || url.includes('/commits/'),
      ),
    ).toBe(false);
  });
  it.each([
    ['invalid UTF-8', Buffer.from([0xc3, 0x28])],
    ['binary content', Buffer.from([0x00, 0x32])],
  ])(
    'retains valid configuration when another file has %s',
    async (_label, bytes) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          if (url.endsWith('/owner/repo'))
            return json({
              full_name: 'owner/repo',
              private: false,
              default_branch: 'main',
            });
          if (url.includes('/actions/runs?'))
            return json({ workflow_runs: [] });
          if (url.endsWith('/commits/main')) return json({ sha });
          if (url.includes('/contents/package.json'))
            return json({
              type: 'file',
              size: packageText.length,
              encoding: 'base64',
              content: Buffer.from(packageText).toString('base64'),
            });
          if (url.includes('/contents/.nvmrc'))
            return json({
              type: 'file',
              size: bytes.length,
              encoding: 'base64',
              content: bytes.toString('base64'),
            });
          return json({}, 404);
        }),
      );
      const snapshot = await importPublicRepository('owner/repo');
      expect(snapshot.files).toEqual([
        { path: 'package.json', text: packageText },
      ]);
      expect(snapshot.warnings.join(' ')).toContain('Skipped .nvmrc');
    },
  );
  it('uses the default branch commit when no failed run exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/owner/repo'))
          return json({
            full_name: 'owner/repo',
            private: false,
            default_branch: 'main',
          });
        if (url.includes('/actions/runs?')) return json({ workflow_runs: [] });
        if (url.endsWith('/commits/main')) return json({ sha });
        return json({}, 404);
      }),
    );
    const result = await importPublicRepository('owner/repo');
    expect(result).toMatchObject({
      sha,
      files: [],
      selectedRunId: null,
      runs: [],
    });
  });
  it('rejects private repositories and returns safe public API rate-limit errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          full_name: 'owner/repo',
          private: true,
          default_branch: 'main',
        }),
      ),
    );
    await expect(importPublicRepository('owner/repo')).rejects.toMatchObject({
      code: 'PRIVATE_REPOSITORY',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({ message: 'arbitrary provider text with secrets' }, 403),
      ),
    );
    await expect(importPublicRepository('owner/repo')).rejects.toMatchObject({
      code: 'GITHUB_LIMIT',
      httpStatus: 429,
    });
  });
  it('skips large files and unsupported workflow paths', async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith('/owner/repo'))
        return json({
          full_name: 'owner/repo',
          private: false,
          default_branch: 'main',
        });
      if (url.includes('/actions/runs?'))
        return json({ workflow_runs: [{ ...run, path: '../../secret' }] });
      if (url.includes('/contents/package.json'))
        return json({
          type: 'file',
          size: 17 * 1024,
          encoding: 'base64',
          content: 'abc',
        });
      if (url.includes('/jobs?')) return json({ jobs: [] });
      return json({}, 404);
    });
    vi.stubGlobal('fetch', fetch);
    const result = await importPublicRepository('owner/repo');
    expect(result.files).toEqual([]);
    expect(result.warnings.join(' ')).toContain('Skipped package.json');
    expect(fetch.mock.calls.some(([url]) => url.includes('secret'))).toBe(
      false,
    );
  });
});

describe('deployment route boundaries', () => {
  it('reviews a real JSON request without provider access', async () => {
    const response = await review(req('/api/deployments/analyze', context));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect((await response.json()).report.patch.path).toBe('package.json');
  });
  it('rejects oversized logs, unsafe paths, duplicate configs and cross-origin submissions', async () => {
    for (const body of [
      { ...context, log: 'x'.repeat(33 * 1024) },
      { ...context, files: [{ path: '../package.json', text: '{}' }] },
      { ...context, files: [...context.files, ...context.files] },
    ]) {
      expect((await review(req('/api/deployments/analyze', body))).status).toBe(
        400,
      );
    }
    expect(
      (
        await review(
          req('/api/deployments/analyze', context, {
            origin: 'https://other.example',
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await importRepo(
          req(
            '/api/github/import',
            { repository: 'owner/repo' },
            { origin: 'https://other.example' },
          ),
        )
      ).status,
    ).toBe(403);
  });
  it('rejects invalid import requests before any outbound call', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(
      (
        await importRepo(
          req('/api/github/import', { repository: 'https://127.0.0.1/admin' }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await importRepo(
          req('/api/github/import', { repository: 'owner/repo', runId: -1 }),
        )
      ).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
