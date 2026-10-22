import { existsSync } from 'node:fs';
import OpenAI from 'openai';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (!process.env.BHARATCODE_API_KEY?.trim()) {
  console.error(
    'Add BHARATCODE_API_KEY to .env.local after eligible API access is available. No request was sent.',
  );
  process.exit(1);
}
const model = process.env.BHARATCODE_MODEL || 'qwen-3.8-27b';
const client = new OpenAI({
  apiKey: process.env.BHARATCODE_API_KEY,
  baseURL: 'https://bharatcode.ai/api/model/v1',
  maxRetries: 0,
  timeout: 90_000,
});
try {
  const models = await client.models.list();
  if (!models.data.some((item) => item.id === model))
    throw new Error('MODEL_NOT_AVAILABLE');
  const response = await client.responses.create({
    model,
    input: 'Return status ok in the required JSON structure.',
    store: false,
    max_output_tokens: 512,
    text: {
      format: {
        type: 'json_schema',
        name: 'connectivity_check',
        strict: true,
        schema: {
          type: 'object',
          properties: { status: { type: 'string', enum: ['ok'] } },
          required: ['status'],
          additionalProperties: false,
        },
      },
    },
  });
  if (
    response.status !== 'completed' ||
    JSON.parse(response.output_text).status !== 'ok'
  )
    throw new Error('STRUCTURED_RESPONSE_NOT_CONFIRMED');
  console.log(
    JSON.stringify({
      status: 'ok',
      model,
      requestId: response._request_id,
      tokens: response.usage?.total_tokens,
      note: 'Connectivity and tiny schema check only; model debugging quality is not verified.',
    }),
  );
} catch (error) {
  const code =
    error instanceof OpenAI.APIError
      ? `HTTP_${error.status || 'UNKNOWN'}`
      : error instanceof Error &&
          ['MODEL_NOT_AVAILABLE', 'STRUCTURED_RESPONSE_NOT_CONFIRMED'].includes(
            error.message,
          )
        ? error.message
        : 'CONNECTION_OR_RESPONSE_ERROR';
  console.error(
    `BharatCode check failed: ${code}. Check account access/model eligibility; do not share your key.`,
  );
  process.exitCode = 1;
}
