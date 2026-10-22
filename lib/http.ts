import { MAX_BODY_BYTES } from './contracts';

export class AnalysisError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number = 502,
  ) {
    super(message);
  }
}

export async function readJsonRequest(
  request: Request,
  maxBytes = MAX_BODY_BYTES,
) {
  if (
    request.headers.get('content-type')?.split(';')[0].trim() !==
    'application/json'
  )
    throw new AnalysisError('INVALID_INPUT', 'Send application/json.', 415);
  const origin = request.headers.get('origin');
  const incoming = new URL(request.url);
  const host = request.headers.get('host') || incoming.host;
  if (!/^[A-Za-z0-9.:[\]-]+$/.test(host))
    throw new AnalysisError('INVALID_HOST', 'Invalid request host.', 400);
  let expectedOrigin: string;
  try {
    const publicUrl = new URL(
      process.env.APP_ORIGIN || incoming.protocol + '//' + host,
    );
    if (!['http:', 'https:'].includes(publicUrl.protocol))
      throw new Error('Invalid protocol');
    expectedOrigin = publicUrl.origin;
  } catch {
    throw new AnalysisError(
      'INVALID_ORIGIN',
      'This installation has an invalid public origin.',
      503,
    );
  }
  if (
    (origin && origin !== expectedOrigin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new AnalysisError(
      'CROSS_ORIGIN',
      'Use the FailFix workspace to submit this request.',
      403,
    );

  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new AnalysisError(
      'INPUT_TOO_LARGE',
      `Input must be at most ${maxBytes / 1024} KiB in total.`,
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
      if (total > maxBytes) {
        await reader.cancel();
        throw new AnalysisError(
          'INPUT_TOO_LARGE',
          `Input must be at most ${maxBytes / 1024} KiB in total.`,
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
