'use client';

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
const getReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ScrollExperience({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeMotion,
    getReducedMotion,
    () => true,
  );
  const enabled = !paused && !reduced;
  useEffect(() => {
    const element = root.current;
    if (!element || !enabled || !('IntersectionObserver' in window)) return;
    element.classList.add('motion-ready');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.12 },
    );
    element
      .querySelectorAll('[data-reveal]')
      .forEach((target) => observer.observe(target));
    const scenes = [
      ...element.querySelectorAll<HTMLElement>('[data-scroll-scene]'),
    ];
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const scene of scenes) {
          const rect = scene.getBoundingClientRect();
          const travel =
            scene.classList.contains('evidence-sequence') &&
            window.innerWidth > 580 &&
            window.innerHeight > 650
              ? rect.height - window.innerHeight
              : window.innerHeight * 0.65;
          const start =
            scene.classList.contains('evidence-sequence') &&
            window.innerWidth > 580 &&
            window.innerHeight > 650
              ? -rect.top
              : window.innerHeight * 0.85 - rect.top;
          scene.style.setProperty(
            '--scene-progress',
            String(Math.max(0, Math.min(1, start / Math.max(1, travel)))),
          );
        }
        const range =
          document.documentElement.scrollHeight - window.innerHeight;
        element.style.setProperty(
          '--page-progress',
          String(
            range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0,
          ),
        );
        element.style.setProperty(
          '--hero-turn',
          `${Math.min(window.scrollY / 45, 16)}deg`,
        );
        element.style.setProperty(
          '--hero-lift',
          `${Math.min(window.scrollY * 0.08, 65)}px`,
        );
        element.style.setProperty(
          '--hero-shift',
          `${Math.min(window.scrollY * 0.11, 90)}px`,
        );
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      element.classList.remove('motion-ready');
      element.style.removeProperty('--hero-shift');
      element.style.removeProperty('--hero-turn');
      element.style.removeProperty('--hero-lift');
      element.style.removeProperty('--page-progress');
      scenes.forEach((scene) => scene.style.removeProperty('--scene-progress'));
    };
  }, [enabled]);
  return (
    <div className={`story-site${enabled ? '' : ' motion-muted'}`} ref={root}>
      <div className="reading-progress" aria-hidden="true" />
      <svg
        className="page-light"
        viewBox="0 0 1000 2200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="light-bloom"
          d="M850 0C1100 250 70 190 170 490S1050 700 860 1000S40 1200 180 1500S1070 1750 740 2200"
        />
        <path
          className="light-core"
          pathLength="1"
          d="M850 0C1100 250 70 190 170 490S1050 700 860 1000S40 1200 180 1500S1070 1750 740 2200"
        />
      </svg>
      <div className="scroll-dial" aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="21" />
          <circle className="dial-fill" cx="24" cy="24" r="21" pathLength="1" />
        </svg>
        <span>ƒ↯</span>
      </div>
      {children}
      <button
        className="motion-toggle"
        aria-label="Pause animations"
        aria-pressed={paused || reduced}
        disabled={reduced}
        onClick={() => setPaused(!paused)}
      >
        <span aria-hidden="true">{enabled ? 'Ⅱ' : '▷'}</span>{' '}
        {reduced ? 'Reduced motion' : paused ? 'Motion paused' : 'Pause motion'}
      </button>
    </div>
  );
}

const chapters = [
  {
    label: 'Find the signal',
    title: 'The useful line is buried in the noise.',
    text: 'Bring the actual failing output. FailFix matches supported build-error signatures and points you to the relevant lines. A red status alone is never treated as the diagnosis.',
    number: '01',
  },
  {
    label: 'Add the context',
    title: 'Read the config that actually ran.',
    text: 'Import limited configuration and failed Actions steps from a public GitHub repository, pinned to a commit. Or paste your own package.json. Confirm the log belongs to the same run.',
    number: '02',
  },
  {
    label: 'Review the change',
    title: 'A small patch. An explicit next step.',
    text: 'For supported cases, inspect a proposed configuration patch. For other signatures, get a repair checklist. Download, review, and rebuild locally. The deployment stays in your hands.',
    number: '03',
  },
];

export function ScrollInvestigation() {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setActive(Number((entry.target as HTMLElement).dataset.chapter));
      },
      { rootMargin: '-22% 0px -42% 0px', threshold: 0 },
    );
    steps.current.forEach((step) => {
      if (step) observer.observe(step);
    });
    return () => observer.disconnect();
  }, []);
  function select(index: number) {
    setActive(index);
    steps.current[index]?.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  return (
    <div className="scroll-investigation">
      <div className="investigation-chapters">
        {chapters.map((chapter, index) => (
          <article
            key={chapter.number}
            data-chapter={index}
            data-reveal
            ref={(node) => {
              steps.current[index] = node;
            }}
          >
            <span className="chapter-index">
              {chapter.number} / {chapter.label.toUpperCase()}
            </span>
            <h3>{chapter.title}</h3>
            <p>{chapter.text}</p>
          </article>
        ))}
      </div>
      <div className="investigation-preview">
        <div className="preview-chrome">
          <span>
            <i />
            <i />
            <i />
          </span>
          <span>FAILFIX / INVESTIGATION TRACE</span>
          <b>ILLUSTRATIVE</b>
        </div>
        <nav className="chapter-switcher" aria-label="Investigation chapters">
          {chapters.map((chapter, index) => (
            <button
              key={chapter.number}
              onClick={() => select(index)}
              aria-current={active === index ? 'step' : undefined}
            >
              <span>{chapter.number}</span>
              {chapter.label}
            </button>
          ))}
        </nav>
        <div
          className="chapter-output"
          aria-live="polite"
          aria-label="Illustrative investigation preview"
        >
          <div className="trace-location">
            <span>
              {active === 0
                ? 'BUILD.LOG'
                : active === 1
                  ? 'PACKAGE.JSON'
                  : 'PROPOSED DIFF'}
            </span>
            <span>0{active + 1} / 03</span>
          </div>
          {active === 0 ? (
            <>
              <div className="terminal-line dim">$ npm run build</div>
              <div className="terminal-line dim">&gt; storefront@0.1.0</div>
              <div className="terminal-line failure-line">
                <span>02</span> npm error Missing script: &quot;build&quot;
              </div>
              <div className="terminal-line dim">
                Process exited with code 1.
              </div>
              <div className="trace-insight">
                <b>↳ SIGNAL FOUND</b>
                <p>The command asked for a script that isn’t declared.</p>
              </div>
            </>
          ) : active === 1 ? (
            <>
              <pre>
                <code>
                  {
                    '{\n  "scripts": {\n    "dev": "next dev"\n  },\n  "dependencies": {\n    "next": "^16.0.0"\n  }\n}'
                  }
                </code>
              </pre>
              <div className="trace-insight">
                <b>↳ CONTEXT CHECK</b>
                <p>This example declares Next.js, but no build script.</p>
              </div>
            </>
          ) : (
            <>
              <pre>
                <code>
                  <span className="diff-dim">
                    {'@@ package.json / scripts\n'}
                  </span>
                  <span>{'   "dev": "next dev",\n'}</span>
                  <span className="preview-diff-add">
                    {'+  "build": "next build"\n'}
                  </span>
                </code>
              </pre>
              <div className="trace-insight">
                <b>↳ PROPOSED, NOT EXECUTED</b>
                <p>
                  Review the working directory. Apply locally. Run the build.
                </p>
              </div>
            </>
          )}
        </div>
        <div className="preview-status">
          <span>
            ●{' '}
            {active === 2 ? 'READY FOR HUMAN REVIEW' : 'FOLLOWING THE EVIDENCE'}
          </span>
          <span>NO CODE EXECUTED</span>
        </div>
      </div>
    </div>
  );
}
