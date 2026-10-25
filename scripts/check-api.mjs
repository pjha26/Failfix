import { existsSync } from 'node:fs';
import Groq from 'groq-sdk';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (!process.env.GROQ_API_KEY?.trim()) {
  console.error(
    'Add GROQ_API_KEY to .env.local. No request was sent. Never paste a key into chat or commit it.',
  );
  process.exit(1);
}
const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  maxRetries: 0,
  timeout: 90_000,
});
try {
  const models = await client.models.list();
  if (!models.data.some((item) => item.id === model))
    throw new Error('MODEL_NOT_AVAILABLE');
  const { data: completion, response } = await client.chat.completions
    .create({
      model,
      messages: [
        {
          role: 'user',
          content: 'Return status ok in the required JSON structure.',
        },
      ],
      max_completion_tokens: 1024,
      ...(model.startsWith('openai/gpt-oss-')
        ? { reasoning_effort: 'low' }
        : {}),
      response_format: {
        type: 'json_schema',
        json_schema: {
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
    })
    .withResponse();
  const choice = completion.choices[0];
  if (
    choice?.finish_reason !== 'stop' ||
    JSON.parse(choice.message.content || '{}').status !== 'ok'
  )
    throw new Error('STRUCTURED_RESPONSE_NOT_CONFIRMED');
  console.log(
    JSON.stringify({
      status: 'ok',
      model,
      requestId: response.headers.get('x-request-id') || completion.id,
      tokens: completion.usage?.total_tokens,
      note: 'Connectivity and tiny schema check only; model debugging quality is not verified.',
    }),
  );
} catch (error) {
  const code =
    error instanceof Groq.APIError
      ? `HTTP_${error.status || 'UNKNOWN'}`
      : error instanceof Error &&
          ['MODEL_NOT_AVAILABLE', 'STRUCTURED_RESPONSE_NOT_CONFIRMED'].includes(
            error.message,
          )
        ? error.message
        : 'CONNECTION_OR_RESPONSE_ERROR';
  console.error(
    `Groq check failed: ${code}. Check model access and account limits; do not share your key.`,
  );
  process.exitCode = 1;
}
