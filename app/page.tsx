import Link from 'next/link';
import { examples } from '@/lib/examples';
import {
  ScrollExperience,
  ScrollInvestigation,
} from '@/components/scroll-experience';
import { BuildSignal } from '@/components/build-signal';
import './story.css';

export default function Home() {
  return (
    <ScrollExperience>
      <a className="story-skip" href="#main-content">
        Skip to content
      </a>
      <header className="story-header">
        <Link href="/" className="story-brand" aria-label="FailFix home">
          <span>ƒ↯</span> FailFix<span className="brand-period">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#workflow">The workflow</a>
          <a href="#cases">Case files</a>
          <Link href="/workspace">Test desk</Link>
        </nav>
        <Link className="nav-launch" href="/deployments">
          Open build desk <span>↗</span>
        </Link>
      </header>
      <main id="main-content">
        <section className="story-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-label">
              <span /> A CLEARER WAY THROUGH BROKEN BUILDS
            </div>
            <h1 id="hero-title">
              Build <span className="hero-failed">failed.</span>
              <br />
              Keep <em>moving.</em>
            </h1>
            <p>
              The error is a starting point. Connect the log to the config,
              understand what broke, and review your next change.
            </p>
            <div className="hero-actions">
              <Link className="story-primary" href="/deployments">
                Investigate a build <span>↗</span>
              </Link>
              <a className="story-secondary" href="#workflow">
                Follow the trace <span>↓</span>
              </a>
            </div>
            <p className="hero-footnote">
              PUBLIC GITHUB IMPORT <b>·</b> NO MODEL KEY REQUIRED
            </p>
          </div>
          <BuildSignal />
          <div className="hero-bottom">
            <span>BUILT FOR THE MOMENT THE PIPELINE TURNS RED.</span>
            <span className="scroll-cue">
              SCROLL TO INVESTIGATE <i>↓</i>
            </span>
          </div>
        </section>
        <div className="scope-strip">
          <span>01 / PUBLIC REPOSITORY CONTEXT</span>
          <span>02 / EVIDENCE FROM YOUR LOGS</span>
          <span>03 / A CHANGE YOU CAN REVIEW</span>
        </div>
        <section className="workflow-section story-section" id="workflow">
          <div className="section-intro" data-reveal>
            <p className="story-kicker">
              THE INVESTIGATION / THREE DELIBERATE MOVES
            </p>
            <h2>
              Less guessing.
              <br />
              <span>More understanding.</span>
            </h2>
            <p>
              A small, visible path from a failed build to a decision you can
              defend.
            </p>
          </div>
          <ScrollInvestigation />
        </section>
        <section
          className="github-section story-section"
          id="github"
          aria-label="GitHub deployment workflow"
        >
          <div className="github-copy" data-reveal>
            <p className="story-kicker">YOUR REPOSITORY, IN CONTEXT</p>
            <h2>
              Bring the repo.
              <br />
              <span>Keep the control.</span>
            </h2>
            <p>
              Start with a public GitHub URL. Read supported root configuration,
              inspect failed Actions steps, and add the actual build error. No
              repository clone or account connection needed.
            </p>
            <Link className="story-primary" href="/deployments">
              Import a public repository <span>↗</span>
            </Link>
            <p className="github-boundary">
              Public, read-only import is available now. Private repositories
              and account connection come later.
            </p>
          </div>
          <div className="repo-illustration" data-reveal>
            <div className="repo-illustration-top">
              <span>⌘ / PUBLIC REPOSITORY</span>
              <span>READ ONLY</span>
            </div>
            <div className="repo-path">
              your-team / <strong>next-big-thing</strong>
            </div>
            <div className="repo-branch">
              <span>⑂ main</span>
              <span>configuration pinned to a commit</span>
            </div>
            <div className="repo-file">
              <span>{'{ }'}</span> package.json <b>CONFIG</b>
            </div>
            <div className="repo-file">
              <span>≡</span> .github/workflows/build.yml <b>WORKFLOW</b>
            </div>
            <div className="repo-file">
              <span>↳</span> failed Actions step <b>CONTEXT</b>
            </div>
            <div className="repo-bottom">
              <i /> Add the actual build log to investigate.
            </div>
            <p className="illustration-label">
              ILLUSTRATIVE REPOSITORY · NO ACCOUNT CONNECTED
            </p>
          </div>
        </section>
        <section
          className="coverage-section story-section"
          aria-label="Supported build investigations"
        >
          <div data-reveal>
            <p className="story-kicker">
              RECOGNIZE THE FAILURE. RESPECT THE BOUNDARY.
            </p>
            <h2>
              Common breaks.
              <br />
              <span>Concrete next steps.</span>
            </h2>
          </div>
          <div className="failure-index" data-reveal>
            {[
              [
                '01',
                'Missing build script',
                'A narrow package.json patch when Next.js context supports it.',
              ],
              [
                '02',
                'Lockfile or runtime mismatch',
                'Check the installer, committed lockfile, and Node version.',
              ],
              [
                '03',
                'Environment or module resolution',
                'Trace missing settings, dependencies, and path casing.',
              ],
              [
                '04',
                'Type errors or memory pressure',
                'Surface the signature and a verification checklist.',
              ],
            ].map(([number, title, text]) => (
              <div key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <span>↗</span>
              </div>
            ))}
          </div>
          <p className="coverage-note">
            Signature checks are transparent rules, not an AI diagnosis. Unknown
            failures ask for more context. No deployment or code is executed
            here.
          </p>
        </section>
        <section className="cases-section story-section" id="cases">
          <div className="cases-heading" data-reveal>
            <div>
              <p className="story-kicker">SMALL BUGS. FAMILIAR CONSEQUENCES.</p>
              <h2>
                Open a <span>case file.</span>
              </h2>
            </div>
            <Link href="/workspace">Open workspace ↗</Link>
          </div>
          <div className="story-case-list">
            {examples.map((example, index) => (
              <Link
                data-reveal
                key={example.id}
                href={`/workspace?example=${example.id}`}
              >
                <div>
                  <span>CASE / 00{index + 1}</span>
                  <span>TYPESCRIPT / VITEST</span>
                </div>
                <h3>{example.title}</h3>
                <p>{example.description}</p>
                <code>
                  {
                    [
                      'return value || 3;',
                      'return items[items.length];',
                      'return scores.sort(...);',
                    ][index]
                  }
                </code>
                <span className="case-link-label">
                  Follow the evidence <b>↗</b>
                </span>
              </Link>
            ))}
          </div>
          <p className="case-note">
            Hand-authored test walkthroughs. No model call or remote test
            execution.
          </p>
        </section>
        <section className="review-principle story-section" data-reveal>
          <span className="review-symbol" aria-hidden="true">
            [ ± ]
          </span>
          <p className="story-kicker">A PATCH IS A HYPOTHESIS.</p>
          <h2>
            Your test suite
            <br />
            gets the <em>final word.</em>
          </h2>
          <p>
            FailFix makes the proposed change visible. You decide what to apply,
            run the checks, and deploy on your terms.
          </p>
          <Link className="story-primary" href="/deployments">
            Find your next step <span>↗</span>
          </Link>
        </section>
        <section
          className="story-faq story-section"
          aria-label="Frequently asked questions"
        >
          <p className="story-kicker">BEFORE YOUR NEXT BUILD</p>
          <div>
            <details>
              <summary>Can I use this without an API key?</summary>
              <p>
                Yes. Explore the three saved walkthroughs, import public GitHub
                configuration, or investigate build logs with signature checks.
                For your own TypeScript test bugs, prepare a prompt for a chat
                tool you already use and paste its JSON proposal into the test
                workspace. Automatic test diagnosis needs configured Groq
                access.
              </p>
            </details>
            <details>
              <summary>
                Will FailFix fix and redeploy my repository automatically?
              </summary>
              <p>
                No. This release provides a review workflow: evidence, repair
                steps, and narrowly supported downloadable patches. It never
                changes GitHub files, executes your code, or triggers
                deployments.
              </p>
            </details>
            <details>
              <summary>Can I connect a private GitHub repository?</summary>
              <p>
                Account connection and private repository access are deferred.
                Public import works without credentials. Build logs can also be
                pasted manually; remove secrets and confidential content first.
              </p>
            </details>
            <details>
              <summary>What happens to my code and logs?</summary>
              <p>
                Inputs stay in browser memory and are sent to this app’s server
                when you request review. Build signature review makes no
                model-provider call and uses no application database. Automatic
                test analysis, when enabled, sends its inputs to Groq.
              </p>
            </details>
          </div>
        </section>
      </main>
      <footer className="story-footer">
        <Link href="/" className="story-brand">
          <span>ƒ↯</span> FailFix.
        </Link>
        <p>Small changes. Clear reasoning.</p>
        <a
          href="https://github.com/pjha26/Failfix"
          target="_blank"
          rel="noreferrer"
        >
          Source &amp; architecture ↗
        </a>
        <span>REVIEW BEFORE EXECUTION</span>
      </footer>
    </ScrollExperience>
  );
}
