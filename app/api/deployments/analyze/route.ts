import { randomUUID } from 'node:crypto';
import { AnalysisError, readJsonRequest } from '@/lib/http';
import { deploymentInputSchema } from '@/lib/deployment-contracts';
import { inspectDeployment } from '@/lib/deployment-analysis';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const requestId = randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };
  try {
    const parsed = deploymentInputSchema.safeParse(
      await readJsonRequest(request, 128 * 1024),
    );
    if (!parsed.success)
      throw new AnalysisError(
        'INVALID_DEPLOYMENT_INPUT',
        parsed.error.issues
          .slice(0, 2)
          .map((issue) => issue.message)
          .join(' '),
        400,
      );
    return Response.json(
      { report: inspectDeployment(parsed.data), requestId },
      { headers },
    );
  } catch (error) {
    const safe =
      error instanceof AnalysisError
        ? error
        : new AnalysisError(
            'REVIEW_FAILED',
            'Could not review the build context. Your inputs are still here.',
            500,
          );
    return Response.json(
      { error: safe.message, code: safe.code, requestId },
      { status: safe.httpStatus, headers },
    );
  }
}
