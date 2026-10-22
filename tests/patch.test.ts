import { describe, expect, it } from 'vitest';
import { applyPatch, parsePatch } from 'diff';
import { inputSchema, type Analysis, type AnalysisInput } from '../lib/contracts';
import { buildArtifacts } from '../lib/patch';

const input: AnalysisInput = { source: { path: 'src/value.ts', text: 'export const value = (n?: number) => n || 10;\n' }, test: { path: 'tests/value.test.ts', text: 'existing tests remain unchanged\n' }, log: 'expected 0, received 10', expectedBehavior: 'Keep zero.' };
const proposal: Analysis = { status: 'proposed_fix', summary: 'Zero is treated as missing.', evidence: [{ input: 'source', startLine: 1, endLine: 1, explanation: 'Logical OR replaces zero.' }], edits: [{ original: 'n || 10', replacement: 'n ?? 10' }], regressionTest: "import { expect, it } from 'vitest';\nimport { value } from '../src/value';\nit('keeps zero', () => expect(value(0)).toBe(0));\n", questions: [], assumptions: [] };

describe('applicable, reviewable patches', () => {
  it('generates a patch that applies and preserves the existing test', () => {
    const before = structuredClone(input);
    const { artifacts } = buildArtifacts(input, proposal);
    const patches = parsePatch(artifacts!.patch);
    expect(patches).toHaveLength(2);
    expect(applyPatch(input.source.text, patches[0])).toBe(artifacts!.fixedSource);
    expect(applyPatch('', patches[1])).toBe(artifacts!.regressionTest);
    expect(input).toEqual(before);
    expect(artifacts!.regressionPath).toBe('tests/value.failfix.test.ts');
  });
  it.each(['not present', ''])('rejects unmatched or empty snippet: %s', original => {
    expect(() => buildArtifacts(input, { ...proposal, edits: [{ original, replacement: 'changed' }] })).toThrow();
  });
  it('rejects ambiguous matches', () => {
    expect(() => buildArtifacts({ ...input, source: { ...input.source, text: 'n || 10\nn || 10' } }, proposal)).toThrow(/exactly one/);
  });
  it('rejects overlapping edits', () => {
    expect(() => buildArtifacts(input, { ...proposal, edits: [...proposal.edits, { original: '=> n || 10', replacement: '=> 0' }] })).toThrow(/overlap/);
  });
  it('applies disjoint changes using original offsets', () => {
    const { artifacts } = buildArtifacts(input, { ...proposal, edits: [...proposal.edits, { original: 'export const', replacement: 'export const /* keep defaults */' }] });
    expect(artifacts!.fixedSource).toBe('export const /* keep defaults */ value = (n?: number) => n ?? 10;\n');
  });
  it('preserves CRLF source files', () => {
    const { artifacts } = buildArtifacts({ ...input, source: { ...input.source, text: input.source.text.replace(/\n/g, '\r\n') } }, proposal);
    expect(artifacts!.fixedSource).toBe('export const value = (n?: number) => n ?? 10;\r\n');
  });
  it('rejects no-op edits and invalid line references', () => {
    expect(() => buildArtifacts(input, { ...proposal, edits: [{ original: 'n || 10', replacement: 'n || 10' }] })).toThrow(/did not change/);
    expect(() => buildArtifacts(input, { ...proposal, evidence: [{ ...proposal.evidence[0], endLine: 30 }] })).toThrow(/line/);
  });
  it('rejects unknown regression imports and path collisions', () => {
    expect(() => buildArtifacts(input, { ...proposal, regressionTest: "import fs from 'node:fs'" })).toThrow(/dependency/);
    expect(() => buildArtifacts(input, { ...proposal, regressionTest: "import { value } from '../missing'" })).toThrow(/not provided/);
    expect(() => buildArtifacts({ ...input, source: { ...input.source, path: 'tests/value.failfix.test.ts' } }, proposal)).toThrow(/collides/);
  });
  it('returns questions without manufacturing changes', () => {
    expect(buildArtifacts(input, { ...proposal, status: 'needs_context', edits: [], regressionTest: null, questions: ['What should an empty input return?'] }).artifacts).toBeNull();
  });
});

describe('input boundaries', () => {
  it('accepts supported input', () => expect(inputSchema.safeParse(input).success).toBe(true));
  it.each(['../value.ts', '/value.ts', 'C:/value.ts', 'src/../../value.ts', 'value.tsx'])('rejects unsafe or unsupported path %s', path => {
    expect(inputSchema.safeParse({ ...input, source: { ...input.source, path } }).success).toBe(false);
  });
  it('rejects oversized multibyte input, binary text, and unknown fields', () => {
    expect(inputSchema.safeParse({ ...input, log: '界'.repeat(5000) }).success).toBe(false);
    expect(inputSchema.safeParse({ ...input, source: { ...input.source, text: '\0' } }).success).toBe(false);
    expect(inputSchema.safeParse({ ...input, key: 'unexpected' }).success).toBe(false);
  });
});
