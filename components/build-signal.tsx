export function BuildSignal() {
  return (
    <div className="build-signal" aria-hidden="true">
      <div className="signal-halo" />
      <svg viewBox="0 0 600 460" className="signal-map" fill="none">
        <g stroke="currentColor">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((line) => (
            <path key={line} transform={`translate(0 ${line * 7})`}
              d="M-90 350H25C130 350 130 0 245 0S365 370 465 370H690" />
          ))}
        </g>
      </svg>
      <div className="build-glass">
        <div className="glass-chrome">
          <span className="phosphor-indicator"><i /> Build trace</span>
          <span>EXAMPLE RUN</span>
        </div>
        <div className="glass-body crt-screen">
          <div className="trace-run-heading">
            <h2>Deployment pipeline</h2>
            <span>× Failed</span>
          </div>
          <div className="run-timeline">
            <div><span>Checkout</span><i /><b>✓</b></div>
            <div><span>Install</span><i /><b>✓</b></div>
            <div><span>Build</span><i /><b>×</b></div>
          </div>
          <div className="glass-log">
            <span>01</span>$ npm run build<br />
            <span>02</span><strong>Missing script: “build”</strong>
          </div>
        </div>
      </div>
      <div className="floating-receipt">
        <span>Proposed diff</span><small>package.json</small>
        <code>+ &quot;build&quot;: &quot;next build&quot;</code>
      </div>
    </div>
  );
}
