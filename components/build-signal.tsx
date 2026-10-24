export function BuildSignal() {
  return (
    <div className="build-signal" aria-hidden="true">
      <div className="signal-halo" />
      <svg viewBox="0 0 540 500" className="signal-map" fill="none">
        <defs>
          <linearGradient
            id="trace-gradient"
            x1="90"
            y1="110"
            x2="450"
            y2="390"
          >
            <stop stopColor="#ef9076" />
            <stop offset=".5" stopColor="#dee6d9" />
            <stop offset="1" stopColor="#c1f47d" />
          </linearGradient>
        </defs>
        <g className="signal-grid" stroke="#414637" strokeWidth=".5">
          <path d="M0 100H540M0 200H540M0 300H540M0 400H540M90 0V500M180 0V500M270 0V500M360 0V500M450 0V500" />
        </g>
        <g stroke="#5a634d" strokeWidth=".7">
          <ellipse
            cx="270"
            cy="250"
            rx="195"
            ry="145"
            transform="rotate(-30 270 250)"
          />
          <ellipse
            cx="270"
            cy="250"
            rx="195"
            ry="145"
            transform="rotate(30 270 250)"
          />
          <circle cx="270" cy="250" r="104" />
        </g>
        <path
          className="signal-path"
          d="M108 136L270 250L420 356M440 142L270 250L111 365"
          stroke="url(#trace-gradient)"
          strokeWidth="1.5"
          strokeDasharray="5 8"
        />
        <g className="orbit-ring" stroke="#b3da84" strokeOpacity=".5">
          <circle cx="270" cy="250" r="203" strokeDasharray="1 18" />
          <circle cx="473" cy="250" r="4" fill="#c1f47d" />
        </g>
        <g fill="#171b15" stroke="#535e48">
          <rect x="225" y="205" width="90" height="90" rx="18" />
          <rect
            x="236"
            y="216"
            width="68"
            height="68"
            rx="12"
            stroke="#a8c184"
          />
        </g>
        <text
          x="270"
          y="262"
          textAnchor="middle"
          fill="#d4f3b2"
          fontSize="31"
          fontFamily="monospace"
        >
          ƒ↯
        </text>
        <g fill="#ed9b7d">
          <circle cx="108" cy="136" r="5" />
          <circle cx="440" cy="142" r="5" />
        </g>
        <g fill="#c1f47d">
          <circle cx="420" cy="356" r="5" />
          <circle cx="111" cy="365" r="5" />
        </g>
      </svg>
      <div className="signal-chip chip-source">
        <span>TS</span> source context <b>↗</b>
      </div>
      <div className="signal-chip chip-log">
        <span>×</span> build.log <b>1 ERROR</b>
      </div>
      <div className="signal-chip chip-config">
        <span>{'{ }'}</span> package.json <b>READ</b>
      </div>
      <div className="signal-chip chip-patch">
        <span>±</span> proposed.patch <b>+1</b>
      </div>
      <div className="signal-caption">
        <span>FROM RED OUTPUT</span>
        <i /> <span>TO A REVIEWABLE NEXT STEP</span>
      </div>
    </div>
  );
}
