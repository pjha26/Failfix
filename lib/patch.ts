import { createTwoFilesPatch } from 'diff';
import { posix } from 'node:path';
import {
  resultSchema,
  type Analysis,
  type AnalysisInput,
  type Artifacts,
} from './contracts';

const lf = (value: string) => value.replace(/\r\n/g, '\n');

export function regressionPath(testPath: string) {
  return testPath.replace(/\.(test|spec)\.ts$/, '.failfix.test.ts');
}

export function buildArtifacts(
  input: AnalysisInput,
  untrusted: unknown,
): { analysis: Analysis; artifacts: Artifacts | null } {
  const analysis = resultSchema.parse(untrusted);
  for (const evidence of analysis.evidence) {
    const value =
      evidence.input === 'log' ? input.log : input[evidence.input].text;
    if (
      evidence.endLine < evidence.startLine ||
      evidence.endLine > lf(value).split('\n').length
    )
      throw new Error(
        'The model referenced a line outside the supplied input.',
      );
  }
  if (analysis.status !== 'proposed_fix') return { analysis, artifacts: null };
  const source = lf(input.source.text);
  const edits = analysis.edits
    .map((edit) => {
      const original = lf(edit.original);
      const start = source.indexOf(original);
      if (start < 0 || source.indexOf(original, start + 1) !== -1)
        throw new Error(
          'A proposed edit did not match exactly one source location.',
        );
      if (original === lf(edit.replacement))
        throw new Error('A proposed edit did not change the source.');
      return {
        start,
        end: start + original.length,
        replacement: lf(edit.replacement),
      };
    })
    .sort((a, b) => b.start - a.start);
  for (let i = 1; i < edits.length; i++)
    if (edits[i].end > edits[i - 1].start)
      throw new Error('Proposed edits overlap.');
  let fixedSource = source;
  for (const edit of edits)
    fixedSource =
      fixedSource.slice(0, edit.start) +
      edit.replacement +
      fixedSource.slice(edit.end);
  if (fixedSource === source)
    throw new Error('The proposed edits cancel each other out.');
  const newTestPath = regressionPath(input.test.path);
  if (newTestPath === input.source.path || newTestPath === input.test.path)
    throw new Error('The regression test path collides with an input file.');
  // shortcut: only literal relative imports can be checked here; actual compilation remains local.
  const regressionTest = lf(analysis.regressionTest!);
  for (const match of regressionTest.matchAll(
    /(?:from\s*|import\s*)['"]([^'"]+)['"]/g,
  )) {
    const specifier = match[1];
    if (specifier === 'vitest') continue;
    if (!specifier.startsWith('.'))
      throw new Error('The regression test imports an unsupported dependency.');
    const imported = posix
      .normalize(posix.join(posix.dirname(newTestPath), specifier))
      .replace(/\.(ts|js)$/, '');
    if (imported !== input.source.path.replace(/\.ts$/, ''))
      throw new Error(
        'The regression test imports a file that was not provided.',
      );
  }
  const eol = input.source.text.includes('\r\n') ? '\r\n' : '\n';
  if (eol === '\r\n') fixedSource = fixedSource.replace(/\n/g, '\r\n');
  const patch =
    createTwoFilesPatch(
      `a/${input.source.path}`,
      `b/${input.source.path}`,
      input.source.text,
      fixedSource,
      '',
      '',
      { context: 3 },
    ) +
    createTwoFilesPatch(
      '/dev/null',
      `b/${newTestPath}`,
      '',
      regressionTest,
      '',
      '',
      { context: 3 },
    );
  return {
    analysis,
    artifacts: {
      fixedSource,
      patch,
      regressionPath: newTestPath,
      regressionTest,
    },
  };
}
