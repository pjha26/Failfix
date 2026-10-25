import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../app/api/review/route';
import { examples } from '../lib/examples';
import { createManualPrompt, parseManualProposal } from '../lib/manual';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const example = examples[0];
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/review', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
describe('no-key manual review', () => {
  it('validates a real proposal and generates artifacts without a key or outbound request', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    const fetch = vi.fn(() => {
      throw new Error('Outbound request forbidden');
    });
    vi.stubGlobal('fetch', fetch);
    const response = await POST(
      request({ input: example.input, proposal: example.analysis }),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.origin).toBe('manual');
    expect(data.artifacts.fixedSource).toBe(example.fixedSource);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects fabricated edit locations and invalid schema', async () => {
    const invalid = {
      ...example.analysis,
      edits: [{ original: 'not in the file', replacement: 'new text' }],
    };
    expect(
      (await POST(request({ input: example.input, proposal: invalid }))).status,
    ).toBe(422);
    expect(
      (await POST(request({ input: example.input, proposal: {} }))).status,
    ).toBe(422);
  });
  it('rejects unsafe paths, cross-origin requests, and oversized bodies', async () => {
    const input = {
      ...example.input,
      source: { ...example.input.source, path: '../private.ts' },
    };
    expect(
      (await POST(request({ input, proposal: example.analysis }))).status,
    ).toBe(400);
    expect(
      (
        await POST(
          request(
            { input: example.input, proposal: example.analysis },
            { origin: 'https://other.example' },
          ),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          new Request('http://localhost/api/review', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: ' '.repeat(128 * 1024 + 1),
          }),
        )
      ).status,
    ).toBe(413);
  });
  it('enforces the proposal limit separately from the overall request limit', async () => {
    expect(
      (
        await POST(
          request({
            input: example.input,
            proposal: { text: 'x'.repeat(49 * 1024) },
          }),
        )
      ).status,
    ).toBe(413);
  });
  it('supports questions without inventing artifacts', async () => {
    const proposal = {
      ...example.analysis,
      status: 'needs_context',
      edits: [],
      regressionTest: null,
      questions: ['What should null mean?'],
    };
    const data = await (
      await POST(request({ input: example.input, proposal }))
    ).json();
    expect(data.artifacts).toBeNull();
    expect(data.origin).toBe('manual');
  });
  it('accepts the browser host even when the internal request URL uses localhost', async () => {
    vi.stubEnv('APP_ORIGIN', '');
    const response = await POST(
      request(
        { input: example.input, proposal: example.analysis },
        { host: '127.0.0.1:3006', origin: 'http://127.0.0.1:3006' },
      ),
    );
    expect(response.status).toBe(200);
  });
  it('uses a configured canonical origin without trusting forwarded host headers', async () => {
    vi.stubEnv('APP_ORIGIN', 'https://failfix.example');
    const body = { input: example.input, proposal: example.analysis };
    expect(
      (await POST(request(body, { origin: 'https://failfix.example' }))).status,
    ).toBe(200);
    expect(
      (
        await POST(
          request(body, {
            origin: 'http://localhost',
            'x-forwarded-host': 'localhost',
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          request(body, {
            origin: 'https://evil.example',
            host: 'evil.example',
          }),
        )
      ).status,
    ).toBe(403);
  });
});
describe('manual prompt and response handling', () => {
  it('includes the supplied context and a structured response contract', () => {
    const prompt = createManualPrompt(example.input);
    expect(prompt).toContain('OUTPUT SCHEMA:');
    expect(prompt).toContain('USER INPUT:');
    expect(prompt).toContain('retryCount');
    expect(prompt).toContain('Do not change existing tests');
  });
  it('accepts plain JSON or one explicit code fence, without extracting arbitrary prose', () => {
    const json = JSON.stringify(example.analysis);
    expect(parseManualProposal(json)).toEqual(example.analysis);
    expect(parseManualProposal('```json\n' + json + '\n```')).toEqual(
      example.analysis,
    );
    expect(() => parseManualProposal('Here is a fix: ' + json)).toThrow(
      /complete JSON/,
    );
    expect(() => parseManualProposal('```json\n{\n```')).toThrow(
      /complete JSON/,
    );
    expect(() => parseManualProposal(' '.repeat(49 * 1024))).toThrow(/48 KiB/);
  });
});
