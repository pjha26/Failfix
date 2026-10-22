'use client';
import { useState } from 'react';
import Link from 'next/link';
import { examples } from '@/lib/examples';

export function LandingDemo() {
  const [selected, setSelected] = useState(0);
  const [fixed, setFixed] = useState(false);
  const example = examples[selected];
  const source = fixed ? example.fixedSource : example.input.source.text;
  return (
    <div
      className="lp-demo"
      aria-label="Interactive illustrative debugging example"
    >
      <div className="lp-demo-top">
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>CASE FILE / 00{selected + 1}</span>
        <span className="lp-demo-label">ILLUSTRATIVE</span>
      </div>
      <div className="lp-demo-select" role="group" aria-label="Preview bug">
        <span>EXAMINE</span>
        {['Zero values', 'Array bounds', 'Mutation'].map((label, index) => (
          <button
            key={label}
            aria-pressed={selected === index}
            onClick={() => {
              setSelected(index);
              setFixed(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="lp-demo-file">
        <span>{example.input.source.path}</span>
        <span>TS</span>
      </div>
      <pre
        className="lp-demo-code"
        aria-label={fixed ? 'Reviewed example source' : 'Buggy example source'}
      >
        <code>
          {source
            .trimEnd()
            .split('\n')
            .map((line, index) => (
              <span
                key={index}
                className={
                  index === 1 ? (fixed ? 'lp-code-fixed' : 'lp-code-bug') : ''
                }
              >
                <b aria-hidden="true">{index + 1}</b>
                {line}
                {'\n'}
              </span>
            ))}
        </code>
      </pre>
      <div className="lp-demo-failure">
        <span className="lp-fail-label">FAIL</span>
        <code>{example.input.log.split('\n')[1]}</code>
      </div>
      <div className="lp-demo-insight">
        <span className="lp-insight-mark" aria-hidden="true">
          ↳
        </span>
        <div>
          <strong>
            {fixed
              ? 'A smaller change. A clearer reason.'
              : 'The clue is already in the code.'}
          </strong>
          <p>
            {fixed
              ? example.analysis.evidence[0].explanation
              : example.description}
          </p>
        </div>
      </div>
      <div className="lp-demo-switch">
        <button
          onClick={() => setFixed((current) => !current)}
          aria-pressed={fixed}
        >
          {fixed ? 'Show original failure' : 'Reveal the reviewed fix'}{' '}
          <span aria-hidden="true">{fixed ? '↶' : '→'}</span>
        </button>
        <Link
          href={`/workspace?example=${example.id}`}
          aria-label={`Open ${example.title} walkthrough`}
        >
          Full walkthrough ↗
        </Link>
      </div>
      <p className="lp-demo-caption">
        Hand-authored example. No model call or test execution.
      </p>
    </div>
  );
}
