import { z } from 'zod';

export const MAX_BODY_BYTES = 64 * 1024;
export const byteLength = (text: string) =>
  new TextEncoder().encode(text).length;
const text = (max: number) =>
  z
    .string()
    .min(1)
    .refine(
      (value) => byteLength(value) <= max,
      `Must be at most ${max} bytes.`,
    );
const filePath = z
  .string()
  .max(160)
  .regex(
    /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.ts$/,
    'Use a relative .ts path, such as src/math.ts.',
  );
const code = text(20 * 1024).refine(
  (value) => !value.includes('\0'),
  'Binary files are not supported.',
);
export const inputSchema = z
  .object({
    source: z.object({ path: filePath, text: code }).strict(),
    test: z
      .object({
        path: filePath.refine(
          (value) => /\.(test|spec)\.ts$/.test(value),
          'Use a .test.ts or .spec.ts file.',
        ),
        text: code,
      })
      .strict(),
    log: text(12 * 1024),
    expectedBehavior: z
      .string()
      .refine(
        (value) => byteLength(value) <= 2048,
        'Expected behavior must be at most 2048 bytes.',
      ),
  })
  .strict()
  .refine(
    (value) => value.source.path !== value.test.path,
    'Source and test paths must differ.',
  );
export type AnalysisInput = z.infer<typeof inputSchema>;

export const resultSchema = z
  .object({
    status: z.enum(['proposed_fix', 'needs_context', 'unsupported']),
    summary: z.string().min(1).max(1800),
    evidence: z
      .array(
        z
          .object({
            input: z.enum(['source', 'test', 'log']),
            startLine: z.number().int().positive(),
            endLine: z.number().int().positive(),
            explanation: z.string().min(1).max(900),
          })
          .strict(),
      )
      .max(8),
    edits: z
      .array(
        z
          .object({
            original: z.string().min(1).max(12000),
            replacement: z.string().max(20000),
          })
          .strict(),
      )
      .max(3),
    regressionTest: z.string().min(1).max(20000).nullable(),
    questions: z.array(z.string().min(1).max(600)).max(5),
    assumptions: z.array(z.string().min(1).max(600)).max(5),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.status === 'proposed_fix' &&
      (!value.evidence.length || !value.edits.length || !value.regressionTest)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'A proposed fix needs evidence, edits, and a regression test.',
      });
    if (
      value.status !== 'proposed_fix' &&
      (value.edits.length || value.regressionTest !== null)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Non-fix results must not contain changes.',
      });
    if (value.status === 'needs_context' && !value.questions.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Missing context requires a concrete question.',
      });
  });
export type Analysis = z.infer<typeof resultSchema>;
export type Artifacts = {
  fixedSource: string;
  patch: string;
  regressionPath: string;
  regressionTest: string;
};
export type AnalysisResponse = {
  analysis: Analysis;
  artifacts: Artifacts | null;
  requestId: string;
  durationMs: number;
};
