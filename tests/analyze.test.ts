import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../app/api/analyze/route';
import { analyzeWithGroq } from '../lib/groq';
import { AnalysisError } from '../lib/http';
import type { AnalysisInput } from '../lib/contracts';

vi.mock('../lib/groq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/groq')>();
  return { ...actual, analyzeWithGroq: vi.fn() };
});
const input: AnalysisInput = {
  source: {
    path: 'src/value.ts',
    text: 'export const value = (n?: number) => n || 10;\n',
  },
  test: { path: 'tests/value.test.ts', text: 'test code' },
  log: 'expected 0',
  expectedBehavior: 'Keep zero.',
};
const result = {
  status: 'proposed_fix',
  summary: 'Zero is valid.',
  evidence: [
    {
      input: 'source',
      startLine: 1,
      endLine: 1,
      explanation: 'OR discards zero.',
    },
  ],
  edits: [{ original: 'n || 10', replacement: 'n ?? 10' }],
  regressionTest:
    "import { it, expect } from 'vitest';\nimport { value } from '../src/value';\nit('zero', () => expect(value(0)).toBe(0));",
  questions: [],
  assumptions: [],
};
const request = (body: unknown = input, headers: Record<string, string> = {}) =>
  new Request('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.stubEnv('GROQ_API_KEY', 'test-only-not-a-real-key');
  vi.stubEnv('ANALYSIS_ENABLED', 'true');
  vi.stubEnv('ANALYSIS_SESSION_LIMIT', '1000');
  vi.mocked(analyzeWithGroq).mockReset().mockResolvedValue({
    result,
    model: 'test-model',
    providerRequestId: 'test-request',
    tokens: 123,
  });
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('analysis boundary', () => {
  it('returns validated changes and no-store headers', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body.artifacts.fixedSource).toContain('n ?? 10');
    expect(body.requestId).toBeTruthy();
    expect(body).not.toHaveProperty('tokens');
  });
  it('retains concrete missing-context questions', async () => {
    vi.mocked(analyzeWithGroq).mockResolvedValueOnce({
      result: {
        ...result,
        status: 'needs_context',
        edits: [],
        regressionTest: null,
        questions: ['What should undefined return?'],
      },
      model: 'test-model',
      providerRequestId: 'test-request',
      tokens: 0,
    });
    const body = await (await POST(request())).json();
    expect(body.analysis.status).toBe('needs_context');
    expect(body.artifacts).toBeNull();
  });
  it('rejects invalid input without calling the provider', async () => {
    expect(
      (
        await POST(
          request({
            ...input,
            source: { ...input.source, path: '../secret.ts' },
          }),
        )
      ).status,
    ).toBe(400);
    expect(analyzeWithGroq).not.toHaveBeenCalled();
  });
  it('enforces actual body bytes before JSON parsing, even without content length', async () => {
    const req = new Request('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: ' '.repeat(65537),
    });
    expect((await POST(req)).status).toBe(413);
    expect(analyzeWithGroq).not.toHaveBeenCalled();
  });
  it('rejects malformed JSON and wrong content type', async () => {
    expect(
      (
        await POST(
          new Request('http://localhost:3000/api/analyze', {
            method: 'POST',
            body: '{',
            headers: { 'content-type': 'application/json' },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await POST(request(input, { 'content-type': 'text/plain' }))).status,
    ).toBe(415);
  });
  it('rejects cross-origin browser requests', async () => {
    expect(
      (await POST(request(input, { origin: 'https://another.example' })))
        .status,
    ).toBe(403);
    expect(analyzeWithGroq).not.toHaveBeenCalled();
  });
  it('reports missing access without returning a fabricated fix', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('API_NOT_CONFIGURED');
    expect(analyzeWithGroq).not.toHaveBeenCalled();
  });
  it('supports the operator kill switch', async () => {
    vi.stubEnv('ANALYSIS_ENABLED', 'false');
    expect((await (await POST(request())).json()).code).toBe(
      'ANALYSIS_DISABLED',
    );
    expect(analyzeWithGroq).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { ...result, edits: [{ original: 'missing', replacement: 'x' }] },
    {
      ...result,
      evidence: [{ ...result.evidence[0], startLine: 999, endLine: 999 }],
    },
  ])('rejects unusable model output', async (badResult) => {
    vi.mocked(analyzeWithGroq).mockResolvedValueOnce({
      result: badResult,
      model: 'test-model',
      providerRequestId: 'test-request',
      tokens: 0,
    });
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe('INVALID_PATCH');
  });
  it.each([
    ['TIMEOUT', 504],
    ['PROVIDER_BUSY', 503],
    ['INCOMPLETE_OUTPUT', 502],
  ] as const)('preserves safe error %s', async (code, status) => {
    vi.mocked(analyzeWithGroq).mockRejectedValueOnce(
      new AnalysisError(code, 'Safe explanation.', status),
    );
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect((await response.json()).code).toBe(code);
  });
  it('never exposes raw provider errors or user text in logs', async () => {
    vi.mocked(analyzeWithGroq).mockRejectedValueOnce(
      new Error('private-provider-detail'),
    );
    const response = await POST(request());
    expect(await response.text()).not.toContain('private-provider-detail');
    const logged = JSON.stringify(vi.mocked(console.info).mock.calls);
    expect(logged).not.toContain(input.source.text);
    expect(logged).not.toContain('private-provider-detail');
  });
});
