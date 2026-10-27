'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { IdeHeader, IdeStatus } from './ide-chrome';
import { byteLength } from '@/lib/contracts';
import {
  deploymentInputSchema,
  type DeploymentInput,
  type DeploymentReport,
  type GithubSnapshot,
} from '@/lib/deployment-contracts';

const demo: DeploymentInput = {
  log: '> npm run build\nnpm error Missing script: "build"\nnpm error To see a list of scripts, run: npm run\nError: Process completed with exit code 1.',
  files: [
    {
      path: 'package.json',
      text:
        JSON.stringify(
          {
            name: 'example-storefront',
            private: true,
            scripts: { dev: 'next dev', start: 'next start' },
            dependencies: {
              next: '^16.0.0',
              react: '^19.0.0',
              'react-dom': '^19.0.0',
            },
          },
          null,
          2,
        ) + '\n',
    },
  ],
};

function download(filename: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DeploymentWorkspace() {
  const [repository, setRepository] = useState('');
  const [snapshot, setSnapshot] = useState<GithubSnapshot | null>(null);
  const [input, setInput] = useState<DeploymentInput>({
    log: '',
    files: [{ path: 'package.json', text: '' }],
  });
  const [fileIndex, setFileIndex] = useState(0);
  const [report, setReport] = useState<DeploymentReport | null>(null);
  const [reviewedInput, setReviewedInput] = useState('');
  const [busy, setBusy] = useState<'import' | 'review' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const logRef = useRef<HTMLTextAreaElement>(null);
  const currentInput = JSON.stringify(input);
  const stale = !!report && currentInput !== reviewedInput;
  const selectedFile = input.files[fileIndex];

  async function importRepository(runId?: number) {
    setBusy('import');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository, ...(runId ? { runId } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Import unavailable.');
        return;
      }
      const next = data.snapshot as GithubSnapshot;
      setSnapshot(next);
      setFileIndex(0);
      setIsDemo(false);
      setInput((old) => ({
        ...old,
        files: next.files.length
          ? next.files
          : [{ path: 'package.json', text: '' }],
      }));
      setReport(null);
      setNotice(
        'Configuration imported. Paste the actual build error before investigating. Existing log text was retained; confirm it belongs to this commit.',
      );
    } catch {
      setError(
        'Could not reach the import service. Your current inputs are still here.',
      );
    } finally {
      setBusy(null);
    }
  }
  async function investigate() {
    setError('');
    setNotice('');
    const parsed = deploymentInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .slice(0, 2)
          .map((issue) => issue.message)
          .join(' '),
      );
      return;
    }
    setBusy('review');
    try {
      const response = await fetch('/api/deployments/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: currentInput,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Review unavailable.');
        return;
      }
      setReport(data.report);
      setReviewedInput(currentInput);
    } catch {
      setError(
        'Could not reach the review service. Your inputs are still here.',
      );
    } finally {
      setBusy(null);
    }
  }
  async function loadLog(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(txt|log)$/i.test(file.name) || file.size > 32 * 1024) {
      setError('Choose a .txt or .log file up to 32 KiB.');
      return;
    }
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      if (text.includes('\0')) throw Error('Binary log');
      setInput((old) => ({ ...old, log: text }));
      setError('');
    } catch {
      setError('Choose a valid UTF-8 text log.');
    }
  }
  function selectEvidence(line: number) {
    const area = logRef.current;
    if (!area) return;
    const lines = area.value.split('\n');
    const prefix = lines.slice(0, line - 1).join('\n');
    const start = line === 1 ? 0 : prefix.length + 1;
    area.focus();
    area.setSelectionRange(start, start + (lines[line - 1]?.length || 0));
    area.scrollTop = Math.max(0, (line - 3) * 20);
    area.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function loadDemo() {
    setInput(structuredClone(demo));
    setSnapshot(null);
    setRepository('');
    setFileIndex(0);
    setReport(null);
    setIsDemo(true);
    setError('');
    setNotice(
      'Hand-authored build failure loaded. Select Investigate build to run the real signature checks.',
    );
  }

  return (
    <div className="ide deployment-ide">
      <IdeHeader context="deployment desk" />
      <main className="deployment-shell">
        <div className="deployment-intro">
          <div>
            <p className="deploy-kicker">FAILFIX / DEPLOYMENT INVESTIGATION</p>
            <h1>Find the break in your build.</h1>
            <p>
              Public repository context. Real build output. A change you can
              review.
            </p>
          </div>
          <Link href="/workspace">Open test-debugging desk ↗</Link>
        </div>
        <section className="repo-import" aria-label="Public repository import">
          <div>
            <h2>
              <span>01</span> Bring your repository
            </h2>
            <p>
              Read-only public GitHub import. No sign-in, clone, or API key.
            </p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void importRepository();
            }}
          >
            <label htmlFor="repository">GitHub repository</label>
            <div>
              <input
                id="repository"
                value={repository}
                onChange={(event) => setRepository(event.target.value)}
                placeholder="https://github.com/owner/repository"
                spellCheck={false}
                required
                maxLength={220}
                disabled={!!busy}
              />
              <button
                className="primary-button"
                disabled={!!busy || !repository.trim()}
              >
                {busy === 'import' ? 'Importing…' : 'Import public repo'}{' '}
                <span>↗</span>
              </button>
            </div>
          </form>
          <button className="text-button" disabled={!!busy} onClick={loadDemo}>
            Try a build-failure example →
          </button>
          <p className="repo-boundary">
            Or paste logs and package.json below. Private repository access and
            GitHub account connection are deferred.
          </p>
        </section>
        {error && (
          <div
            role="alert"
            aria-label="Build investigation error"
            className="error-message"
          >
            <strong>Investigation needs attention</strong>
            <p>{error}</p>
          </div>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {snapshot && (
          <section
            className="repo-snapshot"
            aria-label="Imported repository context"
          >
            <div>
              <a href={snapshot.url} target="_blank" rel="noreferrer">
                {snapshot.repository} ↗
              </a>
              <span>
                COMMIT {snapshot.sha.slice(0, 8)} · {snapshot.files.length}{' '}
                CONFIG FILES
              </span>
            </div>
            {snapshot.runs.length > 0 ? (
              <label>
                Failed workflow run
                <select
                  aria-label="Failed workflow run"
                  disabled={!!busy}
                  value={snapshot.selectedRunId || ''}
                  onChange={(event) =>
                    void importRepository(Number(event.target.value))
                  }
                >
                  {snapshot.runs.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.name} · {run.branch} · {run.sha.slice(0, 7)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p>
                No failed Actions runs were returned. Paste a build log from
                your host.
              </p>
            )}
            {snapshot.failedSteps.length > 0 && (
              <ul>
                {snapshot.failedSteps.map((step) => (
                  <li key={step}>Failed step: {step}</li>
                ))}
              </ul>
            )}
            <details>
              <summary>Import notes and boundaries</summary>
              <ul>
                {snapshot.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          </section>
        )}
        <div className="deployment-grid">
          <section className="deployment-context" aria-label="Build context">
            <div className="panel-heading">
              <h2>
                <span>02</span> Build context
              </h2>
              <span className="subtle">INPUTS STAY IN THIS SESSION</span>
            </div>
            <div className="build-log-heading">
              <label htmlFor="build-log">Failing build output</label>
              <label className="file-picker">
                Open log
                <input
                  type="file"
                  accept=".txt,.log"
                  onChange={loadLog}
                  aria-label="Open build log"
                  disabled={!!busy}
                />
              </label>
            </div>
            <textarea
              ref={logRef}
              id="build-log"
              className="build-log-editor"
              value={input.log}
              onChange={(event) =>
                setInput((old) => ({ ...old, log: event.target.value }))
              }
              placeholder={
                'Paste the actual error and nearby output from GitHub Actions, Vercel, Netlify, or your local build…'
              }
              spellCheck={false}
              wrap="off"
              disabled={!!busy}
            />
            <div className="deployment-editor-meta">
              <span>LOG / UTF-8</span>
              <span>
                {byteLength(input.log).toLocaleString()} / 32,768 bytes
              </span>
            </div>
            <div className="config-editor-heading">
              <label htmlFor="build-config">
                Configuration <span>Optional</span>
              </label>
              {input.files.length > 1 && (
                <select
                  aria-label="Configuration file"
                  value={fileIndex}
                  onChange={(event) => setFileIndex(Number(event.target.value))}
                >
                  {input.files.map((file, index) => (
                    <option key={file.path} value={index}>
                      {file.path}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="config-path">
              {selectedFile?.path || 'package.json'}{' '}
              {snapshot && (
                <span>· imported at {snapshot.sha.slice(0, 8)}</span>
              )}
            </p>
            <textarea
              id="build-config"
              className="build-config-editor"
              value={selectedFile?.text || ''}
              onChange={(event) =>
                setInput((old) => ({
                  ...old,
                  files: old.files.map((file, index) =>
                    index === fileIndex
                      ? { ...file, text: event.target.value }
                      : file,
                  ),
                }))
              }
              placeholder={
                'Paste package.json here to enable narrowly scoped config patch suggestions.'
              }
              spellCheck={false}
              wrap="off"
              disabled={!!busy}
            />
            <div className="deployment-editor-meta">
              <span>CONFIG / EDITABLE</span>
              <span>
                {byteLength(selectedFile?.text || '').toLocaleString()} / 16,384
                bytes
              </span>
            </div>
            <div className="build-actions">
              <button
                className="primary-button"
                onClick={investigate}
                disabled={!!busy}
              >
                {busy === 'review' ? 'Investigating…' : 'Investigate build'}{' '}
                <span>→</span>
              </button>
              <span>No model API required</span>
            </div>
            <p className="deployment-privacy">
              Logs and config are sent to this FailFix server for signature
              checks, without a model-provider call or application persistence.
              Remove secrets first. Import reads limited public configuration;
              it never clones or changes a repository.
            </p>
          </section>
          <section className="deployment-review" aria-label="Build review">
            <div className="panel-heading">
              <h2>
                <span>03</span> Evidence &amp; repair plan
              </h2>
              <span className="subtle">REVIEW BEFORE APPLYING</span>
            </div>
            {!report ? (
              <div className="deployment-empty">
                <span aria-hidden="true">[↯]</span>
                <h3>A failed build is a starting point.</h3>
                <p>
                  Bring the error, not just the red status. We’ll match
                  supported failure signatures and make the next steps explicit.
                </p>
                <ol>
                  <li>Inspect the error lines.</li>
                  <li>Review a repair plan and any supported patch.</li>
                  <li>Rebuild locally before deploying.</li>
                </ol>
                <p className="rule-scope">
                  Checks include missing scripts, lockfiles, Node versions,
                  environment settings, module resolution, TypeScript, and
                  memory pressure.
                </p>
              </div>
            ) : (
              <div className="deployment-report">
                <div className="deployment-provenance">
                  {isDemo ? 'HAND-AUTHORED INPUT' : 'YOUR BUILD CONTEXT'}{' '}
                  <span>RULE-BASED REVIEW · NOT AN AI DIAGNOSIS</span>
                </div>
                {stale && (
                  <div className="stale-banner" role="status">
                    Build context changed. Investigate again before using this
                    report. Exports and evidence links are disabled.
                  </div>
                )}
                <h3>
                  {report.status === 'findings'
                    ? `${report.findings.length} failure signature${report.findings.length === 1 ? '' : 's'} to inspect.`
                    : 'More context is needed.'}
                </h3>
                {report.status === 'needs_context' && (
                  <p>
                    No supported signature matched. Include the first meaningful
                    error, the failing command, and surrounding output. A
                    failed-step name or exit code alone is usually insufficient.
                  </p>
                )}
                {report.findings.map((finding) => (
                  <article className="build-finding" key={finding.id}>
                    <h4>{finding.title}</h4>
                    <p>{finding.explanation}</p>
                    <div className="build-evidence">
                      {finding.evidence.map((evidence) => (
                        <button
                          key={evidence.line}
                          disabled={stale}
                          onClick={() => selectEvidence(evidence.line)}
                        >
                          <b>LOG L{evidence.line} ↗</b>
                          <code>{evidence.text}</code>
                        </button>
                      ))}
                    </div>
                    <ol>
                      {finding.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </article>
                ))}
                {report.patch && (
                  <section
                    className="build-patch"
                    aria-label="Proposed configuration patch"
                  >
                    <div>
                      <h4>Reviewable config change</h4>
                      <span>{report.patch.path}</span>
                    </div>
                    <p>
                      Offered only because the supplied package declares
                      Next.js, has no build script, and declares no workspaces.
                      Confirm the host uses this package. Formatting may change;
                      no tests have run.
                    </p>
                    <pre tabIndex={0} aria-label="Proposed build patch">
                      <code>
                        {report.patch.diff.split('\n').map((line, index) => (
                          <span
                            key={index}
                            className={
                              line.startsWith('+') && !line.startsWith('+++')
                                ? 'diff-add'
                                : line.startsWith('-') &&
                                    !line.startsWith('---')
                                  ? 'diff-remove'
                                  : ''
                            }
                          >
                            {line || ' '}
                            {'\n'}
                          </span>
                        ))}
                      </code>
                    </pre>
                    <button
                      className="secondary-button"
                      disabled={stale}
                      onClick={() =>
                        download('failfix-build.patch', report.patch!.diff)
                      }
                    >
                      ↓ Download build patch
                    </button>
                  </section>
                )}
                <section className="build-verification">
                  <h4>Verification is your next step</h4>
                  <ul>
                    {report.verification.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </section>
                <button
                  className="text-button"
                  disabled={stale}
                  onClick={() =>
                    download(
                      'failfix-build-review.json',
                      JSON.stringify(
                        {
                          repository: snapshot?.repository || null,
                          commit: snapshot?.sha || null,
                          ...report,
                        },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  ↓ Download review report
                </button>
              </div>
            )}
          </section>
        </div>
        <footer className="deployment-footer">
          <span>PUBLIC IMPORT · HUMAN REVIEW · LOCAL VERIFICATION</span>
          <Link href="/">Back to FailFix →</Link>
        </footer>
      </main>
      <IdeStatus
        message={
          busy === 'import'
            ? 'Reading public GitHub context'
            : busy === 'review'
              ? 'Checking failure signatures'
              : 'Read-only · no deployment executed'
        }
      />
    </div>
  );
}
