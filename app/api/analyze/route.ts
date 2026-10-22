import { randomUUID } from 'node:crypto';
import { AnalysisError, analyzeWithBharatCode } from '@/lib/bharatcode';
import { MAX_BODY_BYTES, inputSchema } from '@/lib/contracts';
import { buildArtifacts } from '@/lib/patch';
import { gate, trustedClient } from '@/lib/limits';

export const runtime = 'nodejs';
export const maxDuration = 100;

async function readBody(request: Request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES)
    throw new AnalysisError(
      'INPUT_TOO_LARGE',
      'Input must be at most 64 KiB in total.',
      413,
    );
  const reader = request.body?.getReader();
  if (!reader)
    throw new AnalysisError('INVALID_INPUT', 'Request body is missing.', 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new AnalysisError(
          'INPUT_TOO_LARGE',
          'Input must be at most 64 KiB in total.',
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(combined),
    ) as unknown;
  } catch {
    throw new AnalysisError('INVALID_INPUT', 'Send valid UTF-8 JSON.', 400);
  }
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const started = Date.now();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };
  let release: (() => void) | undefined;
  try {
    if (
      request.headers.get('content-type')?.split(';')[0].trim() !==
      'application/json'
    )
      throw new AnalysisError('INVALID_INPUT', 'Send application/json.', 415);
    const origin = request.headers.get('origin');
    if (
      (origin && origin !== new URL(request.url).origin) ||
      request.headers.get('sec-fetch-site') === 'cross-site'
    )
      throw new AnalysisError(
        'CROSS_ORIGIN',
        'Use the FailFix workspace to submit this request.',
        403,
      );
    const parsed = inputSchema.safeParse(await readBody(request));
    if (!parsed.success)
      throw new AnalysisError(
        'INVALID_INPUT',
        parsed.error.issues
          .map(
            (issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`,
          )
          .slice(0, 3)
          .join(' '),
        400,
      );
    if (process.env.ANALYSIS_ENABLED === 'false')
      throw new AnalysisError(
        'ANALYSIS_DISABLED',
        'Live analysis is paused. You can still explore saved examples.',
        503,
      );
    if (!process.env.BHARATCODE_API_KEY?.trim())
      throw new AnalysisError(
        'API_NOT_CONFIGURED',
        'Live analysis is not configured yet. Try a saved example, or add a BharatCode API key when running locally.',
        503,
      );
    const admission = gate.acquire(trustedClient(request));
    if (!admission.accepted)
      return Response.json(
        { error: admission.message, code: 'RATE_LIMITED', requestId },
        { status: 429, headers: { ...headers, 'Retry-After': '30' } },
      );
    release = admission.release;
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(90_000),
    ]);
    const provider = await analyzeWithBharatCode(parsed.data, signal);
    let result: ReturnType<typeof buildArtifacts>;
    try {
      result = buildArtifacts(parsed.data, provider.result);
    } catch {
      throw new AnalysisError(
        'INVALID_PATCH',
        'The model suggested a result that failed validation. No patch was accepted. You can retry with clearer expected behavior.',
      );
    }
    const durationMs = Date.now() - started;
    console.info(
      JSON.stringify({
        requestId,
        status: result.analysis.status,
        durationMs,
        model: provider.model,
        tokens: provider.tokens,
        providerRequestId: provider.providerRequestId,
      }),
    );
    return Response.json({ ...result, requestId, durationMs }, { headers });
  } catch (error) {
    const safe =
      error instanceof AnalysisError
        ? error
        : new AnalysisError(
            'INTERNAL_ERROR',
            'Analysis could not be completed. Your input is still here.',
            500,
          );
    console.info(
      JSON.stringify({
        requestId,
        status: safe.code,
        durationMs: Date.now() - started,
      }),
    );
    return Response.json(
      { error: safe.message, code: safe.code, requestId },
      { status: safe.httpStatus, headers },
    );
  } finally {
    release?.();
  }
}
