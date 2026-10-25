import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { analyzeWithGroq } from '../lib/groq';
import type { AnalysisInput } from '../lib/contracts';

const input: AnalysisInput = {
  source: { path: 'src/a.ts', text: 'export const a = 1;' },
  test: { path: 'tests/a.test.ts', text: 'test' },
  log: 'failure',
  expectedBehavior: '',
};
const modelResult = {
  status: 'needs_context',
  summary: 'Need the intended behavior.',
  evidence: [],
  edits: [],
  regressionTest: null,
  questions: ['What should a be?'],
  assumptions: [],
};
function response(
  text: string | null = JSON.stringify(modelResult),
  finish = 'stop',
  choices = true,
) {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: 0,
      model: 'openai/gpt-oss-20b',
      choices: choices
        ? [
            {
              index: 0,
              finish_reason: finish,
              message: { role: 'assistant', content: text },
              logprobs: null,
            },
          ]
        : [],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'provider-test',
      },
    },
  );
}
beforeEach(() => {
  vi.stubEnv('GROQ_API_KEY', 'test-only-key');
  vi.stubEnv('GROQ_MODEL', 'openai/gpt-oss-20b');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('uses the native SDK request, strict schema and low reasoning with no unsupported Responses fields', async () => {
  const fetch = vi.fn().mockResolvedValue(response());
  vi.stubGlobal('fetch', fetch);
  const value = await analyzeWithGroq(input, AbortSignal.timeout(5000));
  expect(value.result).toEqual(modelResult);
  expect(value.tokens).toBe(3);
  expect(value.providerRequestId).toBe('provider-test');
  const [url, options] = fetch.mock.calls[0];
  expect(url.toString()).toBe(
    'https://api.groq.com/openai/v1/chat/completions',
  );
  const body = JSON.parse(options.body);
  expect(body.model).toBe('openai/gpt-oss-20b');
  expect(body.max_completion_tokens).toBe(6000);
  expect(body.reasoning_effort).toBe('low');
  expect(body.response_format.type).toBe('json_schema');
  expect(body.response_format.json_schema.strict).toBe(true);
  expect(body.response_format.json_schema.schema.additionalProperties).toBe(
    false,
  );
  expect(JSON.parse(body.messages[1].content)).toEqual({
    ...input,
    lineLimits: { source: 1, test: 1, log: 1 },
  });
  expect(body).not.toHaveProperty('store');
  expect(body).not.toHaveProperty('input');
  expect(body).not.toHaveProperty('tools');
});
it('uses the default model when the override is absent', async () => {
  vi.stubEnv('GROQ_MODEL', '');
  const fetch = vi.fn().mockResolvedValue(response());
  vi.stubGlobal('fetch', fetch);
  await analyzeWithGroq(input, AbortSignal.timeout(5000));
  expect(JSON.parse(fetch.mock.calls[0][1].body).model).toBe(
    'openai/gpt-oss-20b',
  );
});
it.each(['length', 'tool_calls', 'function_call'])(
  'rejects incomplete or non-text completion reason %s even when JSON parses',
  async (reason) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(JSON.stringify(modelResult), reason)),
    );
    await expect(
      analyzeWithGroq(input, AbortSignal.timeout(5000)),
    ).rejects.toMatchObject({ code: 'INCOMPLETE_OUTPUT' });
  },
);
it.each([null, '', 'not-json', 'x'.repeat(49 * 1024)])(
  'rejects missing, malformed or oversized content',
  async (text) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(text)));
    await expect(
      analyzeWithGroq(input, AbortSignal.timeout(5000)),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  },
);
it('rejects a response with no choice', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(response('{}', 'stop', false)),
  );
  await expect(
    analyzeWithGroq(input, AbortSignal.timeout(5000)),
  ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
});
it('retries an explicit 503 only once', async () => {
  const fetch = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ error: { message: 'busy' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetch);
  await expect(
    analyzeWithGroq(input, AbortSignal.timeout(5000)),
  ).rejects.toMatchObject({ code: 'PROVIDER_BUSY' });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it.each([
  [401, 'API_ACCESS'],
  [403, 'API_ACCESS'],
  [429, 'PROVIDER_BUSY'],
  [400, 'PROVIDER_CONFIGURATION'],
  [404, 'PROVIDER_CONFIGURATION'],
  [422, 'PROVIDER_CONFIGURATION'],
] as const)(
  'does not retry HTTP %s or expose upstream details',
  async (status, code) => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ error: { message: 'private-upstream-detail' } }),
            { status, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      );
    vi.stubGlobal('fetch', fetch);
    try {
      await analyzeWithGroq(input, AbortSignal.timeout(5000));
      throw Error('Expected failure');
    } catch (error) {
      expect(error).toMatchObject({ code });
      expect((error as Error).message).not.toContain('private-upstream-detail');
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);
it('honors cancellation without retrying', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(analyzeWithGroq(input, controller.signal)).rejects.toMatchObject(
    { code: 'TIMEOUT', httpStatus: 504 },
  );
});

it('classifies provider-side JSON generation rejection as invalid output without retrying', async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        error: {
          code: 'json_validate_failed',
          message: 'private generation detail',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    ),
  );
  vi.stubGlobal('fetch', fetch);
  await expect(
    analyzeWithGroq(input, AbortSignal.timeout(5000)),
  ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('computes provider evidence bounds from CRLF input including the trailing empty line', async () => {
  const fetch = vi.fn().mockResolvedValue(response());
  vi.stubGlobal('fetch', fetch);
  await analyzeWithGroq(
    { ...input, source: { ...input.source, text: 'line one\r\nline two\r\n' } },
    AbortSignal.timeout(5000),
  );
  expect(
    JSON.parse(JSON.parse(fetch.mock.calls[0][1].body).messages[1].content)
      .lineLimits.source,
  ).toBe(3);
});
