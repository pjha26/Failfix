import Groq from 'groq-sdk';
import { z } from 'zod';
import { setTimeout as delay } from 'node:timers/promises';
import { byteLength, resultSchema, type AnalysisInput } from './contracts';
import { SYSTEM_PROMPT } from './prompt';
import { AnalysisError } from './http';

export async function analyzeWithGroq(
  input: AnalysisInput,
  signal: AbortSignal,
) {
  const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    maxRetries: 0,
    timeout: 90_000,
  });
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
  const schema = z.toJSONSchema(resultSchema);
  const lineCount = (text: string) =>
    text.replace(/\r\n/g, '\n').split('\n').length;
  const context = {
    ...input,
    lineLimits: {
      source: lineCount(input.source.text),
      test: lineCount(input.test.text),
      log: lineCount(input.log),
    },
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data: completion, response } = await client.chat.completions
        .create(
          {
            model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: JSON.stringify(context) },
            ],
            max_completion_tokens: 6000,
            ...(model.startsWith('openai/gpt-oss-')
              ? { reasoning_effort: 'low' as const }
              : {}),
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'failfix_analysis', strict: true, schema },
            },
          },
          { signal },
        )
        .withResponse();
      const choice = completion.choices[0];
      if (!choice)
        throw new AnalysisError(
          'INVALID_OUTPUT',
          'Groq returned no result. No patch was accepted.',
        );
      if (choice.finish_reason !== 'stop')
        throw new AnalysisError(
          'INCOMPLETE_OUTPUT',
          'The model did not finish a text answer. No patch was accepted. Try smaller inputs or retry later.',
        );
      const text = choice.message.content;
      if (typeof text !== 'string' || !text.trim())
        throw new AnalysisError(
          'INVALID_OUTPUT',
          'Groq returned no readable proposal. No patch was accepted.',
        );
      if (byteLength(text) > 48 * 1024)
        throw new AnalysisError(
          'INVALID_OUTPUT',
          'The model returned an oversized result. No patch was accepted.',
        );
      let result: unknown;
      try {
        result = JSON.parse(text);
      } catch {
        throw new AnalysisError(
          'INVALID_OUTPUT',
          'The model returned an unreadable result. No patch was accepted.',
        );
      }
      return {
        result,
        providerRequestId:
          response.headers.get('x-request-id') ||
          completion.x_groq?.id ||
          completion.id,
        model,
        tokens: completion.usage?.total_tokens,
      };
    } catch (error) {
      if (signal.aborted || error instanceof Groq.APIConnectionTimeoutError)
        throw new AnalysisError(
          'TIMEOUT',
          'Analysis was cancelled or timed out. Your input is still here.',
          504,
        );
      if (error instanceof Groq.APIConnectionError)
        throw new AnalysisError(
          'CONNECTION_ERROR',
          'Could not reach Groq. Please try again later.',
        );
      if (error instanceof Groq.APIError) {
        const detail = error.error as
          { code?: unknown; error?: { code?: unknown } } | undefined;
        if (
          detail?.code === 'json_validate_failed' ||
          detail?.error?.code === 'json_validate_failed'
        )
          throw new AnalysisError(
            'INVALID_OUTPUT',
            'Groq rejected a generated proposal that did not match the required schema. No patch was accepted. Try clearer or smaller inputs.',
          );
        if (error.status === 503 && attempt === 0) {
          try {
            await delay(2000, undefined, { signal });
          } catch {
            throw new AnalysisError(
              'TIMEOUT',
              'Analysis was cancelled or timed out.',
              504,
            );
          }
          continue;
        }
        if (error.status === 401 || error.status === 403)
          throw new AnalysisError(
            'API_ACCESS',
            'Groq API access is unavailable. The operator must check the key and model permissions.',
            503,
          );
        if (error.status === 429 || error.status === 503)
          throw new AnalysisError(
            'PROVIDER_BUSY',
            'Groq is busy or the account has reached a limit. Try smaller inputs or wait before retrying.',
            503,
          );
        if ([400, 404, 422].includes(error.status || 0))
          throw new AnalysisError(
            'PROVIDER_CONFIGURATION',
            'Groq could not accept the configured model or structured-output request. The operator should check GROQ_MODEL and schema compatibility.',
            503,
          );
        throw new AnalysisError(
          'PROVIDER_ERROR',
          'Groq could not complete this request. Your input has been preserved.',
        );
      }
      if (error instanceof AnalysisError) throw error;
      throw new AnalysisError(
        'CONNECTION_ERROR',
        'Could not reach Groq. Please try again later.',
      );
    }
  }
  throw new AnalysisError(
    'PROVIDER_BUSY',
    'Groq is busy. Please try again later.',
    503,
  );
}
