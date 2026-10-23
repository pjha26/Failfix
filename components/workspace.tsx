'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { IdeHeader, IdeStatus } from './ide-chrome';
import { examples } from '@/lib/examples';
import {
  byteLength,
  inputSchema,
  MAX_BODY_BYTES,
  type AnalysisInput,
  type AnalysisResponse,
} from '@/lib/contracts';
import { ResultPanel } from './result-panel';
import { ManualWorkflow } from './manual-workflow';

const emptyInput: AnalysisInput = {
  source: { path: 'src/example.ts', text: '' },
  test: { path: 'tests/example.test.ts', text: '' },
  log: '',
  expectedBehavior: '',
};
type InputTab = 'source' | 'test' | 'log';

export default function Workspace({
  initialExampleId,
  initialResult,
}: {
  initialExampleId?: string;
  initialResult?: AnalysisResponse;
}) {
  const initialExample = examples.find(
    (example) => example.id === initialExampleId,
  );
  const [input, setInput] = useState<AnalysisInput>(() =>
    structuredClone(initialExample?.input || emptyInput),
  );
  const [tab, setTab] = useState<InputTab>('source');
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [result, setResult] = useState<AnalysisResponse | null>(
    initialResult || null,
  );
  const [resultInput, setResultInput] = useState(
    initialExample ? JSON.stringify(initialExample.input) : '',
  );
  const [savedExample, setSavedExample] = useState<string | null>(
    initialExample?.title || null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const controller = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [highlight, setHighlight] = useState<{
    tab: InputTab;
    start: number;
    end: number;
  } | null>(null);
  const [proposalText, setProposalText] = useState('');
  const [reviewedProposal, setReviewedProposal] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const serialized = JSON.stringify(input);
  const stale =
    !!result &&
    (resultInput !== serialized ||
      (result.origin === 'manual' && proposalText !== reviewedProposal));

  function updateText(value: string) {
    setHighlight(null);
    setInput((current) =>
      tab === 'log'
        ? { ...current, log: value }
        : { ...current, [tab]: { ...current[tab], text: value } },
    );
  }
  function loadExample(index: number) {
    const example = examples[index];
    setInput(structuredClone(example.input));
    setTab('source');
    setHighlight(null);
    setResult(null);
    setError('');
    setNotice(
      `Loaded “${example.title}”. Analyze it live, or open the hand-authored walkthrough.`,
    );
    setSavedExample(null);
  }
  async function showWalkthrough() {
    const example = examples.find(
      (value) => JSON.stringify(value.input) === serialized,
    );
    if (!example) {
      setNotice('Choose an example card first to open its walkthrough.');
      return;
    }
    try {
      const response = await fetch(`/api/examples/${example.id}`);
      if (!response.ok) throw new Error('Example unavailable');
      const data = (await response.json()) as AnalysisResponse;
      setResult(data);
      setResultInput(serialized);
      setSavedExample(example.title);
      setError('');
      setNotice('');
    } catch {
      setError('Could not load the saved example. Please try again.');
    }
  }
  async function analyze() {
    setError('');
    setNotice('');
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .slice(0, 2)
          .map(
            (issue) => `${issue.path.join('.') || 'Input'}: ${issue.message}`,
          )
          .join(' '),
      );
      return;
    }
    if (byteLength(serialized) > MAX_BODY_BYTES) {
      setError('Input must be at most 64 KiB in total.');
      return;
    }
    const active = new AbortController();
    controller.current = active;
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
        signal: active.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(
          `${data.error || 'Analysis could not be completed.'}${data.requestId ? ` Reference: ${data.requestId}` : ''}`,
        );
        return;
      }
      setResult(data);
      setResultInput(serialized);
      setSavedExample(null);
    } catch {
      setError(
        active.signal.aborted
          ? 'Analysis cancelled. Your input is still here.'
          : 'Could not reach the analysis service. Your input is still here.',
      );
    } finally {
      setLoading(false);
      controller.current = null;
    }
  }
  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || tab === 'log') return;
    if (!file.name.endsWith('.ts') || file.size > 20 * 1024) {
      setError('Choose a .ts text file up to 20 KiB.');
      return;
    }
    const currentTab = tab;
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      if (text.includes('\0')) throw new Error('Binary input');
      setInput((current) => ({
        ...current,
        [currentTab]: {
          path: `${currentTab === 'source' ? 'src' : 'tests'}/${file.name}`,
          text,
        },
      }));
      setError('');
      setHighlight(null);
    } catch {
      setError('This file is not valid UTF-8 text.');
    }
  }
  function jumpToEvidence(kind: InputTab, start: number, end: number) {
    setTab(kind);
    setHighlight({ tab: kind, start, end });
    const value = kind === 'log' ? input.log : input[kind].text;
    const lines = value.split('\n');
    const offset = lines
      .slice(0, start - 1)
      .reduce((total, line) => total + line.length + 1, 0);
    const length = lines.slice(start - 1, end).join('\n').length;
    requestAnimationFrame(() => {
      const area = inputRef.current;
      if (area) {
        area.focus();
        area.setSelectionRange(offset, offset + length);
        area.scrollTop = Math.max(0, (start - 3) * 22);
        area.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
  const selectedText = tab === 'log' ? input.log : input[tab].text;
  const selectedExample = examples.some(
    (example) => JSON.stringify(example.input) === serialized,
  );

  return (
    <div
      className={`ide workspace-ide${explorerOpen ? '' : ' explorer-hidden'}`}
    >
      <IdeHeader workspace />
      <div className="ide-frame">
        <aside className="ide-rail" aria-label="Studio navigation">
          <button
            aria-label="Toggle case explorer"
            aria-expanded={explorerOpen}
            aria-controls="case-explorer"
            onClick={() => setExplorerOpen(!explorerOpen)}
          >
            ☷
          </button>
          <Link href="/" aria-label="Getting started">
            ⌂
          </Link>
          <a href="#manual-review" aria-label="Manual review workflow">
            ↳
          </a>
          <span>FF</span>
        </aside>
        <aside
          id="case-explorer"
          className="ide-explorer"
          hidden={!explorerOpen}
          aria-label="Case explorer"
        >
          <div className="explorer-heading">
            EXPLORER <span>···</span>
          </div>
          <div className="project-name">⌄ CURRENT SESSION</div>
          {(['source', 'test', 'log'] as const).map((kind) => (
            <button
              key={kind}
              className={`tree-file${tab === kind ? ' selected' : ''}`}
              onClick={() => {
                setTab(kind);
                setHighlight(null);
              }}
            >
              <span className={`file-icon ${kind === 'log' ? 'log' : 'ts'}`}>
                {kind === 'log' ? '≡' : 'TS'}
              </span>
              <span className="tree-filename">
                {kind === 'log'
                  ? 'failure.log'
                  : input[kind].path.split('/').pop()}
              </span>
              <span className="tree-state">
                {(kind === 'log' ? input.log : input[kind].text).trim()
                  ? '●'
                  : '○'}
              </span>
            </button>
          ))}
          <div className="explorer-heading cases-heading">
            SAMPLE CASES <span>3</span>
          </div>
          {examples.map((example, i) => (
            <button
              key={example.id}
              className="case-file"
              disabled={loading || reviewing}
              onClick={() => loadExample(i)}
            >
              <span>0{i + 1}</span>
              <div>
                {example.title}
                <small>
                  {
                    [
                      'Falsy defaults',
                      'Array boundaries',
                      'Unexpected mutation',
                    ][i]
                  }
                </small>
              </div>
              <b>↗</b>
            </button>
          ))}
          <div className="explorer-note">
            <span className="orange-dot" /> Scope of this session
            <p>
              One TypeScript source.
              <br />
              One Vitest test.
              <br />
              One failure to understand.
            </p>
          </div>
        </aside>
        <main className="studio-main">
          <div className="session-bar">
            <h1>Investigation desk</h1>
            <span>
              {stale
                ? 'INPUTS CHANGED'
                : result
                  ? 'REVIEW PENDING'
                  : 'AWAITING CONTEXT'}
            </span>
          </div>
          <section className="workbench" aria-label="Debugging workspace">
            <div className="input-panel" aria-label="Input editor">
              <div className="panel-heading">
                <div>
                  <span className="step-number">01</span>
                  <h2>The failure</h2>
                </div>
                <span className="subtle">EDITOR</span>
              </div>
              <div
                className="input-readiness"
                aria-label="Required input checklist"
              >
                <span className={input.source.text.trim() ? 'ready' : ''}>
                  {input.source.text.trim() ? '✓' : '○'} Source
                </span>
                <span className={input.test.text.trim() ? 'ready' : ''}>
                  {input.test.text.trim() ? '✓' : '○'} Test
                </span>
                <span className={input.log.trim() ? 'ready' : ''}>
                  {input.log.trim() ? '✓' : '○'} Failure output
                </span>
              </div>
              <div className="tabs" role="tablist" aria-label="Input files">
                {(['source', 'test', 'log'] as const).map((kind) => (
                  <button
                    role="tab"
                    aria-label={
                      kind === 'source'
                        ? 'Source code'
                        : kind === 'test'
                          ? 'Existing test'
                          : 'Failure output'
                    }
                    id={`tab-${kind}`}
                    aria-controls={`panel-${kind}`}
                    aria-selected={tab === kind}
                    tabIndex={tab === kind ? 0 : -1}
                    onKeyDown={(event) => {
                      const kinds: InputTab[] = ['source', 'test', 'log'];
                      const index = kinds.indexOf(kind);
                      let next: InputTab | undefined;
                      if (event.key === 'ArrowRight')
                        next = kinds[(index + 1) % kinds.length];
                      if (event.key === 'ArrowLeft')
                        next = kinds[(index + kinds.length - 1) % kinds.length];
                      if (event.key === 'Home') next = kinds[0];
                      if (event.key === 'End') next = kinds[kinds.length - 1];
                      if (next) {
                        event.preventDefault();
                        setTab(next);
                        setHighlight(null);
                        document.getElementById('tab-' + next)?.focus();
                      }
                    }}
                    key={kind}
                    onClick={() => {
                      setTab(kind);
                      setHighlight(null);
                    }}
                  >
                    <span
                      className={`file-icon ${kind === 'log' ? 'log' : 'ts'}`}
                    >
                      {kind === 'log' ? '≡' : 'TS'}
                    </span>
                    {kind === 'log'
                      ? 'failure.log'
                      : input[kind].path.split('/').pop()}
                    <span
                      className={
                        (kind === 'log' ? input.log : input[kind].text).trim()
                          ? 'filled-indicator'
                          : 'empty-indicator'
                      }
                    />
                  </button>
                ))}
              </div>
              <div
                className="editor-panel"
                role="tabpanel"
                id={`panel-${tab}`}
                aria-labelledby={`tab-${tab}`}
              >
                <div className="file-bar">
                  {tab !== 'log' ? (
                    <>
                      <label className="sr-only" htmlFor="file-path">
                        {tab === 'source' ? 'Source path' : 'Test path'}
                      </label>
                      <input
                        id="file-path"
                        className="path-input"
                        aria-label={
                          tab === 'source' ? 'Source path' : 'Test path'
                        }
                        value={input[tab].path}
                        onChange={(event) =>
                          setInput((current) => ({
                            ...current,
                            [tab]: {
                              ...current[tab],
                              path: event.target.value,
                            },
                          }))
                        }
                        spellCheck={false}
                      />
                      <label className="file-picker">
                        Open file
                        <input
                          type="file"
                          accept=".ts"
                          onChange={loadFile}
                          aria-label={`Open ${tab} file`}
                        />
                      </label>
                    </>
                  ) : (
                    <span>Vitest terminal output</span>
                  )}
                  <span className="file-type">
                    {tab === 'log' ? 'LOG' : 'TS'}
                  </span>
                </div>
                <div className="code-editor">
                  <div className="line-numbers" aria-hidden="true">
                    {selectedText.split('\n').map((_, index) => (
                      <span
                        key={index}
                        className={
                          highlight?.tab === tab &&
                          index + 1 >= highlight.start &&
                          index + 1 <= highlight.end
                            ? 'line-active'
                            : ''
                        }
                      >
                        {index + 1}
                      </span>
                    ))}
                  </div>
                  <textarea
                    ref={inputRef}
                    aria-label={
                      tab === 'source'
                        ? 'Source code'
                        : tab === 'test'
                          ? 'Existing test code'
                          : 'Failure output'
                    }
                    value={selectedText}
                    onChange={(event) => updateText(event.target.value)}
                    spellCheck={false}
                    wrap="off"
                    placeholder={
                      tab === 'source'
                        ? '// Paste the TypeScript function that is failing…'
                        : tab === 'test'
                          ? '// Paste the Vitest test that exposes the failure…'
                          : 'Paste the assertion error and relevant stack trace…'
                    }
                    onScroll={(event) => {
                      const gutter = event.currentTarget.previousElementSibling;
                      if (gutter)
                        gutter.scrollTop = event.currentTarget.scrollTop;
                    }}
                  />
                </div>
                <div className="editor-footer">
                  <span>{selectedText.split('\n').length} lines</span>
                  <span>
                    {byteLength(selectedText).toLocaleString()} /{' '}
                    {tab === 'log' ? '12,288' : '20,480'} bytes
                  </span>
                </div>
              </div>
              {tab !== 'log' && (
                <details className="failure-console" open>
                  <summary>
                    <span>
                      OUTPUT{' '}
                      <b>{input.log.trim() ? '1 FAILURE CONTEXT' : 'EMPTY'}</b>
                    </span>
                    <span>⌄</span>
                  </summary>
                  <pre aria-label="Failure console preview">
                    {input.log ||
                      'No failure output yet. Select failure.log to paste your test output.'}
                  </pre>
                  <button className="text-button" onClick={() => setTab('log')}>
                    Edit failure output ↗
                  </button>
                </details>
              )}
              <div className="behavior-field">
                <label htmlFor="expected">
                  What should happen? <span>Optional</span>
                </label>
                <textarea
                  id="expected"
                  value={input.expectedBehavior}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      expectedBehavior: event.target.value,
                    }))
                  }
                  placeholder="e.g. Zero should disable retries, not reset to the default."
                  rows={2}
                />
              </div>
              <div className="action-area">
                <button
                  className="primary-button"
                  onClick={analyze}
                  disabled={loading || reviewing}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      Analyze failure <span>→</span>
                    </>
                  )}
                </button>
                {loading ? (
                  <button
                    className="text-button"
                    onClick={() => controller.current?.abort()}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    className="text-button"
                    onClick={showWalkthrough}
                    disabled={!selectedExample || reviewing}
                  >
                    Open saved walkthrough
                  </button>
                )}
              </div>
              <div id="manual-review">
                <ManualWorkflow
                  input={input}
                  busy={loading || reviewing}
                  proposal={proposalText}
                  setProposal={setProposalText}
                  onError={setError}
                  setBusy={setReviewing}
                  onResult={(data, snapshot, proposal) => {
                    setResult(data);
                    setResultInput(snapshot);
                    setReviewedProposal(proposal);
                    setSavedExample(null);
                    setNotice('');
                  }}
                />
              </div>
              <p className="privacy-note">
                Automatic analysis sends inputs to BharatCode. Manual review
                makes no provider requests. Use nonconfidential code and remove
                credentials.{' '}
                <a
                  href="https://bharatcode.ai/privacy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Provider privacy ↗
                </a>
              </p>
            </div>
            <div
              className="output-panel"
              aria-label="Evidence and patch review"
            >
              <div className="panel-heading">
                <div>
                  <span className="step-number">02</span>
                  <h2>Review &amp; changes</h2>
                </div>
                <span className="subtle">READ BEFORE APPLYING</span>
              </div>
              {error && (
                <div
                  className="error-message"
                  role="alert"
                  aria-label="Analysis error"
                >
                  <strong>Analysis needs attention</strong>
                  <p>{error}</p>
                </div>
              )}
              {notice && (
                <div className="notice" role="status">
                  {notice}
                </div>
              )}
              {(loading || reviewing) && (
                <div className="loading-status" role="status">
                  <span className="spinner" />
                  {reviewing
                    ? 'Checking the supplied proposal against your code…'
                    : 'Reading the context and checking the proposed changes…'}
                </div>
              )}
              {result ? (
                <ResultPanel
                  result={result}
                  input={input}
                  stale={stale}
                  savedExample={savedExample}
                  onEvidence={jumpToEvidence}
                />
              ) : (
                <div className="empty-state">
                  <div className="empty-symbol" aria-hidden="true">
                    ⌁
                  </div>
                  <h3>Clarity starts with context.</h3>
                  <p>
                    Add your code, test, and failure output.
                    <br />
                    We’ll connect the evidence to a focused fix.
                  </p>
                  <div className="empty-checklist">
                    <span>
                      <b>01</b> Understand the root cause
                    </span>
                    <span>
                      <b>02</b> Inspect a minimal source diff
                    </span>
                    <span>
                      <b>03</b> Review a regression test
                    </span>
                  </div>
                  <span className="empty-caption">
                    No code runs on this server. You review every change.
                  </span>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      <IdeStatus
        message={
          loading || reviewing
            ? 'Review in progress'
            : stale
              ? 'Inputs changed · validate again'
              : 'No code executed'
        }
      />
    </div>
  );
}
