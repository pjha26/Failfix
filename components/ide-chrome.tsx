import Link from 'next/link';

export function IdeHeader({ workspace = false }: { workspace?: boolean }) {
  return (
    <header className="ide-titlebar">
      <Link href="/" className="ide-brand" aria-label="FailFix home">
        <span>
          f<span>↯</span>
        </span>{' '}
        FailFix
      </Link>
      <span className="ide-breadcrumb">
        review studio <span>/</span>{' '}
        {workspace ? 'untitled session' : 'getting started'}
      </span>
      <a
        href="https://github.com/pjha26/Failfix"
        target="_blank"
        rel="noreferrer"
      >
        Source on GitHub ↗
      </a>
    </header>
  );
}

export function IdeStatus({ message }: { message: string }) {
  return (
    <footer className="ide-status">
      <span>
        <i /> {message}
      </span>
      <span>
        TypeScript <b>·</b> Vitest <b>·</b> Review before execution
      </span>
    </footer>
  );
}
