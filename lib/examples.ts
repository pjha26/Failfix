import type { Analysis, AnalysisInput } from './contracts';

export type Example = { id: string; title: string; description: string; input: AnalysisInput; analysis: Analysis; fixedSource: string };
// These are hand-authored teaching examples, not cached live model responses.
export const examples: Example[] = [
  {
    id: 'zero', title: 'Zero is a value', description: 'A default quietly overwrites a valid input.',
    input: {
      source: { path: 'src/retry-count.ts', text: 'export function retryCount(value: number | undefined): number {\n  return value || 3;\n}\n' },
      test: { path: 'tests/retry-count.test.ts', text: "import { expect, it } from 'vitest';\nimport { retryCount } from '../src/retry-count';\n\nit('allows retries to be disabled', () => {\n  expect(retryCount(0)).toBe(0);\n});\n" },
      log: ' FAIL  tests/retry-count.test.ts > allows retries to be disabled\nAssertionError: expected 3 to be 0\nExpected: 0\nReceived: 3\n',
      expectedBehavior: 'Preserve any numeric value, including zero. Use 3 only when the value is undefined.',
    },
    analysis: { status: 'proposed_fix', summary: 'Logical OR treats zero as falsy, so disabling retries accidentally resets them to three. Nullish coalescing preserves zero while retaining the default for undefined.', evidence: [{ input: 'source', startLine: 2, endLine: 2, explanation: 'The || operator selects 3 whenever value is falsy, including 0.' }, { input: 'test', startLine: 5, endLine: 5, explanation: 'The test explicitly expects zero retries to remain zero.' }, { input: 'log', startLine: 2, endLine: 4, explanation: 'The observed value is the fallback 3 rather than the requested 0.' }], edits: [{ original: 'return value || 3;', replacement: 'return value ?? 3;' }], regressionTest: "import { expect, it } from 'vitest';\nimport { retryCount } from '../src/retry-count';\n\nit('preserves zero and defaults only when missing', () => {\n  expect(retryCount(0)).toBe(0);\n  expect(retryCount(undefined)).toBe(3);\n  expect(retryCount(2)).toBe(2);\n});\n", questions: [], assumptions: ['The public input type remains number | undefined.'] },
    fixedSource: 'export function retryCount(value: number | undefined): number {\n  return value ?? 3;\n}\n',
  },
  {
    id: 'boundary', title: 'One step too far', description: 'An index points just past the final item.',
    input: {
      source: { path: 'src/last-item.ts', text: 'export function lastItem<T>(items: T[]): T | undefined {\n  return items[items.length];\n}\n' },
      test: { path: 'tests/last-item.test.ts', text: "import { expect, it } from 'vitest';\nimport { lastItem } from '../src/last-item';\n\nit('returns the last element', () => {\n  expect(lastItem([2, 4, 6])).toBe(6);\n});\n" },
      log: ' FAIL  tests/last-item.test.ts > returns the last element\nAssertionError: expected undefined to be 6\nExpected: 6\nReceived: undefined\n', expectedBehavior: 'Return the final array element, or undefined for an empty array.',
    },
    analysis: { status: 'proposed_fix', summary: 'Array indices start at zero. items.length points one position beyond the last item, so the function returns undefined for a nonempty array.', evidence: [{ input: 'source', startLine: 2, endLine: 2, explanation: 'The final valid index is length - 1.' }, { input: 'test', startLine: 5, endLine: 5, explanation: 'A three-item array should return its third item, 6.' }], edits: [{ original: 'return items[items.length];', replacement: 'return items[items.length - 1];' }], regressionTest: "import { expect, it } from 'vitest';\nimport { lastItem } from '../src/last-item';\n\nit('handles a singleton and an empty array', () => {\n  expect(lastItem([7])).toBe(7);\n  expect(lastItem([])).toBeUndefined();\n});\n", questions: [], assumptions: ['An empty array should return undefined, as described.'] },
    fixedSource: 'export function lastItem<T>(items: T[]): T | undefined {\n  return items[items.length - 1];\n}\n',
  },
  {
    id: 'mutation', title: 'The hidden side effect', description: 'Sorting a result also changes the original.',
    input: {
      source: { path: 'src/sorted-scores.ts', text: 'export function sortedScores(scores: number[]): number[] {\n  return scores.sort((a, b) => b - a);\n}\n' },
      test: { path: 'tests/sorted-scores.test.ts', text: "import { expect, it } from 'vitest';\nimport { sortedScores } from '../src/sorted-scores';\n\nit('keeps the caller array unchanged', () => {\n  const scores = [2, 9, 1];\n  expect(sortedScores(scores)).toEqual([9, 2, 1]);\n  expect(scores).toEqual([2, 9, 1]);\n});\n" },
      log: ' FAIL  tests/sorted-scores.test.ts > keeps the caller array unchanged\nAssertionError: expected [9, 2, 1] to deeply equal [2, 9, 1]\n', expectedBehavior: 'Return a new descending array without mutating the caller array.',
    },
    analysis: { status: 'proposed_fix', summary: 'Array.sort changes the array in place. The sorted result is correct, but the caller loses its original order. Copy the array before sorting.', evidence: [{ input: 'source', startLine: 2, endLine: 2, explanation: 'sort is called directly on the caller-owned scores array.' }, { input: 'test', startLine: 7, endLine: 7, explanation: 'The assertion requires the original scores array to stay unchanged.' }], edits: [{ original: 'return scores.sort((a, b) => b - a);', replacement: 'return [...scores].sort((a, b) => b - a);' }], regressionTest: "import { expect, it } from 'vitest';\nimport { sortedScores } from '../src/sorted-scores';\n\nit('returns a separate descending array and preserves duplicates', () => {\n  const scores = [3, 1, 3];\n  const result = sortedScores(scores);\n  expect(result).toEqual([3, 3, 1]);\n  expect(result).not.toBe(scores);\n  expect(scores).toEqual([3, 1, 3]);\n});\n", questions: [], assumptions: ['Returning a fresh array is part of the expected behavior.'] },
    fixedSource: 'export function sortedScores(scores: number[]): number[] {\n  return [...scores].sort((a, b) => b - a);\n}\n',
  },
];
