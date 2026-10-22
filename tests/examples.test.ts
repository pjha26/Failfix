import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { examples } from '../lib/examples';
import { buildArtifacts } from '../lib/patch';
import { retryCount as buggyRetry } from '../evals/cases/zero/buggy';
import { retryCount as fixedRetry } from '../evals/cases/zero/reviewed-fix';
import { lastItem as buggyLast } from '../evals/cases/boundary/buggy';
import { lastItem as fixedLast } from '../evals/cases/boundary/reviewed-fix';
import { sortedScores as buggySort } from '../evals/cases/mutation/buggy';
import { sortedScores as fixedSort } from '../evals/cases/mutation/reviewed-fix';

describe('reviewed first-party examples (not a model benchmark)', () => {
  it.each(examples)('$id uses the same reviewed source as the downloaded example', example => {
    const fixture = (name: string) => readFileSync(resolve('evals/cases', example.id, name), 'utf8');
    expect(example.input.source.text).toBe(fixture('buggy.ts'));
    const { artifacts } = buildArtifacts(example.input, example.analysis);
    expect(artifacts!.fixedSource).toBe(fixture('reviewed-fix.ts'));
    expect(artifacts!.regressionTest).toBe(fixture('reviewed-regression.txt'));
  });
  it('exposes the zero bug and checks independent boundaries after the reviewed fix', () => {
    expect(buggyRetry(0)).not.toBe(0);
    expect(fixedRetry(0)).toBe(0);
    expect(fixedRetry(undefined)).toBe(3);
    expect(fixedRetry(-1)).toBe(-1);
    expect(fixedRetry(8)).toBe(8);
  });
  it('exposes the array boundary bug and checks empty, singleton, and generic values', () => {
    expect(buggyLast([7])).not.toBe(7);
    expect(fixedLast([7])).toBe(7);
    expect(fixedLast([])).toBeUndefined();
    expect(fixedLast(['a', 'z'])).toBe('z');
  });
  it('exposes mutation and checks independent arrays including duplicates and negatives', () => {
    const original = [2, 9, 1]; buggySort(original);
    expect(original).not.toEqual([2, 9, 1]);
    const scores = [3, -1, 3]; const sorted = fixedSort(scores);
    expect(sorted).toEqual([3, 3, -1]);
    expect(scores).toEqual([3, -1, 3]);
    expect(sorted).not.toBe(scores);
    expect(fixedSort([])).toEqual([]);
  });
});
