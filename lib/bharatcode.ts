import OpenAI from 'openai';
import { z } from 'zod';
import { setTimeout as delay } from 'node:timers/promises';
import { byteLength, resultSchema, type AnalysisInput } from './contracts';
import { SYSTEM_PROMPT } from './prompt';

export class AnalysisError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number = 502,
  ) {
    super(message);
  }
}

export async function analyzeWithBharatCode(
  input: AnalysisInput,
  signal: AbortSignal,
) {
  const client = new OpenAI({
    apiKey: process.env.BHARATCODE_API_KEY,
    baseURL: 'https://bharatcode.ai/api/model/v1',
    maxRetries: 0,
  });
  const model = process.env.BHARATCODE_MODEL || 'qwen-3.8-27b';
  const schema = z.toJSONSchema(resultSchema);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.responses.create(
        {
          model,
          instructions: SYSTEM_PROMPT,
          input: JSON.stringify(input),
          store: false,
          max_output_tokens: 6000,
          text: {
            format: {
              type: 'json_schema',
              name: 'failfix_analysis',
              strict: true,
              schema,
            },
          },
        },
        { signal },
      );
      if (response.status !== 'completed')
        throw new AnalysisError(
          'INCOMPLETE_OUTPUT',
          'The model did not finish its answer. No patch was accepted. Try again or use a smaller example.',
        );
      if (byteLength(response.output_text) > 48 * 1024)
        throw new AnalysisError(
          'INVALID_OUTPUT',
          'The model returned an oversized result. No patch was accepted.',
        );
      let result: unknown;
      try {
        result = JSON.parse(response.output_text);
      } catch {
        throw new AnalysisError(
          'INVALID_OUTPUT',
          'The model returned an unreadable result. No patch was accepted.',
        );
      }
      return {
        result,
        providerRequestId: response._request_id,
        model,
        tokens: response.usage?.total_tokens,
      };
    } catch (error) {
      if (signal.aborted)
        throw new AnalysisError(
          'TIMEOUT',
          'Analysis was cancelled or timed out. Your input is still here.',
          504,
        );
      if (error instanceof OpenAI.APIError) {
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
            'BharatCode API access is unavailable. The operator must check the key and account eligibility.',
            503,
          );
        if (error.status === 429 || error.status === 503)
          throw new AnalysisError(
            'PROVIDER_BUSY',
            'BharatCode is busy or the account has reached a limit. Please try later.',
            503,
          );
        throw new AnalysisError(
          'PROVIDER_ERROR',
          'BharatCode could not complete this request. Your input has been preserved.',
        );
      }
      if (error instanceof AnalysisError) throw error;
      throw new AnalysisError(
        'CONNECTION_ERROR',
        'Could not reach BharatCode. Please try again later.',
      );
    }
  }
  throw new AnalysisError(
    'PROVIDER_BUSY',
    'BharatCode is busy. Please try again later.',
    503,
  );
}
