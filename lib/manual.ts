import { z } from 'zod';
import {
  inputSchema,
  MAX_BODY_BYTES,
  byteLength,
  resultSchema,
  type AnalysisInput,
} from './contracts';
import { SYSTEM_PROMPT } from './prompt';

const schema = JSON.stringify(z.toJSONSchema(resultSchema), null, 2);
export function createManualPrompt(input: AnalysisInput) {
  inputSchema.parse(input);
  if (byteLength(JSON.stringify(input)) > MAX_BODY_BYTES)
    throw new Error('Input must be at most 64 KiB in total.');
  return `${SYSTEM_PROMPT}\n\nReturn only one JSON object matching this schema. Do not wrap the answer in prose. This is a manual proposal; do not claim code execution.\n\nOUTPUT SCHEMA:\n${schema}\n\nUSER INPUT:\n${JSON.stringify(input, null, 2)}`;
}

export function parseManualProposal(text: string): unknown {
  if (byteLength(text) > 48 * 1024)
    throw new Error('Proposal must be at most 48 KiB.');
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
  try {
    return JSON.parse(fenced ? fenced[1] : trimmed) as unknown;
  } catch {
    throw new Error(
      'Paste a complete JSON object. A single JSON code block is also accepted; surrounding explanations are not.',
    );
  }
}
