import Link from 'next/link';
import { LandingDemo } from '@/components/landing-demo';
import { examples } from '@/lib/examples';
import './landing.css';

const steps = [
  {
    title: 'Bring the evidence.',
    text: 'One source file, its failing test, and the output that tells you something went wrong.',
    detail: 'SOURCE + TEST + FAILURE',
  },
  {
    title: 'Connect the dots.',
    text: 'Follow a diagnosis back to the relevant lines. See the assumptions before you consider the change.',
    detail: 'EXPLANATION + LINE REFERENCES',
  },
  {
    title: 'Review. Then verify.',
    text: 'Inspect a focused patch and a new regression test. Apply the changes and run your tests locally.',
    detail: 'DIFF + REGRESSION TEST',
  },
];
const faqs = [
  [
    'Can I try it without an API key?',
    'Yes. Explore the three saved walkthroughs, or use the no-key manual workflow with your own code: prepare a prompt, use a chat tool you already have, and paste its JSON response into FailFix for validation and downloads. Saved examples are hand-authored; manually supplied proposals are labeled. Automatic diagnosis requires configured BharatCode API access.',
  ],
  [
    'Will FailFix run or change my code?',
    'No code runs on the FailFix server, and your repository is never modified automatically. You download a proposed patch, review it, and run your own tests. An applicable patch is not proof of a correct fix.',
  ],
  [
    'What does the first release support?',
    'A single TypeScript .ts source file, a Vitest .test.ts or .spec.ts file, and the relevant failure output. Whole repositories, TSX, dependency repair, and other test frameworks are outside this release.',
  ],
  [
    'What happens to the code I provide?',
    'Inputs and results stay in browser memory while you use the page. FailFix does not save them in a database or browser storage. Requesting live analysis sends the inputs to BharatCode, whose privacy policy applies. Use nonconfidential code and remove secrets.',
  ],
  [
    'How much context can I add?',
    'Up to 20 KiB per code file, 12 KiB of failure output, and 2 KiB describing the intended behavior, within a 64 KiB total request. A small reproduction usually gives the clearest starting point.',
  ],
];

export default function Home() {
  return (
    <div className="landing">
      <a className="lp-skip" href="#main-content">
        Skip to content
      </a>
      <header className="lp-header">
        <Link href="/" className="brand" aria-label="FailFix home">
          <span className="brand-icon">ƒ</span>FailFix
          <span className="version">BETA</span>
        </Link>
        <nav aria-label="Main navigation" className="lp-nav">
          <a href="#workflow">How it works</a>
          <a href="#examples">Examples</a>
          <a href="#questions">FAQ</a>
        </nav>
        <Link href="/workspace" className="lp-header-cta">
          Open workspace <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <main id="main-content">
        <section className="lp-hero lp-width" aria-labelledby="hero-title">
          <div className="lp-hero-copy">
            <p className="lp-kicker">
              <span className="lp-signal" /> A DEBUGGING WORKSPACE FOR
              TYPESCRIPT
            </p>
            <h1 id="hero-title">
              A failing test
              <br />
              is a <em>clue.</em>
              <br />
              Follow it.
            </h1>
            <p className="lp-lede">
              Turn the red output into a clear explanation,
              <br className="lp-desktop-br" /> a focused patch, and a test that
              catches it next time.
            </p>
            <div className="lp-hero-actions">
              <Link href="/workspace" className="lp-button">
                Open the workspace <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/workspace?example=zero" className="lp-inline-link">
                Explore a saved example <span aria-hidden="true">→</span>
              </Link>
            </div>
            <p className="lp-small-note">
              No signup to explore. Every change is yours to review.
            </p>
          </div>
          <LandingDemo />
          <div className="lp-hero-bottom">
            <span>BUILT AROUND THE FAILURE. NOT AN EMPTY CHAT BOX.</span>
            <div>
              <span>TypeScript</span>
              <span>Vitest</span>
              <span>Reviewable patches</span>
            </div>
          </div>
        </section>
        <section
          id="workflow"
          className="lp-workflow lp-width"
          aria-labelledby="workflow-title"
        >
          <div className="lp-section-top">
            <p className="lp-kicker">01 / THE WORKFLOW</p>
            <span className="lp-section-aside">
              A short path from “why?” to “here’s why.”
            </span>
          </div>
          <h2 id="workflow-title">
            Less guessing.
            <br />
            <span>More understanding.</span>
          </h2>
          <div className="lp-steps">
            {steps.map((step, index) => (
              <article key={step.title}>
                <span className="lp-step-index">
                  0{index + 1}
                  <span aria-hidden="true">{index < 2 ? ' →' : ' ↗'}</span>
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <span className="lp-step-detail">{step.detail}</span>
              </article>
            ))}
          </div>
        </section>
        <section
          className="lp-boundaries lp-width"
          aria-labelledby="boundaries-title"
        >
          <div>
            <p className="lp-kicker">A PROPOSAL. WITH A PAPER TRAIL.</p>
            <h2 id="boundaries-title">
              Understand the change.
              <br />
              <span>Keep the control.</span>
            </h2>
            <p className="lp-section-copy">
              Useful debugging is more than a plausible answer. It’s knowing
              where the explanation comes from, what will change, and what still
              needs checking.
            </p>
            <ul className="lp-promises">
              <li>
                <span aria-hidden="true">↗</span>
                <div>
                  <strong>Trace the reasoning</strong>
                  <p>
                    Evidence points back to your source, test, or failure
                    output.
                  </p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">≠</span>
                <div>
                  <strong>Keep the original test</strong>
                  <p>
                    Source edits and a separate regression test. Existing tests
                    stay intact.
                  </p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>Verify on your terms</strong>
                  <p>
                    Download an applicable patch. Review and run it in your
                    environment.
                  </p>
                </div>
              </li>
            </ul>
          </div>
          <aside className="lp-review-card">
            <div className="lp-review-heading">
              <span className="lp-signal" /> THE REVIEW CHECKPOINT
            </div>
            <div className="lp-review-row">
              <span>01</span>
              <div>
                <strong>Evidence linked</strong>
                <p>Check the lines behind the explanation.</p>
              </div>
              <span aria-hidden="true">↗</span>
            </div>
            <div className="lp-review-row">
              <span>02</span>
              <div>
                <strong>Patch matched</strong>
                <p>Exact source matches. No ambiguous edits.</p>
              </div>
              <span aria-hidden="true">✓</span>
            </div>
            <div className="lp-review-row">
              <span>03</span>
              <div>
                <strong>Local tests</strong>
                <p>Your next step, after reviewing the change.</p>
              </div>
              <span className="lp-pending">TO DO</span>
            </div>
            <div className="lp-review-bottom">
              <span aria-hidden="true">!</span>
              <p>
                “Patch applies” and “bug is fixed” are different claims. FailFix
                keeps that distinction visible.
              </p>
            </div>
          </aside>
        </section>
        <section
          id="examples"
          className="lp-examples lp-width"
          aria-labelledby="examples-title"
        >
          <div className="lp-section-top">
            <p className="lp-kicker">02 / OPEN A CASE FILE</p>
            <span className="lp-section-aside">
              Saved walkthroughs · no API key needed
            </span>
          </div>
          <h2 id="examples-title">
            Small bugs.
            <br />
            <span>Familiar consequences.</span>
          </h2>
          <div className="lp-case-grid">
            {examples.map((example, index) => (
              <Link
                className="lp-case"
                href={`/workspace?example=${example.id}`}
                key={example.id}
              >
                <div className="lp-case-top">
                  <span>CASE / 00{index + 1}</span>
                  <span aria-hidden="true">↗</span>
                </div>
                <h3>{example.title}</h3>
                <p>{example.description}</p>
                <code>{example.analysis.edits[0].original}</code>
                <span className="lp-case-action">
                  Open walkthrough <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section
          id="questions"
          className="lp-faq lp-width"
          aria-labelledby="faq-title"
        >
          <div>
            <p className="lp-kicker">03 / BEFORE YOU START</p>
            <h2 id="faq-title">
              A few things
              <br />
              <span>worth knowing.</span>
            </h2>
            <a
              className="lp-inline-link"
              href="https://github.com/pjha26/Failfix"
              target="_blank"
              rel="noreferrer"
            >
              Read the source on GitHub ↗
            </a>
          </div>
          <div className="lp-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="lp-final lp-width" aria-labelledby="final-title">
          <div>
            <p className="lp-kicker">THE NEXT RED LINE IS A STARTING POINT.</p>
            <h2 id="final-title">
              Make the failure
              <br />
              <em>understandable.</em>
            </h2>
          </div>
          <div>
            <Link href="/workspace" className="lp-button">
              Start with the evidence <span aria-hidden="true">↗</span>
            </Link>
            <p>One source. One test. One focused fix.</p>
          </div>
        </section>
      </main>
      <footer className="lp-footer lp-width">
        <Link href="/" className="brand" aria-label="FailFix home">
          <span className="brand-icon">ƒ</span>FailFix
        </Link>
        <span>Small fixes. Clear reasoning.</span>
        <div>
          <Link href="/workspace">Workspace</Link>
          <a
            href="https://github.com/pjha26/Failfix"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
          <a href="#questions">Scope & privacy</a>
        </div>
      </footer>
    </div>
  );
}
