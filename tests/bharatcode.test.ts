import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { analyzeWithBharatCode } from '../lib/bharatcode';
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
function response(text = JSON.stringify(modelResult), status = 'completed') {
  return new Response(
    JSON.stringify({
      id: 'resp_test',
      object: 'response',
      created_at: 0,
      status,
      model: 'test',
      output: [
        {
          type: 'message',
          id: 'msg_test',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text, annotations: [] }],
        },
      ],
      usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 },
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
  vi.stubEnv('BHARATCODE_API_KEY', 'test-only-key');
  vi.stubEnv('BHARATCODE_MODEL', 'qwen-3.8-27b');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('sends the real SDK request shape and extracts structured output', async () => {
  const fetch = vi.fn().mockResolvedValue(response());
  vi.stubGlobal('fetch', fetch);
  const value = await analyzeWithBharatCode(input, AbortSignal.timeout(5000));
  expect(value.result).toEqual(modelResult);
  expect(value.tokens).toBe(3);
  const [url, options] = fetch.mock.calls[0];
  expect(url.toString()).toBe('https://bharatcode.ai/api/model/v1/responses');
  const body = JSON.parse(options.body);
  expect(body.store).toBe(false);
  expect(body.model).toBe('qwen-3.8-27b');
  expect(body.text.format.type).toBe('json_schema');
  expect(body.text.format.schema.additionalProperties).toBe(false);
  expect(body.input).toBe(JSON.stringify(input));
});
it('does not accept incomplete or malformed model responses', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response('{}', 'incomplete'))
      .mockResolvedValueOnce(response('not-json')),
  );
  await expect(
    analyzeWithBharatCode(input, AbortSignal.timeout(5000)),
  ).rejects.toMatchObject({ code: 'INCOMPLETE_OUTPUT' });
  await expect(
    analyzeWithBharatCode(input, AbortSignal.timeout(5000)),
  ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
});
it('retries a busy response once, then stops', async () => {
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
    analyzeWithBharatCode(input, AbortSignal.timeout(5000)),
  ).rejects.toMatchObject({ code: 'PROVIDER_BUSY' });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('reports account errors without leaking the upstream body', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'private-upstream-detail' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
  );
  await expect(
    analyzeWithBharatCode(input, AbortSignal.timeout(5000)),
  ).rejects.toMatchObject({ code: 'API_ACCESS' });
});
