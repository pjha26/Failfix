import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { inputSchema, MAX_BODY_BYTES, byteLength } from '@/lib/contracts';
import { AnalysisError, readJsonRequest } from '@/lib/http';
import { buildArtifacts } from '@/lib/patch';

export const runtime = 'nodejs';
const reviewSchema = z
  .object({ input: inputSchema, proposal: z.unknown() })
  .strict();
export async function POST(request: Request) {
  const requestId = randomUUID();
  const started = Date.now();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };
  try {
    const parsed = reviewSchema.safeParse(
      await readJsonRequest(request, 128 * 1024),
    );
    if (!parsed.success)
      throw new AnalysisError(
        'INVALID_INPUT',
        'Provide a valid source file, test, failure output, and proposal.',
        400,
      );
    if (byteLength(JSON.stringify(parsed.data.input)) > MAX_BODY_BYTES)
      throw new AnalysisError(
        'INPUT_TOO_LARGE',
        'Debugging inputs must be at most 64 KiB.',
        413,
      );
    if (byteLength(JSON.stringify(parsed.data.proposal) || '') > 48 * 1024)
      throw new AnalysisError(
        'INPUT_TOO_LARGE',
        'Proposal must be at most 48 KiB.',
        413,
      );
    let result: ReturnType<typeof buildArtifacts>;
    try {
      result = buildArtifacts(parsed.data.input, parsed.data.proposal);
    } catch {
      throw new AnalysisError(
        'INVALID_PROPOSAL',
        'This proposal failed validation. Check the required JSON structure, evidence lines, exact source matches, and test imports. No new patch was accepted.',
        422,
      );
    }
    return Response.json(
      {
        ...result,
        origin: 'manual',
        requestId,
        durationMs: Date.now() - started,
      },
      { headers },
    );
  } catch (error) {
    const safe =
      error instanceof AnalysisError
        ? error
        : new AnalysisError(
            'REVIEW_FAILED',
            'Could not review this proposal. Your input is still here.',
            500,
          );
    return Response.json(
      { error: safe.message, code: safe.code, requestId },
      { status: safe.httpStatus, headers },
    );
  }
}
