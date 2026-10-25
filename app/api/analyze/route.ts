import { randomUUID } from 'node:crypto';
import { analyzeWithGroq } from '@/lib/groq';
import { AnalysisError } from '@/lib/http';
import { inputSchema } from '@/lib/contracts';
import { readJsonRequest } from '@/lib/http';
import { buildArtifacts } from '@/lib/patch';
import { gate, trustedClient } from '@/lib/limits';

export const runtime = 'nodejs';
export const maxDuration = 100;

export async function POST(request: Request) {
  const requestId = randomUUID();
  const started = Date.now();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };
  let release: (() => void) | undefined;
  try {
    const parsed = inputSchema.safeParse(await readJsonRequest(request));
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
    if (!process.env.GROQ_API_KEY?.trim())
      throw new AnalysisError(
        'API_NOT_CONFIGURED',
        'Live analysis is not configured yet. Try a saved example, or add a Groq API key when running locally.',
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
    const provider = await analyzeWithGroq(parsed.data, signal);
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
