export function ScrollEvidence() {
  return (
    <section
      className="evidence-sequence"
      data-scroll-scene
      aria-labelledby="assembly-title"
    >
      <div className="evidence-sticky">
        <div className="assembly-heading">
          <p className="story-kicker">THE FAILURE IS ONLY THE FIRST FRAME</p>
          <h2 id="assembly-title">
            Bring the pieces.
            <br />
            <em>See the connection.</em>
          </h2>
          <p>One log. The right context. A change you can inspect.</p>
        </div>
        <div className="assembly-stage">
          <div className="assembly-orbit" aria-hidden="true">
            <span>ƒ↯</span>
          </div>
          <div className="assembly-rail" aria-hidden="true">
            <i />
          </div>
          <article className="assembly-card assembly-error">
            <header>
              <span>01 / THE SIGNAL</span>
              <b>×</b>
            </header>
            <h3>build.log</h3>
            <pre>
              <code>
                {
                  '$ npm run build\n\nMissing script: "build"\nProcess exited with code 1.'
                }
              </code>
            </pre>
            <footer>
              <span className="assembly-dot" /> Start with the actual output
            </footer>
          </article>
          <article className="assembly-card assembly-context">
            <header>
              <span>02 / THE CONTEXT</span>
              <b>{'{ }'}</b>
            </header>
            <h3>package.json</h3>
            <pre>
              <code>
                {
                  '"scripts": {\n  "dev": "next dev"\n},\n"dependencies": { "next": "…" }'
                }
              </code>
            </pre>
            <footer>
              <span className="assembly-dot" /> Check the declared configuration
            </footer>
          </article>
          <article className="assembly-card assembly-patch">
            <header>
              <span>03 / YOUR NEXT STEP</span>
              <b>±</b>
            </header>
            <h3>proposed.patch</h3>
            <pre>
              <code>
                {
                  '  "scripts": {\n    "dev": "next dev",\n+   "build": "next build"\n  }'
                }
              </code>
            </pre>
            <footer>
              <span className="assembly-dot" /> Review locally. Then rebuild.
            </footer>
          </article>
        </div>
        <div className="assembly-caption">
          <span>ILLUSTRATIVE SEQUENCE / NO CODE EXECUTED</span>
          <span aria-hidden="true">SCROLL TO CONNECT ↓</span>
        </div>
      </div>
    </section>
  );
}
