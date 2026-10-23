import Link from 'next/link';
import { IdeHeader, IdeStatus } from '@/components/ide-chrome';
import { examples } from '@/lib/examples';
import './ide.css';

export default function Home() {
  return (
    <div className="ide welcome-ide">
      <a className="skip-link" href="#welcome-content">
        Skip to content
      </a>
      <IdeHeader />
      <div className="ide-frame">
        <aside className="ide-rail" aria-label="Studio navigation">
          <Link href="/" aria-label="Getting started" aria-current="page">
            ⌂
          </Link>
          <Link href="/workspace" aria-label="Debugging workspace">
            ⌘
          </Link>
          <a href="#guide" aria-label="Workflow guide">
            ?
          </a>
          <span>FF</span>
        </aside>
        <aside
          className="ide-explorer welcome-explorer"
          aria-label="Project explorer"
        >
          <div className="explorer-heading">
            EXPLORER <span>···</span>
          </div>
          <div className="project-name">⌄ FAILFIX STUDIO</div>
          <a className="tree-file selected" href="#welcome-content">
            <span className="file-icon">M↓</span> START_HERE.md
          </a>
          <Link className="tree-file" href="/workspace">
            <span className="file-icon ts">TS</span> new-session.ts{' '}
            <span>↗</span>
          </Link>
          <div className="explorer-heading cases-heading">
            SAMPLE CASES <span>3</span>
          </div>
          {examples.map((example, i) => (
            <Link
              key={example.id}
              className="case-file"
              href={`/workspace?example=${example.id}`}
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
            </Link>
          ))}
          <div className="explorer-note">
            <span className="orange-dot" /> A patch is a hypothesis.
            <p>The test suite gets the final word.</p>
          </div>
        </aside>
        <main className="welcome-main" id="welcome-content" tabIndex={-1}>
          <div className="ide-document-tab">
            <span className="file-icon">M↓</span> START_HERE.md{' '}
            <span className="tab-mark">●</span>
            <span className="tab-context">preview</span>
          </div>
          <div className="welcome-document">
            <div className="document-meta">
              <span>FAILFIX / FIELD NOTES</span>
              <span>001 — GETTING STARTED</span>
            </div>
            <div className="welcome-intro">
              <span className="document-kicker">
                FROM FAILURE TO UNDERSTANDING
              </span>
              <h1>
                Every failure
                <br />
                leaves a <em>trace.</em>
              </h1>
              <p>
                A debugging desk for the moment a test turns red.
                <br className="wide-only" /> Bring the evidence. Trace the
                cause. Review the change.
              </p>
              <Link className="launch-button" href="/workspace">
                Open workspace <span>↗</span>
              </Link>
              <span className="launch-caption">
                No account needed · Try a saved case first
              </span>
            </div>
            <div className="case-study">
              <div className="case-study-head">
                <span>
                  <i /> CASE 001 / THE FALSY DEFAULT
                </span>
                <span>TypeScript</span>
              </div>
              <div className="case-code">
                <span>01</span>
                <code>
                  <b>function</b> retryCount(value: number | undefined) {'{'}
                </code>
                <span>02</span>
                <code className="marked-code">
                  {' '}
                  return value <s>||</s> <strong>??</strong> 3;
                </code>
                <span>03</span>
                <code>{'}'}</code>
              </div>
              <div className="case-observation">
                <span>↳</span>
                <p>
                  <strong>Zero isn’t missing.</strong> The default swallowed a
                  valid value. A two-character change preserves it.
                </p>
                <Link href="/workspace?example=zero">
                  Follow the evidence ↗
                </Link>
              </div>
              <div className="case-disclaimer">
                Hand-authored example · Proposed change · Tests not run here
              </div>
            </div>
            <section
              className="welcome-guide"
              id="guide"
              aria-label="Workflow guide"
            >
              <div className="document-meta">
                <span>THE REVIEW LOOP</span>
                <span>THREE DELIBERATE STEPS</span>
              </div>
              <div className="guide-steps">
                <div>
                  <b>01 / COLLECT</b>
                  <h2>Keep the context small.</h2>
                  <p>
                    One .ts source, one Vitest test, and the failure output.
                    Enough to investigate, small enough to review.
                  </p>
                </div>
                <div>
                  <b>02 / TRACE</b>
                  <h2>Make the reasoning visible.</h2>
                  <p>
                    Follow evidence back to input lines. Inspect assumptions and
                    the proposed diff before downloading it.
                  </p>
                </div>
                <div>
                  <b>03 / VERIFY</b>
                  <h2>Let your tests decide.</h2>
                  <p>
                    Download the patch and regression test. Apply and run them
                    locally. FailFix never executes your code.
                  </p>
                </div>
              </div>
            </section>
            <details className="welcome-faq">
              <summary>Can I use this without an API key?</summary>
              <p>
                Yes. Explore the three saved walkthroughs, or prepare a prompt
                for a chat tool you already use and paste its JSON proposal into
                the workspace for validation. Automatic analysis needs
                configured BharatCode access.
              </p>
            </details>
            <div className="document-signoff">
              <span>BUILT TO INVESTIGATE, NOT TO GUESS.</span>
              <Link href="/workspace">Start your own investigation →</Link>
            </div>
          </div>
        </main>
      </div>
      <IdeStatus message="Ready to investigate" />
    </div>
  );
}
