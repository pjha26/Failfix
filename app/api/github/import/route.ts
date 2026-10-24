import { randomUUID } from 'node:crypto';
import { AnalysisError, readJsonRequest } from '@/lib/http';
import {
  importPublicRepository,
  importRequestSchema,
} from '@/lib/github-public';

export const runtime = 'nodejs';
let activeImports = 0;

export async function POST(request: Request) {
  const requestId = randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };
  let admitted = false;
  try {
    const parsed = importRequestSchema.safeParse(
      await readJsonRequest(request, 2048),
    );
    if (!parsed.success)
      throw new AnalysisError(
        'INVALID_REPOSITORY',
        'Use a public GitHub repository URL or owner/repository and a valid optional run ID.',
        400,
      );
    if (activeImports >= 2)
      throw new AnalysisError(
        'IMPORT_BUSY',
        'Two imports are already running. Try again shortly.',
        429,
      );
    activeImports++;
    admitted = true;
    const snapshot = await importPublicRepository(
      parsed.data.repository,
      parsed.data.runId,
      request.signal,
    );
    return Response.json({ snapshot, requestId }, { headers });
  } catch (error) {
    const safe =
      error instanceof AnalysisError
        ? error
        : new AnalysisError(
            'IMPORT_FAILED',
            'Could not import supported public configuration. GitHub may be unavailable; you can still paste logs and package.json.',
            502,
          );
    return Response.json(
      { error: safe.message, code: safe.code, requestId },
      { status: safe.httpStatus, headers },
    );
  } finally {
    if (admitted) activeImports--;
  }
}
