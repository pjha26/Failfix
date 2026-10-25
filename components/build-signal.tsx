export function BuildSignal() {
  return (
    <div className="build-signal" aria-hidden="true">
      <div className="signal-halo" />
      <svg viewBox="0 0 540 500" className="signal-map" fill="none">
        <defs>
          <linearGradient id="trace-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#dcff9b" />
            <stop offset="1" stopColor="#71894d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M-20 450C80 450 65 50 270 50S400 450 570 370"
          stroke="url(#trace-gradient)"
          strokeWidth="2"
        />
        <path
          d="M-20 450C80 450 65 50 270 50S400 450 570 370"
          stroke="#b9fb73"
          strokeWidth="45"
          opacity=".09"
        />
      </svg>
      <div className="build-glass">
        <div className="glass-chrome">
          <span>● ● ●</span>
          <b>FAILFIX / INVESTIGATION</b>
          <span>01</span>
        </div>
        <div className="glass-body">
          <div className="glass-run">
            <span className="run-beacon" /> BUILD SIGNAL{' '}
            <span>ILLUSTRATIVE</span>
          </div>
          <h2>
            One failure.
            <br />
            <em>A clearer way forward.</em>
          </h2>
          <div className="glass-log">
            <span>01</span> $ npm run build
            <br />
            <span>02</span> <strong>Missing script: “build”</strong>
            <br />
            <span>03</span> Read the config. Find the cause.
          </div>
          <div className="glass-step">
            <span>01</span>
            <b>Read the evidence</b>
            <i>build.log ↗</i>
          </div>
          <div className="glass-step">
            <span>02</span>
            <b>Connect the context</b>
            <i>package.json ↗</i>
          </div>
          <div className="glass-step">
            <span>03</span>
            <b>Review a proposed change</b>
            <i>+ build script</i>
          </div>
          <div className="glass-footer">
            <span>PROPOSE → REVIEW → REBUILD</span>
            <b>ƒ↯</b>
          </div>
        </div>
      </div>
      <div className="floating-receipt">
        <span>± proposed.patch</span>
        <code>+ &quot;build&quot;: &quot;next build&quot;</code>
        <small>REVIEW BEFORE APPLYING</small>
      </div>
    </div>
  );
}
