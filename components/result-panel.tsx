'use client';
import { useState } from 'react';
import type { AnalysisInput, AnalysisResponse } from '@/lib/contracts';

function download(filename: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ResultPanel({
  result,
  input,
  stale,
  savedExample,
  onEvidence,
}: {
  result: AnalysisResponse;
  input: AnalysisInput;
  stale: boolean;
  savedExample: string | null;
  onEvidence: (
    kind: 'source' | 'test' | 'log',
    start: number,
    end: number,
  ) => void;
}) {
  const [view, setView] = useState<'patch' | 'test'>('patch');
  const [copyStatus, setCopyStatus] = useState('');
  const { analysis, artifacts } = result;
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus('Copied to clipboard.');
    } catch {
      setCopyStatus('Clipboard unavailable. Select the text or use Download.');
    }
  }
  return (
    <div className={`result-content${stale ? ' stale-result' : ''}`}>
      {result.origin === 'manual' && (
        <div className="saved-banner manual-result-banner">
          <strong>User-supplied proposal · validated structure</strong>
          <span>
            No model call was made by FailFix. Review the diagnosis and run
            tests locally.
          </span>
        </div>
      )}
      {savedExample && (
        <div className="saved-banner">
          <strong>Saved example · hand-authored walkthrough</strong>
          <span>This is an illustrative result, not a live Groq response.</span>
        </div>
      )}
      {stale && (
        <div className="stale-banner" role="status">
          Inputs changed. Reanalyze or validate the proposal again before using
          this result. Downloads and evidence links are disabled.
        </div>
      )}
      <div className="result-meta">
        <span className={artifacts ? 'result-badge' : 'context-badge'}>
          {artifacts
            ? 'PROPOSED FIX'
            : analysis.status === 'needs_context'
              ? 'MORE CONTEXT NEEDED'
              : 'OUTSIDE SUPPORTED SCOPE'}
        </span>
        {!savedExample && result.origin !== 'manual' && (
          <span>{(result.durationMs / 1000).toFixed(1)}s</span>
        )}
      </div>
      <h3 className="result-title">
        {artifacts ? 'Here’s what’s happening.' : 'Let’s clarify the problem.'}
      </h3>
      <p className="diagnosis">{analysis.summary}</p>
      {!!analysis.evidence.length && (
        <section className="evidence-section" aria-label="Evidence">
          <h4>FOLLOW THE EVIDENCE</h4>
          {analysis.evidence.map((evidence, index) => (
            <button
              className="evidence"
              disabled={stale}
              key={index}
              onClick={() =>
                onEvidence(evidence.input, evidence.startLine, evidence.endLine)
              }
            >
              <span className="evidence-location">
                {evidence.input}{' '}
                <b>
                  L{evidence.startLine}
                  {evidence.endLine !== evidence.startLine
                    ? `–${evidence.endLine}`
                    : ''}{' '}
                  ↗
                </b>
              </span>
              <span>{evidence.explanation}</span>
            </button>
          ))}
        </section>
      )}
      {!!analysis.questions.length && (
        <section className="questions">
          <h4>What we need</h4>
          <ul>
            {analysis.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      )}
      {!!analysis.assumptions.length && (
        <details className="assumptions">
          <summary>Assumptions ({analysis.assumptions.length})</summary>
          <ul>
            {analysis.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </details>
      )}
      {artifacts && (
        <>
          <div className="patch-validation">
            <span>✓ Patch matches the supplied source</span>
            <span>Tests have not been run here</span>
          </div>
          <div
            className="result-tabs"
            role="tablist"
            aria-label="Proposed changes"
          >
            <button
              role="tab"
              aria-selected={view === 'patch'}
              aria-controls="change-content"
              onClick={() => setView('patch')}
            >
              Source diff
            </button>
            <button
              role="tab"
              aria-selected={view === 'test'}
              aria-controls="change-content"
              onClick={() => setView('test')}
            >
              Regression test
            </button>
          </div>
          <div className="change-heading">
            <span>
              {view === 'patch' ? input.source.path : artifacts.regressionPath}
            </span>
            <button
              className="text-button"
              disabled={stale}
              onClick={() =>
                copy(
                  view === 'patch' ? artifacts.patch : artifacts.regressionTest,
                )
              }
            >
              Copy {view === 'patch' ? 'patch' : 'test'}
            </button>
          </div>
          <pre
            className="diff-view"
            id="change-content"
            tabIndex={0}
            aria-label={
              view === 'patch'
                ? 'Proposed unified patch'
                : 'Proposed regression test'
            }
          >
            <code>
              {view === 'patch'
                ? artifacts.patch.split('\n').map((line, index) => (
                    <span
                      key={index}
                      className={
                        line.startsWith('+') && !line.startsWith('+++')
                          ? 'diff-add'
                          : line.startsWith('-') && !line.startsWith('---')
                            ? 'diff-remove'
                            : line.startsWith('@@')
                              ? 'diff-position'
                              : ''
                      }
                    >
                      {line || ' '}
                      {'\n'}
                    </span>
                  ))
                : artifacts.regressionTest}
            </code>
          </pre>
          <div className="downloads">
            <button
              className="secondary-button"
              disabled={stale}
              onClick={() => download('failfix.patch', artifacts.patch)}
            >
              ↓ Download patch
            </button>
            <button
              className="text-button"
              disabled={stale}
              onClick={() =>
                download(
                  input.source.path.split('/').pop()!,
                  artifacts.fixedSource,
                )
              }
            >
              Fixed source
            </button>
            <button
              className="text-button"
              disabled={stale}
              onClick={() =>
                download(
                  artifacts.regressionPath.split('/').pop()!,
                  artifacts.regressionTest,
                )
              }
            >
              Regression test
            </button>
          </div>
          <div className="verify-note">
            <strong>Your next step: verify locally.</strong>
            <p>
              Review the diff and regression test, then apply the patch in your
              repository. Run your existing Vitest suite and the new test using
              your project’s normal test command. Don’t overwrite an existing
              file with the regression-test name.
            </p>
          </div>
        </>
      )}
      <div className="result-bottom">
        <button
          className="text-button"
          disabled={stale}
          onClick={() => copy(analysis.summary)}
        >
          Copy explanation
        </button>
        <span>
          {savedExample
            ? 'Illustrative example'
            : `Reference ${result.requestId.slice(0, 8)}`}
        </span>
      </div>
      <p role="status" className="copy-status">
        {copyStatus}
      </p>
    </div>
  );
}
