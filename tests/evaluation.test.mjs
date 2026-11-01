import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  optionsFrom,
  runEvaluation,
  inspectResponse,
  loadCases,
} from '../scripts/evaluate-ai.mjs';
import { buildArtifacts } from '../lib/patch.ts';
import { examples } from '../lib/examples.ts';

const directories = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    directories.splice(0).map((directory) => {
      if (!directory.startsWith(join(tmpdir(), 'failfix-evaluation-')))
        throw new Error('Unexpected temporary directory');
      return rm(directory, { recursive: true, force: true });
    }),
  );
});
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-FailFix-Model': 'test-model',
      'X-FailFix-Prompt-Sha256': 'a'.repeat(64),
      'X-FailFix-Tokens': '42',
    },
  });
async function output() {
  const directory = await mkdtemp(join(tmpdir(), 'failfix-evaluation-'));
  directories.push(directory);
  return directory;
}
const proposal = (input) => ({
  ...buildArtifacts(input, examples[0].analysis),
  requestId: 'evaluation-test',
  durationMs: 12,
});

it('previews all six fixtures without any requests or result files', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const root = await output();
  const report = await runEvaluation(optionsFrom([]), root);
  expect(report.mode).toBe('preview');
  expect(report.cases).toHaveLength(6);
  expect(
    report.cases.find((c) => c.id === 'needs-context').expectedStatus,
  ).toBe('needs_context');
  expect(fetch).not.toHaveBeenCalled();
  expect(await readdir(root)).toEqual([]);
});

it.each([
  'https://external.example',
  'http://127.0.0.1@external.example',
  'http://localhost/path',
  'http://localhost?key=hidden',
  'http://localhost#part',
])('rejects unsafe target %s', (value) => {
  expect(() => optionsFrom(['--base-url', value])).toThrow();
});
it('rejects unknown fixtures, excessive repeats and unknown options', () => {
  for (const args of [
    ['--case', '../secrets'],
    ['--repeat', '4'],
    ['--repeat', '0'],
    ['--unknown'],
  ])
    expect(() => optionsFrom(args)).toThrow();
});

it('records proposals and independent patch applicability without executing generated code', async () => {
  const fixture = (await loadCases(['zero']))[0];
  const fetch = vi.fn(async (url, request) => {
    if (url.endsWith('/api/health')) return json({ service: 'failfix' });
    expect(request.redirect).toBe('error');
    expect(request.headers.Authorization).toBeUndefined();
    expect(JSON.parse(request.body)).toEqual(fixture.input);
    return json(proposal(fixture.input));
  });
  vi.stubGlobal('fetch', fetch);
  const result = await runEvaluation(
    optionsFrom(['--live', '--case', 'zero', '--repeat', '2']),
    await output(),
  );
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(result.attempts).toHaveLength(2);
  expect(result.attempts[0]).toMatchObject({
    outcome: 'accepted',
    expectedStatusMatched: true,
    patchApplicability: 'passed',
    humanReview: 'pending',
    functionalVerification: 'not_run',
    model: 'test-model',
    tokens: 42,
  });
  const files = await readdir(join(result.directory, 'zero-1'));
  expect(files.sort()).toEqual([
    'fixed-source.txt',
    'input.json',
    'proposal.json',
    'proposed.patch',
    'regression-test.txt',
    'review.md',
  ]);
  expect(
    JSON.parse(await readFile(join(result.directory, 'report.json'), 'utf8'))
      .attempts,
  ).toHaveLength(2);
});

it('stops after quota/configuration rejection, records skipped attempts and never prints upstream text', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      url.endsWith('/api/health')
        ? json({ service: 'failfix' })
        : json(
            { code: 'PROVIDER_BUSY', error: 'private upstream detail' },
            503,
          ),
    ),
  );
  const result = await runEvaluation(optionsFrom(['--live']), await output());
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(result.attempts[0]).toMatchObject({
    outcome: 'rejected',
    errorCode: 'PROVIDER_BUSY',
  });
  expect(result.attempts.slice(1).every((r) => r.outcome === 'skipped')).toBe(
    true,
  );
  expect(JSON.stringify(result)).not.toContain('private upstream detail');
});

it('rejects changed or path-swapped artifacts and oversized responses', async () => {
  const fixture = (await loadCases(['zero']))[0];
  const data = proposal(fixture.input);
  expect(() =>
    inspectResponse(fixture.input, {
      ...data,
      artifacts: { ...data.artifacts, fixedSource: 'different' },
    }),
  ).toThrow();
  expect(() =>
    inspectResponse(fixture.input, {
      ...data,
      artifacts: { ...data.artifacts, regressionPath: '../outside.ts' },
    }),
  ).toThrow();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      url.endsWith('/api/health')
        ? json({ service: 'failfix' })
        : new Response('x'.repeat(256 * 1024 + 1)),
    ),
  );
  const result = await runEvaluation(
    optionsFrom(['--live', '--case', 'zero']),
    await output(),
  );
  expect(result.attempts[0]).toMatchObject({
    outcome: 'error',
    errorCode: 'INVALID_RESPONSE',
  });
});

it('records a valid but unexpected answer separately from functional correctness', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      url.endsWith('/api/health')
        ? json({ service: 'failfix' })
        : json({
            analysis: {
              status: 'needs_context',
              summary: 'Need more context',
              questions: ['What should zero do?'],
              edits: [],
              regressionTest: null,
            },
            artifacts: null,
          }),
    ),
  );
  const result = await runEvaluation(
    optionsFrom(['--live', '--case', 'zero']),
    await output(),
  );
  expect(result.attempts[0]).toMatchObject({
    outcome: 'accepted',
    expectedStatusMatched: false,
    patchApplicability: 'not_applicable',
    functionalVerification: 'not_run',
  });
});

it('refuses to submit fixtures to a service that does not identify itself as FailFix', async () => {
  const fetch = vi.fn(async () => json({ service: 'other-service' }));
  vi.stubGlobal('fetch', fetch);
  const root = await output();
  await expect(runEvaluation(optionsFrom(['--live']), root)).rejects.toThrow(
    'Start the FailFix server',
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(await readdir(root)).toEqual([]);
});
